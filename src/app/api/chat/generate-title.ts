/**
 * LLMを使用して会話タイトルを生成するモジュール
 *
 * Mastraエージェント（chat-agent）を通じてClaude APIを呼び出し、
 * ユーザーメッセージの内容を30文字以内のタイトルに要約する。
 * 失敗時はユーザーメッセージの先頭30文字にフォールバック。
 */
import { mastra } from "@/mastra";

/** タイトル自動生成時の最大文字数 */
export const TITLE_MAX_LENGTH = 30;

/**
 * LLMを使用して会話タイトルを生成する
 *
 * @param userMessage - ユーザーが送信したメッセージ内容
 * @returns 30文字以内の会話タイトル
 *
 * 処理フロー:
 * 1. Mastraエージェント（chat-agent）の `generate()` で非ストリーミング呼び出しを行う
 * 2. レスポンスをトリムし、30文字に切り詰める
 * 3. 空レスポンスまたはエラー時はユーザーメッセージの先頭30文字をフォールバックとして使用する
 */
export async function generateTitle(userMessage: string): Promise<string> {
  try {
    const agent = mastra.getAgent("chat-agent");
    const response = await agent.generate([
      {
        role: "user",
        content: `以下のメッセージ内容を30文字以内の簡潔な会話タイトルに要約してください。タイトルのみを出力し、それ以外の説明は不要です。\n\nメッセージ: ${userMessage}`,
      },
    ]);

    const title = response.text.trim().substring(0, TITLE_MAX_LENGTH);
    // 空文字・スペースのみの場合はフォールバック
    return title || userMessage.substring(0, TITLE_MAX_LENGTH);
  } catch (error) {
    console.error("LLMタイトル生成エラー:", error);
    return userMessage.substring(0, TITLE_MAX_LENGTH);
  }
}
