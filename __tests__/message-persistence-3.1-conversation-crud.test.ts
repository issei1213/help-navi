/**
 * メッセージ永続化 タスク3.1: 会話セッションCRUDの要件適合検証
 *
 * 既存実装の要件充足を検証するテスト。
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 *
 * 本テストは実際のPostgreSQLデータベースに対して実行する。
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET, POST } from "@/app/api/conversations/route";
import { PATCH, DELETE } from "@/app/api/conversations/[id]/route";

let prisma: PrismaClient;
const createdConversationIds: string[] = [];

/** テスト用のNextリクエストパラメータを生成するヘルパー */
function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

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

describe("Req 1.1: 新しい会話セッション作成", () => {
  it("デフォルトタイトル「新しいチャット」で新しい会話セッションが作成される", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.title).toBe("新しいチャット");
    createdConversationIds.push(data.id);
  });

  it("一意のIDが返却される", async () => {
    const req1 = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res1 = await POST(req1);
    const data1 = await res1.json();
    createdConversationIds.push(data1.id);

    const req2 = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res2 = await POST(req2);
    const data2 = await res2.json();
    createdConversationIds.push(data2.id);

    expect(data1.id).toBeDefined();
    expect(data2.id).toBeDefined();
    expect(data1.id).not.toBe(data2.id);
  });

  it("作成時にid, title, createdAt, updatedAtが含まれる", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();
    createdConversationIds.push(data.id);

    expect(data.id).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();
  });
});

describe("Req 1.2: 会話一覧取得（降順50件）", () => {
  it("更新日時の降順で会話一覧を取得できる", async () => {
    const conv1 = await prisma.conversation.create({
      data: { title: "3.1テスト_古い会話" },
    });
    createdConversationIds.push(conv1.id);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const conv2 = await prisma.conversation.create({
      data: { title: "3.1テスト_新しい会話" },
    });
    createdConversationIds.push(conv2.id);

    const response = await GET(
      new Request("http://localhost:3000/api/conversations")
    );
    expect(response.status).toBe(200);

    const data = await response.json();
    const idx1 = data.findIndex(
      (c: { id: string }) => c.id === conv1.id
    );
    const idx2 = data.findIndex(
      (c: { id: string }) => c.id === conv2.id
    );
    // 新しい方が先に来る
    expect(idx2).toBeLessThan(idx1);
  });

  it("各項目にID・タイトル・更新日時が含まれる", async () => {
    const conv = await prisma.conversation.create({
      data: { title: "3.1テスト_フィールド確認" },
    });
    createdConversationIds.push(conv.id);

    const response = await GET(
      new Request("http://localhost:3000/api/conversations")
    );
    const data = await response.json();
    const item = data.find((c: { id: string }) => c.id === conv.id);

    expect(item).toBeDefined();
    expect(item.id).toBe(conv.id);
    expect(item.title).toBe("3.1テスト_フィールド確認");
    expect(item.updatedAt).toBeDefined();
  });

  it("最新50件に制限される", async () => {
    const promises = Array.from({ length: 51 }, (_, i) =>
      prisma.conversation.create({
        data: { title: `3.1テスト_制限 ${i}` },
      })
    );
    const conversations = await Promise.all(promises);
    conversations.forEach((c) => createdConversationIds.push(c.id));

    const response = await GET(
      new Request("http://localhost:3000/api/conversations")
    );
    const data = await response.json();

    expect(data.length).toBeLessThanOrEqual(50);
  });
});

describe("Req 1.3: 会話タイトル編集", () => {
  it("タイトルをトリム済みの値に更新できる", async () => {
    const conv = await prisma.conversation.create({
      data: { title: "3.1テスト_元のタイトル" },
    });
    createdConversationIds.push(conv.id);

    const request = new Request(
      `http://localhost:3000/api/conversations/${conv.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "  更新後タイトル  " }),
      }
    );

    const response = await PATCH(request, createRouteContext(conv.id));
    expect(response.status).toBe(200);

    const data = await response.json();
    // トリムされた値が設定されること
    expect(data.title).toBe("更新後タイトル");
  });
});

describe("Req 1.4: 空タイトルバリデーション", () => {
  it("空文字のタイトルで400エラーを返す", async () => {
    const conv = await prisma.conversation.create({
      data: { title: "3.1テスト_バリデーション" },
    });
    createdConversationIds.push(conv.id);

    const request = new Request(
      `http://localhost:3000/api/conversations/${conv.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      }
    );

    const response = await PATCH(request, createRouteContext(conv.id));
    expect(response.status).toBe(400);
  });

  it("スペースのみのタイトルで400エラーを返す", async () => {
    const conv = await prisma.conversation.create({
      data: { title: "3.1テスト_スペースバリデーション" },
    });
    createdConversationIds.push(conv.id);

    const request = new Request(
      `http://localhost:3000/api/conversations/${conv.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "   " }),
      }
    );

    const response = await PATCH(request, createRouteContext(conv.id));
    expect(response.status).toBe(400);
  });
});

describe("Req 1.5: 会話・メッセージのカスケード削除", () => {
  it("会話削除時にメッセージがカスケード削除される", async () => {
    const conv = await prisma.conversation.create({
      data: {
        title: "3.1テスト_カスケード",
        messages: {
          create: [
            { role: "user", content: "テストメッセージ" },
            { role: "assistant", content: "テスト応答" },
          ],
        },
      },
    });
    createdConversationIds.push(conv.id);

    // メッセージが存在することを確認
    const beforeMessages = await prisma.message.findMany({
      where: { conversationId: conv.id },
    });
    expect(beforeMessages.length).toBe(2);

    // 会話を削除
    const request = new Request(
      `http://localhost:3000/api/conversations/${conv.id}`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, createRouteContext(conv.id));
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);

    // メッセージもカスケード削除されていることを確認
    const afterMessages = await prisma.message.findMany({
      where: { conversationId: conv.id },
    });
    expect(afterMessages.length).toBe(0);

    // 追跡リストから除去
    const idx = createdConversationIds.indexOf(conv.id);
    if (idx >= 0) createdConversationIds.splice(idx, 1);
  });
});

describe("Req 1.6: 存在しない会話IDへの404エラー", () => {
  it("PATCH: 存在しない会話IDに対して404エラーを返す", async () => {
    const request = new Request(
      "http://localhost:3000/api/conversations/non-existent-id",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "テスト" }),
      }
    );

    const response = await PATCH(
      request,
      createRouteContext("non-existent-id")
    );
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("DELETE: 存在しない会話IDに対して404エラーを返す", async () => {
    const request = new Request(
      "http://localhost:3000/api/conversations/non-existent-id",
      { method: "DELETE" }
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
