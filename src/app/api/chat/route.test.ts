/**
 * route.ts のユニットテスト
 *
 * タスク1.2: generateTitle関数をユーザーメッセージ保存処理に統合する。
 * タスク2: ストリーム完了時のAI応答メッセージ永続化を接続する。
 *
 * Requirements: 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 6.3, 7.1, 7.2
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** generateTitle関数のモック */
const mockGenerateTitle = vi.fn();

vi.mock("./generate-title", () => ({
  generateTitle: (...args: unknown[]) => mockGenerateTitle(...args),
  TITLE_MAX_LENGTH: 30,
}));

/** Prismaクライアントのモック */
const mockMessageCreate = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/infrastructure/prisma-client", () => ({
  prisma: {
    message: {
      create: (...args: unknown[]) => mockMessageCreate(...args),
    },
    conversation: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

/** handleChatStream のモック */
const mockHandleChatStream = vi.fn();

vi.mock("@mastra/ai-sdk", () => ({
  handleChatStream: (...args: unknown[]) => mockHandleChatStream(...args),
}));

/**
 * createUIMessageStreamResponse のモック
 * consumeSseStream コールバックをキャプチャして、テストから制御可能にする
 */
const mockCreateUIMessageStreamResponse = vi.fn();

vi.mock("ai", () => ({
  createUIMessageStreamResponse: (...args: unknown[]) =>
    mockCreateUIMessageStreamResponse(...args),
}));

/** Mastraインスタンスのモック */
vi.mock("@/mastra", () => ({
  mastra: {},
}));

/**
 * SSE形式のストリームを生成するヘルパー
 * text-deltaチャンクをSSEフォーマットで送信する
 */
function createSseStream(
  chunks: Array<{ type: string; [key: string]: unknown }>
): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      controller.enqueue("data: [DONE]\n\n");
      controller.close();
    },
  });
}

describe("saveUserMessage - generateTitle統合 (タスク1.2)", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // デフォルト: メッセージ保存成功
    mockMessageCreate.mockResolvedValue({
      id: "msg-1",
      role: "user",
      content: "テスト",
      conversationId: "conv-1",
    });

    // デフォルト: handleChatStream は空ストリームを返す
    mockHandleChatStream.mockResolvedValue(
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      })
    );

    // デフォルト: createUIMessageStreamResponse はモックレスポンスを返す
    mockCreateUIMessageStreamResponse.mockReturnValue(
      new Response("mocked stream", { status: 200 })
    );

    const module = await import("./route");
    POST = module.POST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("デフォルトタイトルかつ最初のメッセージの場合、generateTitleが呼び出される", async () => {
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "新しいチャット",
      messages: [{ id: "msg-1" }],
    });
    mockGenerateTitle.mockResolvedValue("LLM生成タイトル");
    mockUpdate.mockResolvedValue({});

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "今日の天気を教えてください" }],
        conversationId: "conv-1",
      }),
    });

    await POST(request);

    await vi.waitFor(() => {
      expect(mockGenerateTitle).toHaveBeenCalledWith(
        "今日の天気を教えてください"
      );
    });
  });

  it("generateTitleの返却値でタイトルが更新される", async () => {
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "新しいチャット",
      messages: [{ id: "msg-1" }],
    });
    mockGenerateTitle.mockResolvedValue("天気の質問");
    mockUpdate.mockResolvedValue({});

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "今日の天気を教えてください" }],
        conversationId: "conv-1",
      }),
    });

    await POST(request);

    await vi.waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "conv-1" },
        data: { title: "天気の質問" },
      });
    });
  });

  it("タイトルがデフォルト以外に変更済みの場合、generateTitleは呼び出されない", async () => {
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "カスタムタイトル",
      messages: [{ id: "msg-1" }],
    });

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "conv-1",
      }),
    });

    await POST(request);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockGenerateTitle).not.toHaveBeenCalled();
  });

  it("メッセージが2件以上存在する場合、generateTitleは呼び出されない", async () => {
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "新しいチャット",
      messages: [{ id: "msg-1" }, { id: "msg-2" }],
    });

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "conv-1",
      }),
    });

    await POST(request);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockGenerateTitle).not.toHaveBeenCalled();
  });

  it("generateTitleが失敗してもメッセージ保存やストリーミングには影響しない", async () => {
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "新しいチャット",
      messages: [{ id: "msg-1" }],
    });
    mockGenerateTitle.mockRejectedValue(new Error("LLMエラー"));
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "conv-1",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockMessageCreate).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("タイトル生成は非同期で実行され、POSTレスポンスをブロックしない", async () => {
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "新しいチャット",
      messages: [{ id: "msg-1" }],
    });

    let resolveTitle: (value: string) => void;
    const titlePromise = new Promise<string>((resolve) => {
      resolveTitle = resolve;
    });
    mockGenerateTitle.mockReturnValue(titlePromise);

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "conv-1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    resolveTitle!("生成されたタイトル");
    mockUpdate.mockResolvedValue({});

    await vi.waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "conv-1" },
        data: { title: "生成されたタイトル" },
      });
    });
  });

  it("conversationIdがない場合、generateTitleは呼び出されない", async () => {
    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
      }),
    });

    await POST(request);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockGenerateTitle).not.toHaveBeenCalled();
  });
});

