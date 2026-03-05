/**
 * メッセージ永続化 - タスク5.1: 会話APIエンドポイントの結合テスト
 *
 * POST /api/conversations による新規会話作成、
 * GET /api/conversations による会話一覧取得（降順50件制限）、
 * PATCH /api/conversations/[id] によるタイトル更新（正常系・空タイトル拒否・404エラー）、
 * DELETE /api/conversations/[id] によるカスケード削除（正常系・404エラー）をテストする。
 *
 * Prismaクライアント（実DB）を使用した結合テスト。
 * DATABASE_URLが設定されている環境でのみ実行される。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.1, 6.2, 6.4
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET, POST } from "@/app/api/conversations/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/conversations/[id]/route";

/** DATABASE_URLが設定されているかどうか */
const hasDatabase = !!process.env.DATABASE_URL;

/** 実DB結合テストの条件付き実行 */
const describeWithDb = hasDatabase ? describe : describe.skip;

let prisma: PrismaClient;
/** テスト中に作成した会話IDを追跡する */
const createdConversationIds: string[] = [];

/** テスト用のルートコンテキストを生成するヘルパー */
function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeAll(() => {
  if (hasDatabase) {
    prisma = new PrismaClient();
  }
});

afterEach(async () => {
  if (!hasDatabase) return;
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
  if (hasDatabase && prisma) {
    await prisma.$disconnect();
  }
});

describeWithDb("POST /api/conversations - 新規会話作成", () => {
  it("Req 1.1: デフォルトタイトル「新しいチャット」で新しい会話を作成し、一意のIDを返却する", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    // 201ステータスで返却 (Req 6.4)
    expect(response.status).toBe(201);

    const data = await response.json();
    // 一意のID（CUID形式）が返却される
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe("string");
    expect(data.id.length).toBeGreaterThan(0);

    // デフォルトタイトル「新しいチャット」
    expect(data.title).toBe("新しいチャット");

    // 日時フィールドが含まれる
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();

    createdConversationIds.push(data.id);
  });

  it("Req 6.2: 空文字のタイトルで作成しようとすると400エラーを返却する", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });

    const response = await POST(request);

    // 400ステータスコード (Req 6.4)
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("Req 6.2: スペースのみのタイトルで作成しようとすると400エラーを返却する", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("Req 1.1: カスタムタイトルで会話を作成できる", async () => {
    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "テスト会話" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.title).toBe("テスト会話");
    createdConversationIds.push(data.id);
  });

  it("Req 1.1: 作成された会話IDが一意であること", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const request = new Request("http://localhost:3000/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();
      ids.push(data.id);
      createdConversationIds.push(data.id);
    }

    // すべてのIDが異なる
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });
});

describeWithDb("GET /api/conversations - 会話一覧取得", () => {
  it("Req 1.2: 更新日時の降順で会話一覧を取得する", async () => {
    // 2件の会話を時間差で作成
    const conv1 = await prisma.conversation.create({
      data: { title: "一覧テスト1" },
    });
    createdConversationIds.push(conv1.id);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const conv2 = await prisma.conversation.create({
      data: { title: "一覧テスト2" },
    });
    createdConversationIds.push(conv2.id);

    const response = await GET();

    // 200ステータスコード (Req 6.4)
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);

    // 降順: conv2がconv1より先に表示される
    const idx1 = data.findIndex((c: { id: string }) => c.id === conv1.id);
    const idx2 = data.findIndex((c: { id: string }) => c.id === conv2.id);
    expect(idx2).toBeLessThan(idx1);
  });

  it("Req 1.2: 各項目にID、タイトル、更新日時が含まれる", async () => {
    const conv = await prisma.conversation.create({
      data: { title: "フィールド検証" },
    });
    createdConversationIds.push(conv.id);

    const response = await GET();
    const data = await response.json();
    const item = data.find((c: { id: string }) => c.id === conv.id);

    expect(item).toBeDefined();
    expect(item.id).toBe(conv.id);
    expect(item.title).toBe("フィールド検証");
    expect(item.updatedAt).toBeDefined();
  });

  it("Req 1.2: 最新50件に制限される", async () => {
    // 51件の会話を一括作成
    const conversations = await Promise.all(
      Array.from({ length: 51 }, (_, i) =>
        prisma.conversation.create({
          data: { title: `50件制限テスト ${i}` },
        })
      )
    );
    conversations.forEach((c) => createdConversationIds.push(c.id));

    const response = await GET();
    const data = await response.json();

    expect(data.length).toBeLessThanOrEqual(50);
  });
});

