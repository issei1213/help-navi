import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * タスク4.2: 受入基準に基づく機能検証テスト
 *
 * 環境変数バリデーション（Req 4.1, 4.2, 4.3）と
 * Prismaクライアントのシングルトン一意性（Req 3.5）を包括的に検証する
 */

// PrismaClientをモック化
vi.mock("@prisma/client", () => {
  class MockPrismaClient {
    $connect = vi.fn();
    $disconnect = vi.fn();
  }
  return { PrismaClient: MockPrismaClient };
});

/** テスト用に環境変数を動的に設定するヘルパー */
function setEnvVars(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("タスク4.2: 受入基準に基づく機能検証", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    if ("prisma" in globalThis) {
      delete (globalThis as Record<string, unknown>).prisma;
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if ("prisma" in globalThis) {
      delete (globalThis as Record<string, unknown>).prisma;
    }
  });

  describe("Req 4.1: PostgreSQL環境変数バリデーション", () => {
    it("DATABASE_URLが検証対象に含まれていること", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.S3_ENDPOINT;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
      delete process.env.S3_BUCKET_NAME;
      delete process.env.DATABASE_URL;

      const { validateEnv } = await import("@/lib/env-validation");
      const result = validateEnv();
      expect(result.missingRequired).toContain("DATABASE_URL");
    });
  });

  describe("Req 4.2: 未設定時の警告メッセージ", () => {
    it("DATABASE_URL未設定時にコンソール警告が出力されること", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.S3_ENDPOINT;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
      delete process.env.S3_BUCKET_NAME;
      delete process.env.DATABASE_URL;

      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const { validateEnv, logWarnings } = await import(
        "@/lib/env-validation"
      );
      const result = validateEnv();
      logWarnings(result);

      // DATABASE_URLに関する警告が出力されていること
      expect(
        consoleSpy.mock.calls.some((args) =>
          args.some(
            (arg) =>
              typeof arg === "string" && arg.includes("DATABASE_URL")
          )
        )
      ).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe("Req 4.3: 起動非ブロック", () => {
    it("全環境変数が未設定でもvalidateEnvが例外をスローしないこと", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.S3_ENDPOINT;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
      delete process.env.S3_BUCKET_NAME;
      delete process.env.DATABASE_URL;

      const { validateEnv } = await import("@/lib/env-validation");
      expect(() => validateEnv()).not.toThrow();
    });

    it("validateEnvがprocess.exitを呼び出さないこと", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation((() => {}) as never);

      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.S3_ENDPOINT;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
      delete process.env.S3_BUCKET_NAME;
      delete process.env.DATABASE_URL;

      const { validateEnv } = await import("@/lib/env-validation");
      validateEnv();

      expect(exitSpy).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });
  });

  describe("Req 3.5: Prismaクライアントのシングルトン一意性", () => {
    it("同一モジュールからのインポートで同一インスタンスが返されること", async () => {
      process.env.NODE_ENV = "development";

      const mod1 = await import("@/infrastructure/prisma-client");
      const mod2 = await import("@/infrastructure/prisma-client");
      expect(mod1.prisma).toBe(mod2.prisma);
    });

    it("globalThisにキャッシュされたインスタンスが再利用されること", async () => {
      process.env.NODE_ENV = "development";

      const mod = await import("@/infrastructure/prisma-client");
      const globalPrisma = (globalThis as Record<string, unknown>)
        .prisma;

      expect(mod.prisma).toBe(globalPrisma);
    });
  });

  describe("全体構成の整合性", () => {
    it("prisma/schema.prismaが存在し、PostgreSQLプロバイダーが設定されていること", () => {
      const schemaPath = resolve(__dirname, "../prisma/schema.prisma");
      expect(existsSync(schemaPath)).toBe(true);

      const content = readFileSync(schemaPath, "utf-8");
      expect(content).toContain('provider = "postgresql"');
      expect(content).toContain('env("DATABASE_URL")');
    });

    it("src/infrastructure/prisma-client.tsが存在すること", () => {
      const clientPath = resolve(
        __dirname,
        "../src/infrastructure/prisma-client.ts"
      );
      expect(existsSync(clientPath)).toBe(true);
    });

    it("docker-compose.ymlにPostgreSQLサービスが定義されていること", () => {
      const composePath = resolve(__dirname, "../docker-compose.yml");
      const content = readFileSync(composePath, "utf-8");
      expect(content).toContain("postgres:");
      expect(content).toContain("postgres:17");
    });

    it(".env.exampleにDATABASE_URLが定義されていること", () => {
      const envPath = resolve(__dirname, "../.env.example");
      const content = readFileSync(envPath, "utf-8");
      expect(content).toContain("DATABASE_URL=");
    });

    it("package.jsonにdb:*スクリプトが定義されていること", () => {
      const pkgPath = resolve(__dirname, "../package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts["db:migrate:dev"]).toBeDefined();
      expect(scripts["db:migrate:deploy"]).toBeDefined();
      expect(scripts["db:generate"]).toBeDefined();
      expect(scripts["db:studio"]).toBeDefined();
    });
  });
});
