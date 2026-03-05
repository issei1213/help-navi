/**
 * メッセージ永続化 タスク3.2: メッセージ保存・取得の要件適合検証
 *
 * Requirements: 2.1, 2.3, 4.1, 4.2, 4.4
 *
 * 本テストは実際のPostgreSQLデータベースに対して実行する。
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET } from "@/app/api/conversations/[id]/messages/route";

/** Mastra AI SDKのモック（POST /api/chat 用） */
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
  createUIMessageStreamResponse: vi
    .fn()
    .mockReturnValue(new Response("mocked stream", { status: 200 })),
}));

/** Mastraインスタンスのモック */
vi.mock("@/mastra", () => ({
  mastra: {},
}));

let prisma: PrismaClient;
const createdConversationIds: string[] = [];

/** テスト用のNextリクエストパラメータを生成するヘルパー */
function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeAll(() => {
  prisma = new PrismaClient();
});

afterAll(async () => {
  for (const id of createdConversationIds) {
    try {
      await prisma.conversation.delete({ where: { id } });
    } catch {
      // 既に削除されている場合は無視
    }
  }
  await prisma.$disconnect();
});

describe("Req 2.1: ユーザーメッセージ保存", () => {
  it("ユーザーメッセージがconversationId付きリクエストでDBに保存される", async () => {
    const conversation = await prisma.conversation.create({
      data: { title: "3.2テスト_メッセージ保存" },
    });
    createdConversationIds.push(conversation.id);

    // POST /api/chat でconversationId付きリクエスト
    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "3.2テスト保存メッセージ" }],
        conversationId: conversation.id,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // DBにユーザーメッセージが保存されていることを確認
    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
    });
    const userMessage = messages.find((m) => m.role === "user");
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toBe("3.2テスト保存メッセージ");
  });
});

describe("Req 2.3: メッセージフィールド定義", () => {
  it("保存されたメッセージに一意のID、ロール、コンテンツ、作成日時、会話IDが保持される", async () => {
    const conversation = await prisma.conversation.create({
      data: { title: "3.2テスト_フィールド" },
    });
    createdConversationIds.push(conversation.id);

    const message = await prisma.message.create({
      data: {
        role: "user",
        content: "フィールド検証テスト",
        conversationId: conversation.id,
      },
    });

    expect(message.id).toBeDefined();
    expect(typeof message.id).toBe("string");
    expect(message.id.length).toBeGreaterThan(0);
    expect(message.role).toBe("user");
    expect(message.content).toBe("フィールド検証テスト");
    expect(message.createdAt).toBeInstanceOf(Date);
    expect(message.conversationId).toBe(conversation.id);
  });

  it("assistantロールのメッセージも正しく保存される", async () => {
    const conversation = await prisma.conversation.create({
      data: { title: "3.2テスト_assistantフィールド" },
    });
    createdConversationIds.push(conversation.id);

    const message = await prisma.message.create({
      data: {
        role: "assistant",
        content: "AI応答のフィールド検証",
        conversationId: conversation.id,
      },
    });

    expect(message.role).toBe("assistant");
    expect(message.content).toBe("AI応答のフィールド検証");
  });
});

describe("Req 4.1: メッセージ履歴の昇順取得", () => {
  it("メッセージが作成日時の昇順で返却される", async () => {
    const conversation = await prisma.conversation.create({
      data: {
        title: "3.2テスト_昇順取得",
        messages: {
          create: [
            { role: "user", content: "1番目のメッセージ" },
            { role: "assistant", content: "1番目の応答" },
            { role: "user", content: "2番目のメッセージ" },
            { role: "assistant", content: "2番目の応答" },
          ],
        },
      },
    });
    createdConversationIds.push(conversation.id);

    const request = new Request(
      `http://localhost:3000/api/conversations/${conversation.id}/messages`,
      { method: "GET" }
    );

    const response = await GET(
      request,
      createRouteContext(conversation.id)
    );
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.length).toBe(4);

    // 作成日時の昇順であることを確認
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].createdAt).getTime();
      const curr = new Date(data[i].createdAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }

    // メッセージの順序が正しいことを確認
    expect(data[0].content).toBe("1番目のメッセージ");
    expect(data[0].role).toBe("user");
    expect(data[1].content).toBe("1番目の応答");
    expect(data[1].role).toBe("assistant");
  });
});

describe("Req 4.2: 取得メッセージのフィールド", () => {
  it("各メッセージにID、ロール、コンテンツ、作成日時が含まれる", async () => {
    const conversation = await prisma.conversation.create({
      data: {
        title: "3.2テスト_フィールド取得",
        messages: {
          create: [{ role: "user", content: "フィールド取得テスト" }],
        },
      },
    });
    createdConversationIds.push(conversation.id);

    const request = new Request(
      `http://localhost:3000/api/conversations/${conversation.id}/messages`,
      { method: "GET" }
    );

    const response = await GET(
      request,
      createRouteContext(conversation.id)
    );
    const data = await response.json();

    expect(data[0].id).toBeDefined();
    expect(data[0].role).toBe("user");
    expect(data[0].content).toBe("フィールド取得テスト");
    expect(data[0].createdAt).toBeDefined();
  });
});

describe("Req 4.4: メッセージが存在しない会話で空配列返却", () => {
  it("メッセージが存在しない会話で空配列が返却される", async () => {
    const conversation = await prisma.conversation.create({
      data: { title: "3.2テスト_空の会話" },
    });
    createdConversationIds.push(conversation.id);

    const request = new Request(
      `http://localhost:3000/api/conversations/${conversation.id}/messages`,
      { method: "GET" }
    );

    const response = await GET(
      request,
      createRouteContext(conversation.id)
    );
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual([]);
  });
});