describeWithDb(
  "PATCH /api/conversations/[id] - タイトル更新",
  () => {
    it("Req 1.3: タイトルをトリム済みの値に更新する", async () => {
      const conv = await prisma.conversation.create({
        data: { title: "元のタイトル" },
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

      // 200ステータスコード (Req 6.4)
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe("更新後タイトル");
    });

    it("Req 1.4: 空文字のタイトルで更新しようとすると400エラーを返却する", async () => {
      const conv = await prisma.conversation.create({
        data: { title: "テスト" },
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
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("Req 1.4: スペースのみのタイトルで更新しようとすると400エラーを返却する", async () => {
      const conv = await prisma.conversation.create({
        data: { title: "テスト" },
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

    it("Req 6.2: タイトルフィールドが未指定の場合に400エラーを返却する", async () => {
      const conv = await prisma.conversation.create({
        data: { title: "テスト" },
      });
      createdConversationIds.push(conv.id);

      const request = new Request(
        `http://localhost:3000/api/conversations/${conv.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await PATCH(request, createRouteContext(conv.id));
      expect(response.status).toBe(400);
    });

    it("Req 1.6: 存在しない会話IDに対して404エラーを返却する", async () => {
      const request = new Request(
        "http://localhost:3000/api/conversations/non-existent-id",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "新タイトル" }),
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
  }
);

describeWithDb(
  "DELETE /api/conversations/[id] - カスケード削除",
  () => {
    it("Req 1.5: 会話を削除し、成功レスポンスを返却する", async () => {
      const conv = await prisma.conversation.create({
        data: { title: "削除テスト" },
      });
      // 削除されるのでcreatedConversationIdsには追加しない

      const request = new Request(
        `http://localhost:3000/api/conversations/${conv.id}`,
        { method: "DELETE" }
      );

      const response = await DELETE(request, createRouteContext(conv.id));

      // 200ステータスコード (Req 6.4)
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // DBから削除されていることを確認
      const deleted = await prisma.conversation.findUnique({
        where: { id: conv.id },
      });
      expect(deleted).toBeNull();
    });

    it("Req 1.5: 会話削除時に紐づくメッセージがカスケード削除される", async () => {
      const conv = await prisma.conversation.create({
        data: {
          title: "カスケード削除テスト",
          messages: {
            create: [
              { role: "user", content: "メッセージ1" },
              { role: "assistant", content: "応答1" },
              { role: "user", content: "メッセージ2" },
            ],
          },
        },
      });

      // 削除前にメッセージが存在することを確認
      const messagesBefore = await prisma.message.findMany({
        where: { conversationId: conv.id },
      });
      expect(messagesBefore).toHaveLength(3);

      const request = new Request(
        `http://localhost:3000/api/conversations/${conv.id}`,
        { method: "DELETE" }
      );

      const response = await DELETE(request, createRouteContext(conv.id));
      expect(response.status).toBe(200);

      // メッセージもカスケード削除されていること
      const messagesAfter = await prisma.message.findMany({
        where: { conversationId: conv.id },
      });
      expect(messagesAfter).toHaveLength(0);
    });

    it("Req 1.6: 存在しない会話IDに対して404エラーを返却する", async () => {
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
  }
);
