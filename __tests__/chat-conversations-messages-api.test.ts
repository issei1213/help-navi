/**
 * チャット画面リデザイン - 会話メッセージ取得APIテスト
 *
 * GET /api/conversations/[id]/messages のエンドポイントを検証する。
 * 実際のPostgreSQLデータベースに対してテストを実行する。
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET } from "@/app/api/conversations/[id]/messages/route";

let prisma: PrismaClient;
let testConversationId: string;

/** テスト用のNextリクエストパラメータを生成するヘルパー */
function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeAll(async () => {
  prisma = new PrismaClient();

  // テストデータ作成: 会話とメッセージ
  const conversation = await prisma.conversation.create({
    data: {
      title: "メッセージ取得テスト",
      messages: {
        create: [
          { role: "user", content: "最初のメッセージ" },
          { role: "assistant", content: "AIの応答です" },
          { role: "user", content: "2番目のメッセージ" },
          { role: "assistant", content: "2番目の応答です" },
        ],
      },
    },
  });
  testConversationId = conversation.id;
});

afterAll(async () => {
  // テストデータクリーンアップ
  await prisma.conversation.deleteMany({
    where: { title: "メッセージ取得テスト" },
  });
  await prisma.$disconnect();
});

describe("GET /api/conversations/[id]/messages", () => {
  it("会話に紐づくメッセージ一覧を取得できること", async () => {
    const request = new Request(
      `http://localhost:3000/api/conversations/${testConversationId}/messages`,
      { method: "GET" }
    );

    const response = await GET(request, createRouteContext(testConversationId));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toBe(4);
  });

  it("メッセージが作成日時の昇順で返却されること", async () => {
    const request = new Request(
      `http://localhost:3000/api/conversations/${testConversationId}/messages`,
      { method: "GET" }
    );

    const response = await GET(request, createRouteContext(testConversationId));
    const data = await response.json();

    // createdAt の昇順であることを確認
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].createdAt).getTime();
      const curr = new Date(data[i].createdAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("各メッセージに id, role, content, createdAt が含まれること", async () => {
    const request = new Request(
      `http://localhost:3000/api/conversations/${testConversationId}/messages`,
      { method: "GET" }
    );

    const response = await GET(request, createRouteContext(testConversationId));
    const data = await response.json();

    const firstMessage = data[0];
    expect(firstMessage.id).toBeDefined();
    expect(firstMessage.role).toBe("user");
    expect(firstMessage.content).toBe("最初のメッセージ");
    expect(firstMessage.createdAt).toBeDefined();
  });

  it("存在しない会話IDを指定すると404エラーを返すこと", async () => {
    const request = new Request(
      "http://localhost:3000/api/conversations/non-existent-id/messages",
      { method: "GET" }
    );

    const response = await GET(request, createRouteContext("non-existent-id"));

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("メッセージが空の会話では空配列を返すこと", async () => {
    // メッセージなしの会話を作成
    const emptyConversation = await prisma.conversation.create({
      data: { title: "空の会話" },
    });

    const request = new Request(
      `http://localhost:3000/api/conversations/${emptyConversation.id}/messages`,
      { method: "GET" }
    );

    const response = await GET(
      request,
      createRouteContext(emptyConversation.id)
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);

    // クリーンアップ
    await prisma.conversation.delete({
      where: { id: emptyConversation.id },
    });
  });
});
