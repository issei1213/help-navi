/**
 * ストリーミングチャットAPIエンドポイント
 *
 * POST /api/chat
 * メッセージ配列を受け取り、Mastra Agentのストリーミング呼び出しを行う。
 * createUIMessageStreamResponseを使用してSSE形式のレスポンスを返却する。
 *
 * conversationId が指定された場合：
 * - ユーザーメッセージをDBに保存する
 * - ストリーミング完了時にAIメッセージをDBに保存する
 * - 最初のメッセージ送信時にLLMで会話タイトルを自動要約生成する（非同期、失敗時は先頭30文字にフォールバック）
 *
 * conversationId がない場合は既存の動作を維持し、後方互換性を確保する。
 */
import { NextResponse } from "next/server";
import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { mastra } from "@/mastra";
import { prisma } from "@/infrastructure/prisma-client";
import { generateTitle } from "./generate-title";

/**
 * ユーザーメッセージをDBに保存する
 *
 * 会話が存在し、最初のメッセージの場合はLLMによるタイトル自動生成を非同期で実行する。
 * DB書き込み失敗時はエラーログのみ出力し、呼び出し元には影響させない。
 */
async function saveUserMessage(
  conversationId: string,
  content: string
): Promise<void> {
  try {
    // メッセージを保存
    await prisma.message.create({
      data: {
        role: "user",
        content,
        conversationId,
      },
    });

    // 最初のメッセージかどうかを確認し、タイトル自動生成を判定
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { select: { id: true }, take: 2 } },
    });

    if (
      conversation &&
      conversation.title === "新しいチャット" &&
      conversation.messages.length <= 1
    ) {
      // タイトル生成は非同期で実行し、ストリーミング応答をブロックしない
      // awaitせずにPromiseを発行し、失敗時も独立したtry-catchで保護
      generateTitle(content)
        .then(async (autoTitle) => {
          try {
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { title: autoTitle },
            });
          } catch (updateError) {
            console.error("タイトル更新エラー:", updateError);
          }
        })
        .catch((error) => {
          console.error("タイトル生成エラー:", error);
        });
    }
  } catch (error) {
    console.error("ユーザーメッセージ保存エラー:", error);
  }
}

/**
 * AIメッセージをDBに保存する
 *
 * DB書き込み失敗時はエラーログのみ出力し、ストリーミング自体には影響させない。
 */
export async function saveAssistantMessage(
  conversationId: string,
  content: string
): Promise<void> {
  try {
    await prisma.message.create({
      data: {
        role: "assistant",
        content,
        conversationId,
      },
    });
  } catch (error) {
    console.error("AIメッセージ保存エラー:", error);
  }
}

/**
 * POSTリクエストハンドラ
 * チャットメッセージを受け取り、エージェントのストリーミングレスポンスを返す
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // リクエストバリデーション: messagesフィールドの存在チェック
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "messagesフィールドは必須です（配列形式）" },
        { status: 400 }
      );
    }

    // メッセージ配列が空でないことをチェック
    if (body.messages.length === 0) {
      return NextResponse.json(
        { error: "メッセージが空です" },
        { status: 400 }
      );
    }

    const conversationId: string | undefined = body.conversationId;

    // conversationId が指定されている場合、最後のユーザーメッセージをDBに保存
    if (conversationId) {
      const lastUserMessage = [...body.messages]
        .reverse()
        .find(
          (m: { role: string; content?: string; parts?: { type: string; text?: string }[] }) =>
            m.role === "user" && (m.content || m.parts?.some((p: { type: string; text?: string }) => p.type === "text" && p.text))
        );

      if (lastUserMessage) {
        // AI SDK v4のUIMessage形式ではpartsにテキストが格納される
        const messageContent =
          lastUserMessage.content ||
          lastUserMessage.parts
            ?.filter((p: { type: string; text?: string }) => p.type === "text" && p.text)
            .map((p: { type: string; text?: string }) => p.text)
            .join("") ||
          "";

        if (messageContent) {
          await saveUserMessage(conversationId, messageContent);
        }
      }
    }

    // handleChatStreamでMastraエージェントのストリーミングを処理
    const stream = await handleChatStream({
      mastra,
      agentId: "chat-agent",
      params: body,
    });

    // SSE形式でストリーミングレスポンスを返却
    // conversationId が指定されている場合、consumeSseStream でストリームのコピーを読み取り、
    // AI応答テキストを収集して完了時にDBに保存する
    return createUIMessageStreamResponse({
      stream,
      ...(conversationId
        ? {
            consumeSseStream: async ({
              stream: sseStream,
            }: {
              stream: ReadableStream<string>;
            }) => {
              try {
                let assistantText = "";
                const reader = sseStream.getReader();

                // SSEストリームを読み取り、text-deltaイベントからテキストを収集する
                // eslint-disable-next-line no-constant-condition
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  // SSEフォーマット: "data: {...}\n\n" からJSONを抽出
                  const lines = value.split("\n");
                  for (const line of lines) {
                    if (line.startsWith("data: ") && line !== "data: [DONE]") {
                      try {
                        const parsed = JSON.parse(line.slice(6));
                        if (
                          parsed.type === "text-delta" &&
                          typeof parsed.delta === "string"
                        ) {
                          assistantText += parsed.delta;
                        }
                      } catch {
                        // JSON解析失敗は無視（不完全なデータの可能性）
                      }
                    }
                  }
                }

                // テキストが収集された場合のみDBに保存
                if (assistantText) {
                  await saveAssistantMessage(conversationId, assistantText);
                }
              } catch (error) {
                console.error("SSEストリーム処理エラー:", error);
              }
            },
          }
        : {}),
    });
  } catch (error) {
    console.error("チャットAPIエラー:", error);
    return NextResponse.json(
      { error: "内部サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
