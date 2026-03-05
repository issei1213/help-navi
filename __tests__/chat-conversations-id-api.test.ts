/**
 * チャット画面リデザイン - 会話個別操作APIテスト
 *
 * PATCH /api/conversations/[id] と DELETE /api/conversations/[id] のエンドポイントを検証する。
 * 実際のPostgreSQLデータベースに対してテストを実行する。
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PATCH, DELETE } from "@/app/api/conversations/[id]/route";

let prisma: PrismaClient;
let testConversationId: string;

beforeAll(() => {
  prisma = new PrismaClient();
});

beforeEach(async () => {
  // 各テスト前に新しい会話を作成
  const conversation = await prisma.conversation.create({
    data: { title: "テスト会話" },
  });
  testConversationId = conversation.id;
});

afterAll(async () => {
  // テストデータのクリーンアップ
  await prisma.conversation.deleteMany({
    where: { title: { startsWith: "テスト" } },
  });
  await prisma.conversation.deleteMany({
    where: { title: { startsWith: "更新後" } },
  });
  await prisma.$disconnect();
});

/** テスト用のNextリクエストパラメータを生成するヘルパー */
function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/conversations/[id]", () => {
  it("会話タイトルを更新できること", async () => {
    const request = new Request(
      `http://localhost:3000/api/conversations/${testConversationId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "更新後タイトル" }),
      }
    );

    const response = await PATCH(request, createRouteContext(testConversationId));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe(testConversationId);
    expect(data.title).toBe("更新後タイトル");
  });

  it("空文字のタイトルで更新しようとすると400エラーを返すこと", async () => {
    const request = new Request(
      `http://localhost:3000/api/conversations/${testConversationId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      }
    );

    const response = await PATCH(request, createRouteContext(testConversationId));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("スペースのみのタイトルで更新しようとすると400エラーを返すこと", async () => {
    const request = new Request(
      `http://localhost:3000/api/conversations/${testConversationId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "   " }),
      }
    );

    const response = await PATCH(request, createRouteContext(testConversationId));

    expect(response.status).toBe(400);
  });

  it("タイトルが未指定の場合に400エラーを返すこと", async () => {
    const request = new Request(
      `http://localhost:3000/api/conversations/${testConversationId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );

    const response = await PATCH(request, createRouteContext(testConversationId));

    expect(response.status).toBe(400);
  });

  it("存在しない会話IDを指定すると404エラーを返すこと", async () => {
    const request = new Request(
      "http://localhost:3000/api/conversations/non-existent-id",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "更新後タイトル" }),
      }
    );

    const response = await PATCH(request, createRouteContext("non-existent-id"));

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

describe("DELETE /api/conversations/[id]", () => {
  it("会話を削除できること", async () => {
    const request = new Request(
      `http://localhost:3000/api/conversations/${testConversationId}`,
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, createRouteContext(testConversationId));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // DBから削除されていることを確認
    const deleted = await prisma.conversation.findUnique({
      where: { id: testConversationId },
    });
    expect(deleted).toBeNull();
  });

  it("会話削除時にメッセージもカスケード削除されること", async () => {
    // メッセージ付きの会話を作成
    await prisma.message.createMany({
      data: [
        {
          role: "user",
          content: "テストメッセージ",
          conversationId: testConversationId,
        },
        {
          role: "assistant",
          content: "テスト応答",
          conversationId: testConversationId,
        },
      ],
    });

    const request = new Request(
      `http://localhost:3000/api/conversations/${testConversationId}`,
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, createRouteContext(testConversationId));

    expect(response.status).toBe(200);

    // メッセージも削除されていることを確認
    const messages = await prisma.message.findMany({
      where: { conversationId: testConversationId },
    });
    expect(messages.length).toBe(0);
  });

  it("存在しない会話IDを指定すると404エラーを返すこと", async () => {
    const request = new Request(
      "http://localhost:3000/api/conversations/non-existent-id",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(
      request,
      createRouteContext("non-existent-id")
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
