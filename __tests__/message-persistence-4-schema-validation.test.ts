/**
 * メッセージ永続化 - タスク4: データベーススキーマの要件適合検証テスト
 *
 * Prismaスキーマファイルとマイグレーションファイルの静的解析により、
 * データベーススキーマが仕様に適合していることを検証する。
 *
 * 実DBアクセスによる動作検証はDATABASE_URLが設定されている場合のみ実行する。
 * （DATABASE_URLが未設定の場合、実DBテストはスキップされる）
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

/** Prismaスキーマファイルの内容 */
let schemaContent: string;

/** マイグレーションSQLファイルの内容 */
let migrationSqlContent: string;

/** Prismaクライアント（実DB検証用） */
let prisma: PrismaClient | null = null;

/** DATABASE_URLが設定されているかどうか */
const hasDatabase = !!process.env.DATABASE_URL;

/** 実DBテスト用の条件付きdescribe */
const describeWithDb = hasDatabase ? describe : describe.skip;

beforeAll(() => {
  const projectRoot = path.resolve(__dirname, "..");
  schemaContent = fs.readFileSync(
    path.join(projectRoot, "prisma/schema.prisma"),
    "utf-8"
  );

  // マイグレーションディレクトリ内のSQLファイルを読み込む
  const migrationsDir = path.join(projectRoot, "prisma/migrations");
  const migrationDirs = fs
    .readdirSync(migrationsDir)
    .filter((d) => !d.endsWith(".toml"));
  // 最新のマイグレーションを使用
  const latestMigration = migrationDirs.sort().pop();
  if (latestMigration) {
    migrationSqlContent = fs.readFileSync(
      path.join(migrationsDir, latestMigration, "migration.sql"),
      "utf-8"
    );
  } else {
    migrationSqlContent = "";
  }

  if (hasDatabase) {
    prisma = new PrismaClient();
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});

describe("Requirement 5.1: Conversationテーブル定義", () => {
  describe("Prismaスキーマ定義の検証", () => {
    it("Conversationモデルが定義されていること", () => {
      expect(schemaContent).toContain("model Conversation");
    });

    it("IDフィールドがCUID形式のプライマリキーであること", () => {
      const conversationModel = extractModelBlock(
        schemaContent,
        "Conversation"
      );
      expect(conversationModel).toContain("@id");
      expect(conversationModel).toContain("@default(cuid())");
      expect(conversationModel).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/
      );
    });

    it("titleフィールドがString型でデフォルト値が設定されていること", () => {
      const conversationModel = extractModelBlock(
        schemaContent,
        "Conversation"
      );
      expect(conversationModel).toMatch(/title\s+String/);
      expect(conversationModel).toContain('@default("新しいチャット")');
    });

    it("createdAtフィールドがDateTime型でデフォルト値now()が設定されていること", () => {
      const conversationModel = extractModelBlock(
        schemaContent,
        "Conversation"
      );
      expect(conversationModel).toMatch(
        /createdAt\s+DateTime\s+@default\(now\(\)\)/
      );
    });

    it("updatedAtフィールドがDateTime型で@updatedAtが設定されていること", () => {
      const conversationModel = extractModelBlock(
        schemaContent,
        "Conversation"
      );
      expect(conversationModel).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
    });
  });

  describe("マイグレーションSQLの検証", () => {
    it("ConversationテーブルのCREATE TABLEが存在すること", () => {
      expect(migrationSqlContent).toContain('CREATE TABLE "Conversation"');
    });

    it("idカラムがTEXT型のPRIMARY KEYであること", () => {
      expect(migrationSqlContent).toContain('"id" TEXT NOT NULL');
      expect(migrationSqlContent).toContain(
        'CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")'
      );
    });

    it("titleカラムにデフォルト値が設定されていること", () => {
      expect(migrationSqlContent).toMatch(
        /"title" TEXT NOT NULL DEFAULT '新しいチャット'/
      );
    });

    it("createdAtカラムにDEFAULT CURRENT_TIMESTAMPが設定されていること", () => {
      expect(migrationSqlContent).toMatch(
        /"createdAt" TIMESTAMP\(3\) NOT NULL DEFAULT CURRENT_TIMESTAMP/
      );
    });
  });

  describeWithDb("実DBでの動作検証", () => {
    const createdIds: string[] = [];

    afterAll(async () => {
      if (!prisma) return;
      for (const id of createdIds) {
        try {
          await prisma.conversation.delete({ where: { id } });
        } catch {
          // 既に削除済みの場合は無視
        }
      }
    });

    it("Conversationを作成するとCUID形式のIDが自動生成されること", async () => {
      const conv = await prisma!.conversation.create({ data: {} });
      createdIds.push(conv.id);

      // CUID形式: 英小文字で始まる25文字程度の文字列
      expect(conv.id).toMatch(/^c[a-z0-9]{20,}/);
    });

    it("タイトル未指定時にデフォルト値「新しいチャット」が設定されること", async () => {
      const conv = await prisma!.conversation.create({ data: {} });
      createdIds.push(conv.id);

      expect(conv.title).toBe("新しいチャット");
    });

    it("createdAtとupdatedAtが自動設定されること", async () => {
      const conv = await prisma!.conversation.create({ data: {} });
      createdIds.push(conv.id);

      expect(conv.createdAt).toBeInstanceOf(Date);
      expect(conv.updatedAt).toBeInstanceOf(Date);
    });
  });
});

