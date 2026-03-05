/**
 * メッセージ永続化 タスク3.3: エラーハンドリングとHTTPステータスコードの要件適合検証
 *
 * Requirements: 6.1, 6.2, 6.4
 *
 * Prismaクライアントをモックし、DB接続失敗時のエラーハンドリングを検証する。
 * 実際のDB接続不要（モックテスト）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** Prismaクライアントのモック */
const mockConversationFindMany = vi.fn();
const mockConversationCreate = vi.fn();
const mockConversationFindUnique = vi.fn();
const mockConversationUpdate = vi.fn();
const mockConversationDelete = vi.fn();
const mockMessageCreate = vi.fn();

vi.mock("@/infrastructure/prisma-client", () => ({
  prisma: {
    conversation: {
      findMany: (...args: unknown[]) => mockConversationFindMany(...args),
      create: (...args: unknown[]) => mockConversationCreate(...args),
      findUnique: (...args: unknown[]) => mockConversationFindUnique(...args),
      update: (...args: unknown[]) => mockConversationUpdate(...args),
      delete: (...args: unknown[]) => mockConversationDelete(...args),
    },
    message: {
      create: (...args: unknown[]) => mockMessageCreate(...args),
    },
  },
}));

/** Mastra/AI SDK モック（POST /api/chat 用） */
vi.mock("@mastra/ai-sdk", () => ({
  handleChatStream: vi.fn().mockResolvedValue(
    new ReadableStream({
      start(controller) {
        controller.close();
      },
    })
  ),
}));

vi.mock("ai", () => ({
  createUIMessageStreamResponse: vi
    .fn()
    .mockReturnValue(new Response("mocked stream", { status: 200 })),
}));

vi.mock("@/mastra", () => ({
  mastra: {},
}));

vi.mock("./src/app/api/chat/generate-title", () => ({
  generateTitle: vi.fn().mockResolvedValue("テストタイトル"),
  TITLE_MAX_LENGTH: 30,
}));