describe("ストリーム完了時のAI応答メッセージ永続化 (タスク2)", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // デフォルト: メッセージ保存成功
    mockMessageCreate.mockResolvedValue({
      id: "msg-1",
      role: "user",
      content: "テスト",
      conversationId: "conv-1",
    });

    // デフォルト: 会話取得（タイトル自動生成をスキップする条件）
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      title: "カスタムタイトル",
      messages: [{ id: "msg-1" }, { id: "msg-2" }],
    });

    // デフォルト: handleChatStream は空ストリームを返す
    mockHandleChatStream.mockResolvedValue(
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      })
    );

    // デフォルト: createUIMessageStreamResponse
    mockCreateUIMessageStreamResponse.mockReturnValue(
      new Response("mocked stream", { status: 200 })
    );

    const module = await import("./route");
    POST = module.POST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("conversationId付きリクエストの場合、consumeSseStreamが設定される", async () => {
    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "conv-1",
      }),
    });

    await POST(request);

    // createUIMessageStreamResponse にconsumeSseStream が渡されていることを確認
    expect(mockCreateUIMessageStreamResponse).toHaveBeenCalled();
    const callArgs = mockCreateUIMessageStreamResponse.mock.calls[0][0];
    expect(callArgs.consumeSseStream).toBeDefined();
    expect(typeof callArgs.consumeSseStream).toBe("function");
  });

  it("conversationIdがない場合、consumeSseStreamは設定されない", async () => {
    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
      }),
    });

    await POST(request);

    expect(mockCreateUIMessageStreamResponse).toHaveBeenCalled();
    const callArgs = mockCreateUIMessageStreamResponse.mock.calls[0][0];
    expect(callArgs.consumeSseStream).toBeUndefined();
  });

  it("ストリーム完了時にAI応答メッセージがDBに保存される", async () => {
    // consumeSseStreamコールバックを直接呼び出してテスト
    mockCreateUIMessageStreamResponse.mockImplementation(
      (options: {
        stream: ReadableStream;
        consumeSseStream?: (opts: {
          stream: ReadableStream<string>;
        }) => Promise<void> | void;
      }) => {
        // consumeSseStream が設定されている場合、テスト用のSSEストリームで呼び出す
        if (options.consumeSseStream) {
          const sseStream = createSseStream([
            { type: "text-start", id: "text-1" },
            { type: "text-delta", delta: "こんにちは", id: "text-1" },
            { type: "text-delta", delta: "、お元気ですか？", id: "text-1" },
            { type: "text-end", id: "text-1" },
          ]);
          options.consumeSseStream({ stream: sseStream });
        }
        return new Response("mocked stream", { status: 200 });
      }
    );

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "conv-1",
      }),
    });

    await POST(request);

    // 非同期処理を待つ
    await vi.waitFor(() => {
      // saveAssistantMessage が呼ばれたことを確認
      const assistantCalls = mockMessageCreate.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as { data: { role: string } }).data.role === "assistant"
      );
      expect(assistantCalls.length).toBeGreaterThanOrEqual(1);
      const savedContent = (
        assistantCalls[0][0] as { data: { content: string } }
      ).data.content;
      expect(savedContent).toBe("こんにちは、お元気ですか？");
    });
  });

  it("AI応答保存時に会話IDが正しく指定される", async () => {
    mockCreateUIMessageStreamResponse.mockImplementation(
      (options: {
        stream: ReadableStream;
        consumeSseStream?: (opts: {
          stream: ReadableStream<string>;
        }) => Promise<void> | void;
      }) => {
        if (options.consumeSseStream) {
          const sseStream = createSseStream([
            { type: "text-start", id: "text-1" },
            { type: "text-delta", delta: "応答", id: "text-1" },
            { type: "text-end", id: "text-1" },
          ]);
          options.consumeSseStream({ stream: sseStream });
        }
        return new Response("mocked stream", { status: 200 });
      }
    );

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "conv-123",
      }),
    });

    await POST(request);

    await vi.waitFor(() => {
      const assistantCalls = mockMessageCreate.mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as { data: { role: string } }).data.role === "assistant"
      );
      expect(assistantCalls.length).toBeGreaterThanOrEqual(1);
      expect(
        (assistantCalls[0][0] as { data: { conversationId: string } }).data
          .conversationId
      ).toBe("conv-123");
    });
  });

  it("AI応答保存に失敗してもストリーミング応答は正常に返却される", async () => {
    // AI応答保存で2回目のmessage.createはエラーをスロー
    let callCount = 0;
    mockMessageCreate.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // ユーザーメッセージ保存（成功）
        return Promise.resolve({ id: "msg-1" });
      }
      // AI応答保存（失敗）
      return Promise.reject(new Error("DB書き込みエラー"));
    });

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockCreateUIMessageStreamResponse.mockImplementation(
      (options: {
        stream: ReadableStream;
        consumeSseStream?: (opts: {
          stream: ReadableStream<string>;
        }) => Promise<void> | void;
      }) => {
        if (options.consumeSseStream) {
          const sseStream = createSseStream([
            { type: "text-start", id: "text-1" },
            { type: "text-delta", delta: "応答テキスト", id: "text-1" },
            { type: "text-end", id: "text-1" },
          ]);
          options.consumeSseStream({ stream: sseStream });
        }
        return new Response("mocked stream", { status: 200 });
      }
    );

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "conv-1",
      }),
    });

    // レスポンスは正常に返却される
    const response = await POST(request);
    expect(response.status).toBe(200);

    // エラーが記録されることを確認
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "AIメッセージ保存エラー:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("空のAI応答の場合、saveAssistantMessageは呼び出されない", async () => {
    mockCreateUIMessageStreamResponse.mockImplementation(
      (options: {
        stream: ReadableStream;
        consumeSseStream?: (opts: {
          stream: ReadableStream<string>;
        }) => Promise<void> | void;
      }) => {
        if (options.consumeSseStream) {
          // テキストデルタなしのストリーム
          const sseStream = createSseStream([
            { type: "text-start", id: "text-1" },
            { type: "text-end", id: "text-1" },
          ]);
          options.consumeSseStream({ stream: sseStream });
        }
        return new Response("mocked stream", { status: 200 });
      }
    );

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "テスト" }],
        conversationId: "conv-1",
      }),
    });

    await POST(request);

    // 少し待つ
    await new Promise((r) => setTimeout(r, 100));

    // assistantメッセージの保存は呼ばれないこと
    const assistantCalls = mockMessageCreate.mock.calls.filter(
      (call: unknown[]) =>
        (call[0] as { data: { role: string } }).data.role === "assistant"
    );
    expect(assistantCalls).toHaveLength(0);
  });
});