describe("Requirement 5.2: Messageテーブル定義", () => {
  describe("Prismaスキーマ定義の検証", () => {
    it("Messageモデルが定義されていること", () => {
      expect(schemaContent).toContain("model Message");
    });

    it("IDフィールドがCUID形式のプライマリキーであること", () => {
      const messageModel = extractModelBlock(schemaContent, "Message");
      expect(messageModel).toContain("@id");
      expect(messageModel).toContain("@default(cuid())");
      expect(messageModel).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/
      );
    });

    it("roleフィールドがString型であること", () => {
      const messageModel = extractModelBlock(schemaContent, "Message");
      expect(messageModel).toMatch(/role\s+String/);
    });

    it("contentフィールドがString型であること", () => {
      const messageModel = extractModelBlock(schemaContent, "Message");
      expect(messageModel).toMatch(/content\s+String/);
    });

    it("createdAtフィールドがDateTime型でデフォルト値now()が設定されていること", () => {
      const messageModel = extractModelBlock(schemaContent, "Message");
      expect(messageModel).toMatch(
        /createdAt\s+DateTime\s+@default\(now\(\)\)/
      );
    });

    it("conversationIdフィールドがString型の外部キーであること", () => {
      const messageModel = extractModelBlock(schemaContent, "Message");
      expect(messageModel).toMatch(/conversationId\s+String/);
    });

    it("Conversationへのリレーションが定義されていること", () => {
      const messageModel = extractModelBlock(schemaContent, "Message");
      expect(messageModel).toContain("@relation");
      expect(messageModel).toContain("fields: [conversationId]");
      expect(messageModel).toContain("references: [id]");
    });
  });

  describe("マイグレーションSQLの検証", () => {
    it("MessageテーブルのCREATE TABLEが存在すること", () => {
      expect(migrationSqlContent).toContain('CREATE TABLE "Message"');
    });

    it("idカラムがTEXT型のPRIMARY KEYであること", () => {
      expect(migrationSqlContent).toContain(
        'CONSTRAINT "Message_pkey" PRIMARY KEY ("id")'
      );
    });

    it("roleカラムがTEXT NOT NULLであること", () => {
      expect(migrationSqlContent).toContain('"role" TEXT NOT NULL');
    });

    it("contentカラムがTEXT NOT NULLであること", () => {
      expect(migrationSqlContent).toContain('"content" TEXT NOT NULL');
    });

    it("conversationIdカラムがTEXT NOT NULLであること", () => {
      expect(migrationSqlContent).toContain('"conversationId" TEXT NOT NULL');
    });

    it("外部キー制約がConversationテーブルを参照していること", () => {
      expect(migrationSqlContent).toContain(
        'FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")'
      );
    });
  });

  describeWithDb("実DBでの動作検証", () => {
    const createdIds: string[] = [];

    afterAll(async () => {
      if (!prisma) return;
      for (const id of createdIds) {
        try {
          await prisma.conversation.delete({ where: { id } });
        } catch {
          // 既に削除済みの場合は無視
        }
      }
    });

    it("Messageに必須フィールド（id, role, content, createdAt, conversationId）が保持されること", async () => {
      const conv = await prisma!.conversation.create({
        data: { title: "Req5.2検証" },
      });
      createdIds.push(conv.id);

      const msg = await prisma!.message.create({
        data: {
          role: "user",
          content: "テストメッセージ",
          conversationId: conv.id,
        },
      });

      expect(msg.id).toBeDefined();
      expect(msg.id).toMatch(/^c[a-z0-9]{20,}/);
      expect(msg.role).toBe("user");
      expect(msg.content).toBe("テストメッセージ");
      expect(msg.createdAt).toBeInstanceOf(Date);
      expect(msg.conversationId).toBe(conv.id);
    });
  });
});

