/**
 * チャット画面リデザイン - チャットAPI永続化拡張テスト
 *
 * POST /api/chat の conversationId 対応、メッセージDB保存を検証する。
 * Mastra/handleChatStream はモック化し、DB永続化ロジックに集中する。
 */
import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";

/** Mastra AI SDKのモック */
vi.mock("@mastra/ai-sdk", () => ({
  handleChatStream: vi.fn().mockResolvedValue(
    new ReadableStream({
      start(controller) {
        controller.close();
      },
    })
  ),
}));

/** AI SDKのモック */
vi.mock("ai", () => ({
  createUIMessageStreamResponse: vi.fn().mockReturnValue(
    new Response("mocked stream", { status: 200 })
  ),
}));

/** Mastraインスタンスのモック */
vi.mock("@/mastra", () => ({
  mastra: {},
}));

let prisma: PrismaClient;
const createdConversationIds: string[] = [];

beforeAll(() => {
  prisma = new PrismaClient();
});

afterEach(async () => {
  for (const id of createdConversationIds) {
    try {
      await prisma.conversation.delete({ where: { id } });
    } catch {
      // 既に削除されている場合は無視
    }
  }
  createdConversationIds.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/chat - メッセージ永続化拡張", () => {
  it("conversationId 付きリクエストでユーザーメッセージがDBに保存されること", async () => {
    // テスト用会話を作成
    const conversation = await prisma.conversation.create({
      data: { title: "永続化テスト" },
    });
    createdConversationIds.push(conversation.id);

    // 動的インポートでモック適用後のルートを読み込む
    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "こんにちは、テストです",
          },
        ],
        conversationId: conversation.id,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // DBにユーザーメッセージが保存されていることを確認
    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
    });
    expect(messages.length).toBeGreaterThanOrEqual(1);
    const userMessage = messages.find((m) => m.role === "user");
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toBe("こんにちは、テストです");
  });

  it("conversationId なしの場合はDB保存されず既存動作を維持すること", async () => {
    const { POST } = await import("@/app/api/chat/route");

    // DB上の全メッセージ数を記録
    const beforeCount = await prisma.message.count();

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            id: "msg-2",
            role: "user",
            content: "永続化しないメッセージ",
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // メッセージ数が増えていないことを確認（後方互換性）
    const afterCount = await prisma.message.count();
    expect(afterCount).toBe(beforeCount);
  });

  it("最初のメッセージ送信時に会話タイトルがユーザーメッセージの先頭30文字で自動更新されること", async () => {
    const conversation = await prisma.conversation.create({
      data: { title: "新しいチャット" },
    });
    createdConversationIds.push(conversation.id);

    const { POST } = await import("@/app/api/chat/route");

    const longMessage = "これは30文字を超える長いメッセージのテストです。タイトルは先頭30文字に切り詰められるはずです。";

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            id: "msg-3",
            role: "user",
            content: longMessage,
          },
        ],
        conversationId: conversation.id,
      }),
    });

    await POST(request);

    // タイトルが更新されていることを確認
    const updated = await prisma.conversation.findUnique({
      where: { id: conversation.id },
    });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe(longMessage.substring(0, 30));
    expect(updated!.title.length).toBeLessThanOrEqual(30);
  });

  it("既にタイトルが設定済みの会話ではタイトルが自動更新されないこと", async () => {
    const conversation = await prisma.conversation.create({
      data: { title: "カスタムタイトル" },
    });
    createdConversationIds.push(conversation.id);

    // メッセージを事前に追加（最初のメッセージではないことを示す）
    await prisma.message.create({
      data: {
        role: "user",
        content: "事前メッセージ",
        conversationId: conversation.id,
      },
    });

    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            id: "msg-4",
            role: "user",
            content: "新しいメッセージ",
          },
        ],
        conversationId: conversation.id,
      }),
    });

    await POST(request);

    // タイトルが変更されていないことを確認
    const updated = await prisma.conversation.findUnique({
      where: { id: conversation.id },
    });
    expect(updated!.title).toBe("カスタムタイトル");
  });

  it("存在しない conversationId の場合でもストリーミングは動作すること", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            id: "msg-5",
            role: "user",
            content: "テスト",
          },
        ],
        conversationId: "non-existent-id",
      }),
    });

    // DB書き込み失敗してもストリーミング自体は動作する
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
