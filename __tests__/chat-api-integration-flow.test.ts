/**
 * チャット画面リデザイン - 会話CRUD API結合テスト
 *
 * 会話のライフサイクル全体を通しでテストする。
 * 作成 -> メッセージ保存 -> メッセージ取得 -> タイトル更新 -> 会話削除の一連のフローを検証する。
 * また、カスケード削除と404レスポンスの結合動作も確認する。
 *
 * 既存の個別APIテスト（chat-conversations-api.test.ts, chat-conversations-id-api.test.ts 等）とは
 * 重複しない結合フロー・シナリオに集中する。
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET as getConversations, POST as createConversation } from "@/app/api/conversations/route";
import { PATCH, DELETE } from "@/app/api/conversations/[id]/route";
import { GET as getMessages } from "@/app/api/conversations/[id]/messages/route";

let prisma: PrismaClient;
/** テスト中に作成した会話IDを追跡するためのリスト */
const createdConversationIds: string[] = [];

/** テスト用のNextリクエストパラメータを生成するヘルパー */
function createRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

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

describe("会話CRUD API 結合フローテスト", () => {
  describe("会話ライフサイクル: 作成 -> メッセージ保存 -> メッセージ取得 -> タイトル更新 -> 削除", () => {
    let conversationId: string;

    it("ステップ1: 新しい会話を作成できること", async () => {
      const request = new Request("http://localhost:3000/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await createConversation(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.title).toBe("新しいチャット");
      conversationId = data.id;
      createdConversationIds.push(conversationId);
    });

    it("ステップ2: 作成した会話が一覧に含まれること", async () => {
      const request = new Request("http://localhost:3000/api/conversations", {
        method: "GET",
      });

      const response = await getConversations(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      const found = data.find((c: { id: string }) => c.id === conversationId);
      expect(found).toBeDefined();
      expect(found.title).toBe("新しいチャット");
    });

    it("ステップ3: Prisma経由でメッセージを保存し、API経由で取得できること", async () => {
      // メッセージをDBに直接保存（Chat APIのonFinish相当）
      await prisma.message.createMany({
        data: [
          {
            role: "user",
            content: "結合テスト：ユーザーメッセージ",
            conversationId,
          },
          {
            role: "assistant",
            content: "結合テスト：AIの応答です",
            conversationId,
          },
        ],
      });

      // API経由でメッセージを取得
      const request = new Request(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        { method: "GET" }
      );

      const response = await getMessages(request, createRouteContext(conversationId));
      expect(response.status).toBe(200);

      const messages = await response.json();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("結合テスト：ユーザーメッセージ");
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].content).toBe("結合テスト：AIの応答です");
    });

    it("ステップ4: メッセージが作成日時の昇順で返却されること", async () => {
      const request = new Request(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        { method: "GET" }
      );

      const response = await getMessages(request, createRouteContext(conversationId));
      const messages = await response.json();

      for (let i = 1; i < messages.length; i++) {
        const prev = new Date(messages[i - 1].createdAt).getTime();
        const curr = new Date(messages[i].createdAt).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it("ステップ5: 会話タイトルを更新できること", async () => {
      const request = new Request(
        `http://localhost:3000/api/conversations/${conversationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "結合テスト更新タイトル" }),
        }
      );

      const response = await PATCH(request, createRouteContext(conversationId));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.title).toBe("結合テスト更新タイトル");
    });

    it("ステップ6: 更新後のタイトルが一覧にも反映されていること", async () => {
      const request = new Request("http://localhost:3000/api/conversations", {
        method: "GET",
      });

      const response = await getConversations(request);
      const data = await response.json();
      const found = data.find((c: { id: string }) => c.id === conversationId);
      expect(found).toBeDefined();
      expect(found.title).toBe("結合テスト更新タイトル");
    });

    it("ステップ7: 会話を削除するとメッセージもカスケード削除されること", async () => {
      // 削除前にメッセージが存在することを確認
      const messagesBefore = await prisma.message.findMany({
        where: { conversationId },
      });
      expect(messagesBefore.length).toBeGreaterThan(0);

      // 会話を削除
      const request = new Request(
        `http://localhost:3000/api/conversations/${conversationId}`,
        { method: "DELETE" }
      );

      const response = await DELETE(request, createRouteContext(conversationId));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // メッセージもカスケード削除されていることを確認
      const messagesAfter = await prisma.message.findMany({
        where: { conversationId },
      });
      expect(messagesAfter).toHaveLength(0);

      // 追跡リストからも削除（afterAllで二重削除しないように）
      const idx = createdConversationIds.indexOf(conversationId);
      if (idx >= 0) createdConversationIds.splice(idx, 1);
    });

    it("ステップ8: 削除済み会話のメッセージ取得で404が返ること", async () => {
      const request = new Request(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        { method: "GET" }
      );

      const response = await getMessages(request, createRouteContext(conversationId));
      expect(response.status).toBe(404);
    });

    it("ステップ9: 削除済み会話のタイトル更新で404が返ること", async () => {
      const request = new Request(
        `http://localhost:3000/api/conversations/${conversationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "更新できないはず" }),
        }
      );

      const response = await PATCH(request, createRouteContext(conversationId));
      expect(response.status).toBe(404);
    });

    it("ステップ10: 削除済み会話の再削除で404が返ること", async () => {
      const request = new Request(
        `http://localhost:3000/api/conversations/${conversationId}`,
        { method: "DELETE" }
      );

      const response = await DELETE(request, createRouteContext(conversationId));
      expect(response.status).toBe(404);
    });
  });

  describe("複数会話の独立性テスト", () => {
    let convId1: string;
    let convId2: string;

    it("2つの会話を作成し、それぞれ独立したメッセージを持てること", async () => {
      // 会話1を作成
      const req1 = new Request("http://localhost:3000/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "独立性テスト会話1" }),
      });
      const res1 = await createConversation(req1);
      const data1 = await res1.json();
      convId1 = data1.id;
      createdConversationIds.push(convId1);

      // 会話2を作成
      const req2 = new Request("http://localhost:3000/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "独立性テスト会話2" }),
      });
      const res2 = await createConversation(req2);
      const data2 = await res2.json();
      convId2 = data2.id;
      createdConversationIds.push(convId2);

      // 各会話にメッセージを保存
      await prisma.message.create({
        data: { role: "user", content: "会話1のメッセージ", conversationId: convId1 },
      });
      await prisma.message.create({
        data: { role: "user", content: "会話2のメッセージ", conversationId: convId2 },
      });

      // 各会話のメッセージが独立していることを確認
      const getReq1 = new Request(
        `http://localhost:3000/api/conversations/${convId1}/messages`,
        { method: "GET" }
      );
      const getRes1 = await getMessages(getReq1, createRouteContext(convId1));
      const msgs1 = await getRes1.json();
      expect(msgs1).toHaveLength(1);
      expect(msgs1[0].content).toBe("会話1のメッセージ");

      const getReq2 = new Request(
        `http://localhost:3000/api/conversations/${convId2}/messages`,
        { method: "GET" }
      );
      const getRes2 = await getMessages(getReq2, createRouteContext(convId2));
      const msgs2 = await getRes2.json();
      expect(msgs2).toHaveLength(1);
      expect(msgs2[0].content).toBe("会話2のメッセージ");
    });

    it("一方の会話を削除しても、他方の会話とメッセージに影響しないこと", async () => {
      // 会話1を削除
      const delReq = new Request(
        `http://localhost:3000/api/conversations/${convId1}`,
        { method: "DELETE" }
      );
      const delRes = await DELETE(delReq, createRouteContext(convId1));
      expect(delRes.status).toBe(200);

      // 会話2のメッセージは影響されないこと
      const getReq = new Request(
        `http://localhost:3000/api/conversations/${convId2}/messages`,
        { method: "GET" }
      );
      const getRes = await getMessages(getReq, createRouteContext(convId2));
      expect(getRes.status).toBe(200);
      const msgs = await getRes.json();
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe("会話2のメッセージ");

      // 追跡リストから削除済み会話を除去
      const idx = createdConversationIds.indexOf(convId1);
      if (idx >= 0) createdConversationIds.splice(idx, 1);
    });
  });
});
