/**
 * モデルセレクター - API ルート結合テスト
 *
 * modelId 付きの会話作成、modelId のバリデーション、
 * 会話一覧での modelId 返却を検証する。
 *
 * 実際のデータベース接続を使用する結合テスト。
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  GET as getConversations,
  POST as createConversation,
} from "@/app/api/conversations/route";

let prisma: PrismaClient;
/** テスト中に作成した会話IDを追跡するためのリスト */
const createdConversationIds: string[] = [];

beforeAll(() => {
  prisma = new PrismaClient();
});

afterAll(async () => {
  // テストデータのクリーンアップ
  for (const id of createdConversationIds) {
    try {
      await prisma.conversation.delete({ where: { id } });
    } catch {
      // 既に削除されている場合は無視
    }
  }
  await prisma.$disconnect();
});

describe("モデルセレクター API 結合テスト", () => {
  describe("POST /api/conversations - modelId 付き会話作成", () => {
    it("有効な modelId を指定して会話を作成できること", async () => {
      const request = new Request("http://localhost:3000/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: "claude-opus-4-20250514" }),
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.modelId).toBe("claude-opus-4-20250514");
      expect(data.id).toBeDefined();

      createdConversationIds.push(data.id);
    });

    it("modelId を指定しない場合、modelId が null で作成されること", async () => {
      const request = new Request("http://localhost:3000/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.modelId).toBeNull();

      createdConversationIds.push(data.id);
    });

    it("無効な modelId を指定した場合、400 エラーを返すこと", async () => {
      const request = new Request("http://localhost:3000/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: "invalid-model-id" }),
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("モデルは利用できません");
    });
  });

  describe("GET /api/conversations - modelId を含むレスポンス", () => {
    it("会話一覧に modelId フィールドが含まれること", async () => {
      // まず modelId 付きの会話を作成
      const createRequest = new Request(
        "http://localhost:3000/api/conversations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: "claude-haiku-3-5-20241022" }),
        }
      );
      const createResponse = await createConversation(createRequest);
      const created = await createResponse.json();
      createdConversationIds.push(created.id);

      // 一覧を取得
      const response = await getConversations();
      const conversations = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(conversations)).toBe(true);

      // 作成した会話が一覧に含まれ、modelId が正しいこと
      const found = conversations.find(
        (c: { id: string }) => c.id === created.id
      );
      expect(found).toBeDefined();
      expect(found.modelId).toBe("claude-haiku-3-5-20241022");
    });
  });

  describe("POST /api/chat - modelId バリデーション", () => {
    it("無効な modelId を指定した場合、400 エラーを返すこと", async () => {
      // chat route を直接インポートしてバリデーションのみテスト
      const { POST: chatPost } = await import("@/app/api/chat/route");

      const request = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "テスト",
              parts: [{ type: "text", text: "テスト" }],
            },
          ],
          modelId: "invalid-model-id",
        }),
      });

      const response = await chatPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("モデルは利用できません");
    });
  });
});
