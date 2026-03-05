/**
 * メッセージ永続化 - タスク5.2: メッセージAPIエンドポイントの結合テスト
 *
 * GET /api/conversations/[id]/messages によるメッセージ取得
 * （昇順・フィールド検証・空配列・404エラー）をテストする。
 *
 * POST /api/chat でconversationId指定時のユーザーメッセージ保存、
 * conversationId未指定時の後方互換動作、
 * LLMタイトル自動生成（正常系・フォールバック）をテストする。
 *
 * DATABASE_URLが設定されている環境でのみ実行される。
 *
 * Requirements: 2.1, 2.2, 2.4, 3.1, 3.3, 4.1, 4.2, 4.4, 6.3, 7.1, 7.2
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET } from "@/app/api/conversations/[id]/messages/route";

/** DATABASE_URLが設定されているかどうか */
const hasDatabase = !!process.env.DATABASE_URL;

/** 実DB結合テストの条件付き実行 */
const describeWithDb = hasDatabase ? describe : describe.skip;

let prisma: PrismaClient;
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

describeWithDb(
  "GET /api/conversations/[id]/messages - メッセージ取得",
  () => {
    it("Req 4.1: メッセージが作成日時の昇順で返却される", async () => {
      const conv = await prisma.conversation.create({
        data: {
          title: "昇順テスト",
          messages: {
            create: [
              { role: "user", content: "最初のメッセージ" },
              { role: "assistant", content: "最初の応答" },
              { role: "user", content: "2番目のメッセージ" },
              { role: "assistant", content: "2番目の応答" },
            ],
          },
        },
      });
      createdConversationIds.push(conv.id);

      const request = new Request(
        `http://localhost:3000/api/conversations/${conv.id}/messages`,
        { method: "GET" }
      );

      const response = await GET(request, createRouteContext(conv.id));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveLength(4);

      // 作成日時の昇順であることを確認
      for (let i = 1; i < data.length; i++) {
        const prev = new Date(data[i - 1].createdAt).getTime();
        const curr = new Date(data[i].createdAt).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }

      // 順序: user -> assistant -> user -> assistant
      expect(data[0].role).toBe("user");
      expect(data[0].content).toBe("最初のメッセージ");
      expect(data[1].role).toBe("assistant");
      expect(data[2].role).toBe("user");
      expect(data[3].role).toBe("assistant");
    });

    it("Req 4.2: 各メッセージにID、ロール、コンテンツ、作成日時が含まれる", async () => {
      const conv = await prisma.conversation.create({
        data: {
          title: "フィールド検証テスト",
          messages: {
            create: [
              { role: "user", content: "テストメッセージ" },
            ],
          },
        },
      });
      createdConversationIds.push(conv.id);

      const request = new Request(
        `http://localhost:3000/api/conversations/${conv.id}/messages`,
        { method: "GET" }
      );

      const response = await GET(request, createRouteContext(conv.id));
      const data = await response.json();

      expect(data).toHaveLength(1);
      const msg = data[0];

      // 必須フィールドの存在確認
      expect(msg.id).toBeDefined();
      expect(typeof msg.id).toBe("string");
      expect(msg.role).toBe("user");
      expect(msg.content).toBe("テストメッセージ");
      expect(msg.createdAt).toBeDefined();
    });

    it("Req 4.4: メッセージが存在しない会話では空配列を返却する", async () => {
      const conv = await prisma.conversation.create({
        data: { title: "空会話テスト" },
      });
      createdConversationIds.push(conv.id);

      const request = new Request(
        `http://localhost:3000/api/conversations/${conv.id}/messages`,
        { method: "GET" }
      );

      const response = await GET(request, createRouteContext(conv.id));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual([]);
    });

    it("Req 1.6: 存在しない会話IDに対して404エラーを返却する", async () => {
      const request = new Request(
        "http://localhost:3000/api/conversations/non-existent-id/messages",
        { method: "GET" }
      );

      const response = await GET(
        request,
        createRouteContext("non-existent-id")
      );
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  }
);

/**
 * POST /api/chat のテスト
 * Mastra/handleChatStream はモック化し、DB永続化ロジックに集中する。
 */
describeWithDb("POST /api/chat - メッセージ永続化", () => {
  it("Req 2.1, 7.2: conversationId指定時にユーザーメッセージがDBに保存される", async () => {
    // Mastra / AI SDKをモック化
    vi.doMock("@mastra/ai-sdk", () => ({
      handleChatStream: vi.fn().mockResolvedValue(
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        })
      ),
    }));
    vi.doMock("ai", () => ({
      createUIMessageStreamResponse: vi
        .fn()
        .mockReturnValue(new Response("mocked", { status: 200 })),
    }));
    vi.doMock("@/mastra", () => ({
      mastra: {},
    }));

    const conv = await prisma.conversation.create({
      data: { title: "永続化テスト" },
    });
    createdConversationIds.push(conv.id);

    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "永続化テストメッセージ" }],
        conversationId: conv.id,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // DBにユーザーメッセージが保存されていること
    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
    });
    expect(messages.length).toBeGreaterThanOrEqual(1);
    const userMsg = messages.find((m) => m.role === "user");
    expect(userMsg).toBeDefined();
    expect(userMsg!.content).toBe("永続化テストメッセージ");

    vi.doUnmock("@mastra/ai-sdk");
    vi.doUnmock("ai");
    vi.doUnmock("@/mastra");
  });

  it("Req 7.1: conversationId未指定時はメッセージ永続化がスキップされる（後方互換）", async () => {
    vi.doMock("@mastra/ai-sdk", () => ({
      handleChatStream: vi.fn().mockResolvedValue(
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        })
      ),
    }));
    vi.doMock("ai", () => ({
      createUIMessageStreamResponse: vi
        .fn()
        .mockReturnValue(new Response("mocked", { status: 200 })),
    }));
    vi.doMock("@/mastra", () => ({
      mastra: {},
    }));

    const beforeCount = await prisma.message.count();

    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "後方互換テスト" }],
        // conversationId未指定
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // メッセージ数が増えていないこと
    const afterCount = await prisma.message.count();
    expect(afterCount).toBe(beforeCount);

    vi.doUnmock("@mastra/ai-sdk");
    vi.doUnmock("ai");
    vi.doUnmock("@/mastra");
  });

  it("Req 3.1, 3.3: 最初のメッセージ送信時にタイトルが自動更新される", async () => {
    vi.doMock("@mastra/ai-sdk", () => ({
      handleChatStream: vi.fn().mockResolvedValue(
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        })
      ),
    }));
    vi.doMock("ai", () => ({
      createUIMessageStreamResponse: vi
        .fn()
        .mockReturnValue(new Response("mocked", { status: 200 })),
    }));
    vi.doMock("@/mastra", () => ({
      mastra: {},
    }));

    // デフォルトタイトルの会話を作成
    const conv = await prisma.conversation.create({
      data: { title: "新しいチャット" },
    });
    createdConversationIds.push(conv.id);

    const { POST } = await import("@/app/api/chat/route");

    const longMessage =
      "これはタイトル自動生成のテストです。30文字を超える長いメッセージを送信します。";

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: longMessage }],
        conversationId: conv.id,
      }),
    });

    await POST(request);

    // 非同期タイトル生成を待つ
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // タイトルがデフォルト値から更新されていることを確認
    const updated = await prisma.conversation.findUnique({
      where: { id: conv.id },
    });
    expect(updated).not.toBeNull();
    // タイトルが「新しいチャット」ではなくなっていること
    // （LLM接続またはフォールバックにより先頭30文字に更新される）
    expect(updated!.title).not.toBe("新しいチャット");
    expect(updated!.title.length).toBeLessThanOrEqual(30);

    vi.doUnmock("@mastra/ai-sdk");
    vi.doUnmock("ai");
    vi.doUnmock("@/mastra");
  });

  it("Req 6.3: 存在しないconversationIdでもストリーミング応答は正常に返却される", async () => {
    vi.doMock("@mastra/ai-sdk", () => ({
      handleChatStream: vi.fn().mockResolvedValue(
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        })
      ),
    }));
    vi.doMock("ai", () => ({
      createUIMessageStreamResponse: vi
        .fn()
        .mockReturnValue(new Response("mocked", { status: 200 })),
    }));
    vi.doMock("@/mastra", () => ({
      mastra: {},
    }));

    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "non-existent-id",
      }),
    });

    // DB書き込み失敗してもストリーミング自体は動作する
    const response = await POST(request);
    expect(response.status).toBe(200);

    vi.doUnmock("@mastra/ai-sdk");
    vi.doUnmock("ai");
    vi.doUnmock("@/mastra");
  });
});