describe("Req 6.1: DB接続失敗時のエラー処理", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("GET /api/conversations: DB接続失敗時に500ステータスコードとエラーメッセージを返す", async () => {
    mockConversationFindMany.mockRejectedValue(
      new Error("DB接続エラー")
    );

    const { GET } = await import("@/app/api/conversations/route");

    const request = new Request("http://localhost:3000/api/conversations");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(typeof data.error).toBe("string");
  });

  it("POST /api/conversations: DB接続失敗時に500ステータスコードとエラーメッセージを返す", async () => {
    mockConversationCreate.mockRejectedValue(
      new Error("DB接続エラー")
    );

    const { POST } = await import("@/app/api/conversations/route");

    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("PATCH /api/conversations/[id]: DB接続失敗時に500ステータスコードを返す", async () => {
    // findUnique は正常に返すが、update でエラー
    mockConversationFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "テスト",
    });
    mockConversationUpdate.mockRejectedValue(
      new Error("DB接続エラー")
    );

    const { PATCH } = await import(
      "@/app/api/conversations/[id]/route"
    );

    const request = new Request(
      "http://localhost:3000/api/conversations/conv-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "更新テスト" }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "conv-1" }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("DELETE /api/conversations/[id]: DB接続失敗時に500ステータスコードを返す", async () => {
    mockConversationFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "テスト",
    });
    mockConversationDelete.mockRejectedValue(
      new Error("DB接続エラー")
    );

    const { DELETE } = await import(
      "@/app/api/conversations/[id]/route"
    );

    const request = new Request(
      "http://localhost:3000/api/conversations/conv-1",
      { method: "DELETE" }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "conv-1" }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("GET /api/conversations/[id]/messages: DB接続失敗時に500ステータスコードを返す", async () => {
    mockConversationFindUnique.mockRejectedValue(
      new Error("DB接続エラー")
    );

    const { GET } = await import(
      "@/app/api/conversations/[id]/messages/route"
    );

    const request = new Request(
      "http://localhost:3000/api/conversations/conv-1/messages"
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "conv-1" }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("POST /api/chat: DB接続失敗時でもストリーミング応答は返される（永続化エラーはログのみ）", async () => {
    mockMessageCreate.mockRejectedValue(new Error("DB接続エラー"));

    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "conv-1",
      }),
    });

    const response = await POST(request);
    // ストリーミング応答は正常に返却される
    expect(response.status).toBe(200);
    // エラーがログに記録される
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe("Req 6.2: 不正なリクエストボディのバリデーション", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/chat: messagesフィールドが欠損の場合に400ステータスコードを返す", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("POST /api/chat: messagesが配列でない場合に400ステータスコードを返す", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: "not-an-array" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("POST /api/chat: 空のメッセージ配列で400ステータスコードを返す", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("POST /api/conversations: 空文字タイトルで400ステータスコードを返す", async () => {
    const { POST } = await import("@/app/api/conversations/route");

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

  it("PATCH /api/conversations/[id]: タイトル未指定で400ステータスコードを返す", async () => {
    const { PATCH } = await import(
      "@/app/api/conversations/[id]/route"
    );

    const request = new Request(
      "http://localhost:3000/api/conversations/conv-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "conv-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

describe("Req 6.4: 適切なHTTPステータスコード", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/conversations: 正常時に200を返す", async () => {
    mockConversationFindMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/conversations/route");

    const request = new Request("http://localhost:3000/api/conversations");
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("POST /api/conversations: 正常時に201を返す", async () => {
    mockConversationCreate.mockResolvedValue({
      id: "conv-1",
      title: "新しいチャット",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { POST } = await import("@/app/api/conversations/route");

    const request = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("PATCH /api/conversations/[id]: 正常時に200を返す", async () => {
    mockConversationFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "テスト",
    });
    mockConversationUpdate.mockResolvedValue({
      id: "conv-1",
      title: "更新後",
      updatedAt: new Date().toISOString(),
    });

    const { PATCH } = await import(
      "@/app/api/conversations/[id]/route"
    );

    const request = new Request(
      "http://localhost:3000/api/conversations/conv-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "更新後" }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "conv-1" }),
    });
    expect(response.status).toBe(200);
  });

  it("DELETE /api/conversations/[id]: 正常時に200を返す", async () => {
    mockConversationFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "テスト",
    });
    mockConversationDelete.mockResolvedValue({});

    const { DELETE } = await import(
      "@/app/api/conversations/[id]/route"
    );

    const request = new Request(
      "http://localhost:3000/api/conversations/conv-1",
      { method: "DELETE" }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "conv-1" }),
    });
    expect(response.status).toBe(200);
  });

  it("PATCH: 存在しないIDに対して404を返す", async () => {
    mockConversationFindUnique.mockResolvedValue(null);

    const { PATCH } = await import(
      "@/app/api/conversations/[id]/route"
    );

    const request = new Request(
      "http://localhost:3000/api/conversations/non-existent",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "テスト" }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    expect(response.status).toBe(404);
  });

  it("DELETE: 存在しないIDに対して404を返す", async () => {
    mockConversationFindUnique.mockResolvedValue(null);

    const { DELETE } = await import(
      "@/app/api/conversations/[id]/route"
    );

    const request = new Request(
      "http://localhost:3000/api/conversations/non-existent",
      { method: "DELETE" }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    expect(response.status).toBe(404);
  });

  it("GET /api/conversations/[id]/messages: 存在しないIDに対して404を返す", async () => {
    mockConversationFindUnique.mockResolvedValue(null);

    const { GET } = await import(
      "@/app/api/conversations/[id]/messages/route"
    );

    const request = new Request(
      "http://localhost:3000/api/conversations/non-existent/messages"
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    expect(response.status).toBe(404);
  });
});
