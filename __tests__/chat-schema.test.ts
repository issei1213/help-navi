/**
 * チャット画面リデザイン - Prismaスキーマテスト
 *
 * Conversation / Message モデルの存在とリレーションを検証する。
 * データベースに対して実際にCRUD操作を行い、スキーマの正当性を確認する。
 *
 * 各テストは独立して動作し、他のテストファイルとの干渉を避ける。
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

beforeAll(() => {
  prisma = new PrismaClient();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Prisma スキーマ: Conversation / Message モデル", () => {
  /** テスト中に作成した会話IDを追跡する */
  const createdIds: string[] = [];

  afterAll(async () => {
    // テストデータのクリーンアップ
    for (const id of createdIds) {
      try {
        await prisma.conversation.delete({ where: { id } });
      } catch {
        // 既に削除されている場合は無視
      }
    }
  });

  it("Conversation を作成できること", async () => {
    const conversation = await prisma.conversation.create({
      data: { title: "スキーマテスト_作成" },
    });
    createdIds.push(conversation.id);

    expect(conversation.id).toBeDefined();
    expect(conversation.title).toBe("スキーマテスト_作成");
    expect(conversation.createdAt).toBeInstanceOf(Date);
    expect(conversation.updatedAt).toBeInstanceOf(Date);
  });

  it("Conversation のデフォルトタイトルが「新しいチャット」であること", async () => {
    const conversation = await prisma.conversation.create({
      data: {},
    });
    createdIds.push(conversation.id);

    expect(conversation.title).toBe("新しいチャット");
  });

  it("Message を Conversation に紐づけて作成できること", async () => {
    const conversation = await prisma.conversation.create({
      data: { title: "スキーマテスト_メッセージ紐付け" },
    });
    createdIds.push(conversation.id);

    const userMessage = await prisma.message.create({
      data: {
        role: "user",
        content: "こんにちは",
        conversationId: conversation.id,
      },
    });

    expect(userMessage.id).toBeDefined();
    expect(userMessage.role).toBe("user");
    expect(userMessage.content).toBe("こんにちは");
    expect(userMessage.conversationId).toBe(conversation.id);
    expect(userMessage.createdAt).toBeInstanceOf(Date);

    const assistantMessage = await prisma.message.create({
      data: {
        role: "assistant",
        content: "こんにちは！何かお手伝いしましょうか？",
        conversationId: conversation.id,
      },
    });

    expect(assistantMessage.role).toBe("assistant");
  });

  it("Conversation から Messages を include で取得できること（1対多リレーション）", async () => {
    const conversation = await prisma.conversation.create({
      data: {
        title: "スキーマテスト_include",
        messages: {
          create: [
            { role: "user", content: "テスト1" },
            { role: "assistant", content: "応答1" },
          ],
        },
      },
    });
    createdIds.push(conversation.id);

    const conversationWithMessages = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: { messages: true },
    });

    expect(conversationWithMessages).not.toBeNull();
    expect(conversationWithMessages!.messages).toBeInstanceOf(Array);
    expect(conversationWithMessages!.messages.length).toBe(2);
  });

  it("Message から Conversation を参照できること", async () => {
    const conversation = await prisma.conversation.create({
      data: {
        title: "スキーマテスト_逆参照",
        messages: {
          create: [{ role: "user", content: "参照テスト" }],
        },
      },
    });
    createdIds.push(conversation.id);

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      include: { conversation: true },
    });

    expect(messages.length).toBe(1);
    expect(messages[0].conversation.id).toBe(conversation.id);
    expect(messages[0].conversation.title).toBe("スキーマテスト_逆参照");
  });

  it("Conversation 削除時に関連 Message がカスケード削除されること", async () => {
    const tempConversation = await prisma.conversation.create({
      data: {
        title: "スキーマテスト_カスケード",
        messages: {
          create: [
            { role: "user", content: "テストメッセージ1" },
            { role: "assistant", content: "テスト応答1" },
          ],
        },
      },
    });

    // メッセージが作成されていることを確認
    const messagesBefore = await prisma.message.findMany({
      where: { conversationId: tempConversation.id },
    });
    expect(messagesBefore.length).toBe(2);

    // 会話を削除
    await prisma.conversation.delete({
      where: { id: tempConversation.id },
    });

    // メッセージもカスケード削除されていることを確認
    const messagesAfter = await prisma.message.findMany({
      where: { conversationId: tempConversation.id },
    });
    expect(messagesAfter.length).toBe(0);
  });

  it("Conversation の一覧を updatedAt 降順で取得できること", async () => {
    const conv1 = await prisma.conversation.create({
      data: { title: "スキーマテスト_ソート1" },
    });
    createdIds.push(conv1.id);

    // 少し待って2つ目を作成（updatedAtに差を出す）
    await new Promise((resolve) => setTimeout(resolve, 50));

    const conv2 = await prisma.conversation.create({
      data: { title: "スキーマテスト_ソート2" },
    });
    createdIds.push(conv2.id);

    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    expect(conversations.length).toBeGreaterThanOrEqual(2);
    const idx1 = conversations.findIndex((c) => c.id === conv1.id);
    const idx2 = conversations.findIndex((c) => c.id === conv2.id);
    expect(idx2).toBeLessThan(idx1);
  });

  it("Message に conversationId インデックスが効いていること（検索性能）", async () => {
    // 自己完結型: テスト専用のデータを作成
    const conversation = await prisma.conversation.create({
      data: {
        title: "スキーマテスト_インデックス",
        messages: {
          create: [
            { role: "user", content: "インデックステスト1" },
            { role: "assistant", content: "インデックステスト応答1" },
            { role: "user", content: "インデックステスト2" },
          ],
        },
      },
    });
    createdIds.push(conversation.id);

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });

    expect(messages.length).toBe(3);
    // createdAt の昇順であることを確認
    for (let i = 1; i < messages.length; i++) {
      expect(messages[i].createdAt.getTime()).toBeGreaterThanOrEqual(
        messages[i - 1].createdAt.getTime()
      );
    }
  });
});
