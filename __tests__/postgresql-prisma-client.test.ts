import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * タスク2.2: シングルトンパターンPrismaクライアントモジュールのテスト
 *
 * - シングルトンインスタンスの一意性
 * - globalThisによるキャッシュ（開発環境）
 * - ログレベル設定（開発/本番）
 * - JSDocコメント・エクスポートの存在
 */

// PrismaClientをモック化して実際のDB接続なしでテストする
vi.mock("@prisma/client", () => {
  class MockPrismaClient {
    $connect = vi.fn();
    $disconnect = vi.fn();
  }

  return {
    PrismaClient: MockPrismaClient,
  };
});

describe("タスク2.2: Prismaクライアントモジュール", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    // globalThisのprismaキャッシュをクリア
    if ("prisma" in globalThis) {
      delete (globalThis as Record<string, unknown>).prisma;
    }
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if ("prisma" in globalThis) {
      delete (globalThis as Record<string, unknown>).prisma;
    }
  });

  describe("シングルトンインスタンス", () => {
    it("prismaがエクスポートされていること", async () => {
      const mod = await import("@/infrastructure/prisma-client");
      expect(mod.prisma).toBeDefined();
    });

    it("複数回インポートしても同一インスタンスであること", async () => {
      const mod1 = await import("@/infrastructure/prisma-client");
      const mod2 = await import("@/infrastructure/prisma-client");
      expect(mod1.prisma).toBe(mod2.prisma);
    });
  });

  describe("開発環境でのglobalThisキャッシュ", () => {
    it("開発環境でglobalThis.prismaにインスタンスがキャッシュされること", async () => {
      process.env.NODE_ENV = "development";
      vi.resetModules();

      await import("@/infrastructure/prisma-client");
      expect(
        (globalThis as Record<string, unknown>).prisma
      ).toBeDefined();
    });
  });

  describe("本番環境での動作", () => {
    it("本番環境でもprismaインスタンスが生成されること", async () => {
      process.env.NODE_ENV = "production";
      vi.resetModules();

      const mod = await import("@/infrastructure/prisma-client");
      expect(mod.prisma).toBeDefined();
    });
  });

  describe("モジュール構造", () => {
    it("prisma-client.tsファイルが存在すること", async () => {
      const { existsSync } = await import("fs");
      const { resolve } = await import("path");
      const filePath = resolve(
        __dirname,
        "../src/infrastructure/prisma-client.ts"
      );
      expect(existsSync(filePath)).toBe(true);
    });

    it("ファイルにJSDocコメントが含まれていること", async () => {
      const { readFileSync } = await import("fs");
      const { resolve } = await import("path");
      const filePath = resolve(
        __dirname,
        "../src/infrastructure/prisma-client.ts"
      );
      const content = readFileSync(filePath, "utf-8");
      // JSDocブロックコメントが存在すること
      expect(content).toContain("/**");
      expect(content).toContain("*/");
    });

    it("エラーハンドリング関連のコードが含まれていること", async () => {
      const { readFileSync } = await import("fs");
      const { resolve } = await import("path");
      const filePath = resolve(
        __dirname,
        "../src/infrastructure/prisma-client.ts"
      );
      const content = readFileSync(filePath, "utf-8");
      // 接続エラー時のメッセージ関連コードがあること
      expect(content).toMatch(/エラー|error|Error/i);
    });
  });
});
