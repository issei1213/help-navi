/**
 * チャット画面リデザイン - 会話一覧取得・新規作成APIテスト
 *
 * GET /api/conversations と POST /api/conversations のエンドポイントを検証する。
 * 実際のPostgreSQLデータベースに対してテストを実行する。
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET, POST } from "@/app/api/conversations/route";

let prisma: PrismaClient;
/** テスト中に作成した会話IDを追跡するためのリスト */
const createdConversationIds: string[] = [];

beforeAll(() => {
  prisma = new PrismaClient();
});

afterEach(async () => {
  // テストで作成した会話をクリーンアップ
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

describe("GET /api/conversations", () => {
  it("会話一覧を取得できること（レスポンスが配列であること）", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("会話一覧を updatedAt 降順で取得できること", async () => {
    // テストデータ作成
    const conv1 = await prisma.conversation.create({
      data: { title: "古い会話" },
    });
    createdConversationIds.push(conv1.id);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const conv2 = await prisma.conversation.create({
      data: { title: "新しい会話" },
    });
    createdConversationIds.push(conv2.id);

    const request = new Request("http://localhost:3000/api/conversations", {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.length).toBeGreaterThanOrEqual(2);
    // 最新のものが先に来る
    const idx1 = data.findIndex(
      (c: { id: string }) => c.id === conv1.id
    );
    const idx2 = data.findIndex(
      (c: { id: string }) => c.id === conv2.id
    );
    expect(idx2).toBeLessThan(idx1);
  });

  it("会話一覧の各項目に id, title, updatedAt が含まれること", async () => {
    const conv = await prisma.conversation.create({
      data: { title: "フィールドテスト" },
    });
    createdConversationIds.push(conv.id);

    const request = new Request("http://localhost:3000/api/conversations", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();
    const item = data.find((c: { id: string }) => c.id === conv.id);

    expect(item).toBeDefined();
    expect(item.id).toBe(conv.id);
    expect(item.title).toBe("フィールドテスト");
    expect(item.updatedAt).toBeDefined();
  });

  it("最大50件に制限されること", async () => {
    // 51件の会話を作成
    const promises = Array.from({ length: 51 }, (_, i) =>
      prisma.conversation.create({
        data: { title: `一覧制限テスト ${i}` },
      })
    );
    const conversations = await Promise.all(promises);
    conversations.forEach((c) => createdConversationIds.push(c.id));

    const request = new Request("http://localhost:3000/api/conversations", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(data.length).toBeLessThanOrEqual(50);
  });
});

describe("POST /api/conversations", () => {
  it("デフォルトタイトルで新しい会話を作成できること", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.title).toBe("新しいチャット");
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();

    createdConversationIds.push(data.id);
  });

  it("カスタムタイトルで新しい会話を作成できること", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "カスタムタイトル" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.title).toBe("カスタムタイトル");

    createdConversationIds.push(data.id);
  });

  it("空文字のタイトルで作成しようとすると400エラーを返すこと", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("スペースのみのタイトルで作成しようとすると400エラーを返すこと", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