describe("Requirement 5.3: conversationIdインデックス", () => {
  describe("Prismaスキーマ定義の検証", () => {
    it("Messageモデルに@@index([conversationId])が定義されていること", () => {
      const messageModel = extractModelBlock(schemaContent, "Message");
      expect(messageModel).toContain("@@index([conversationId])");
    });
  });

  describe("マイグレーションSQLの検証", () => {
    it("conversationIdカラムにインデックスが作成されていること", () => {
      expect(migrationSqlContent).toContain(
        'CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId")'
      );
    });
  });

  describeWithDb("実DBでの動作検証", () => {
    const createdIds: string[] = [];

    afterAll(async () => {
      if (!prisma) return;
      for (const id of createdIds) {
        try {
          await prisma.conversation.delete({ where: { id } });
        } catch {
          // 既に削除済みの場合は無視
        }
      }
    });

    it("conversationIdでのメッセージ検索が正常に動作すること", async () => {
      const conv = await prisma!.conversation.create({
        data: {
          title: "インデックス検証",
          messages: {
            create: [
              { role: "user", content: "メッセージ1" },
              { role: "assistant", content: "応答1" },
              { role: "user", content: "メッセージ2" },
            ],
          },
        },
      });
      createdIds.push(conv.id);

      const messages = await prisma!.message.findMany({
        where: { conversationId: conv.id },
        orderBy: { createdAt: "asc" },
      });

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe("メッセージ1");
      expect(messages[1].content).toBe("応答1");
      expect(messages[2].content).toBe("メッセージ2");
    });
  });
});

describe("Requirement 5.4: カスケード削除制約", () => {
  describe("Prismaスキーマ定義の検証", () => {
    it("MessageのConversationリレーションにonDelete: Cascadeが設定されていること", () => {
      const messageModel = extractModelBlock(schemaContent, "Message");
      expect(messageModel).toContain("onDelete: Cascade");
    });
  });

  describe("マイグレーションSQLの検証", () => {
    it("外部キー制約にON DELETE CASCADEが設定されていること", () => {
      expect(migrationSqlContent).toContain("ON DELETE CASCADE");
    });
  });

  describeWithDb("実DBでの動作検証", () => {
    it("Conversation削除時に紐づくMessageがカスケード削除されること", async () => {
      const conv = await prisma!.conversation.create({
        data: {
          title: "カスケード削除検証",
          messages: {
            create: [
              { role: "user", content: "カスケードテスト1" },
              { role: "assistant", content: "カスケードテスト応答1" },
            ],
          },
        },
      });

      const messagesBefore = await prisma!.message.findMany({
        where: { conversationId: conv.id },
      });
      expect(messagesBefore).toHaveLength(2);

      await prisma!.conversation.delete({ where: { id: conv.id } });

      const messagesAfter = await prisma!.message.findMany({
        where: { conversationId: conv.id },
      });
      expect(messagesAfter).toHaveLength(0);
    });
  });
});

/**
 * Prismaスキーマからモデルブロックを抽出するヘルパー関数
 *
 * @param schema - Prismaスキーマファイルの全文
 * @param modelName - 抽出対象のモデル名
 * @returns モデルブロックの文字列（model宣言から閉じ括弧まで）
 */
function extractModelBlock(schema: string, modelName: string): string {
  const regex = new RegExp(`model\\s+${modelName}\\s*\\{[^}]*\\}`, "s");
  const match = schema.match(regex);
  return match ? match[0] : "";
}
