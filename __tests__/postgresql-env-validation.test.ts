import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * タスク3.1: PostgreSQL環境変数バリデーション追加のテスト
 *
 * - DATABASE_URLがREQUIRED_ENV_VARSに追加されていること
 * - 未設定時に警告メッセージが出力されること
 * - アプリケーション起動をブロックしないこと
 * - 既存のS3バリデーションに影響を与えないこと
 */

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

describe("タスク3.1: PostgreSQL環境変数バリデーション", () => {
  let validateEnv: () => {
    isValid: boolean;
    warnings: string[];
    missingRequired: string[];
  };
  let logWarnings: (result: {
    isValid: boolean;
    warnings: string[];
    missingRequired: string[];
  }) => void;

  const originalEnv = { ...process.env };

  beforeEach(async () => {
    // 環境変数をクリーン状態にする
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.S3_BUCKET_NAME;
    delete process.env.S3_REGION;
    delete process.env.DATABASE_URL;

    // モジュールキャッシュをクリアして再インポート
    vi.resetModules();
    const mod = await import("@/lib/env-validation");
    validateEnv = mod.validateEnv;
    logWarnings = mod.logWarnings;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("DATABASE_URLのバリデーション", () => {
    it("DATABASE_URLが未設定の場合、missingRequiredに含まれること", () => {
      setEnvVars({
        ANTHROPIC_API_KEY: "test-key",
        S3_ENDPOINT: "http://localhost:9000",
        S3_ACCESS_KEY_ID: "minioadmin",
        S3_SECRET_ACCESS_KEY: "minioadmin",
        S3_BUCKET_NAME: "default-bucket",
      });

      const result = validateEnv();
      expect(result.missingRequired).toContain("DATABASE_URL");
    });

    it("DATABASE_URLが設定されている場合、missingRequiredに含まれないこと", () => {
      setEnvVars({
        ANTHROPIC_API_KEY: "test-key",
        S3_ENDPOINT: "http://localhost:9000",
        S3_ACCESS_KEY_ID: "minioadmin",
        S3_SECRET_ACCESS_KEY: "minioadmin",
        S3_BUCKET_NAME: "default-bucket",
        DATABASE_URL:
          "postgresql://helpnavi:helpnavi@localhost:5432/helpnavi",
      });

      const result = validateEnv();
      expect(result.missingRequired).not.toContain("DATABASE_URL");
    });

    it("DATABASE_URL未設定時に警告メッセージが出力されること", () => {
      setEnvVars({
        ANTHROPIC_API_KEY: "test-key",
        S3_ENDPOINT: "http://localhost:9000",
        S3_ACCESS_KEY_ID: "minioadmin",
        S3_SECRET_ACCESS_KEY: "minioadmin",
        S3_BUCKET_NAME: "default-bucket",
      });

      const result = validateEnv();
      expect(
        result.warnings.some((w) => w.includes("DATABASE_URL"))
      ).toBe(true);
    });

    it("全環境変数が設定されている場合、isValidがtrueであること", () => {
      setEnvVars({
        ANTHROPIC_API_KEY: "test-key",
        S3_ENDPOINT: "http://localhost:9000",
        S3_ACCESS_KEY_ID: "minioadmin",
        S3_SECRET_ACCESS_KEY: "minioadmin",
        S3_BUCKET_NAME: "default-bucket",
        DATABASE_URL:
          "postgresql://helpnavi:helpnavi@localhost:5432/helpnavi",
      });

      const result = validateEnv();
      expect(result.isValid).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
    });
  });

  describe("既存バリデーションとの互換性", () => {
    it("S3環境変数のバリデーションが引き続き動作すること", () => {
      setEnvVars({
        ANTHROPIC_API_KEY: "test-key",
        DATABASE_URL:
          "postgresql://helpnavi:helpnavi@localhost:5432/helpnavi",
      });

      const result = validateEnv();
      expect(result.missingRequired).toContain("S3_ENDPOINT");
      expect(result.missingRequired).toContain("S3_ACCESS_KEY_ID");
      expect(result.missingRequired).toContain("S3_SECRET_ACCESS_KEY");
      expect(result.missingRequired).toContain("S3_BUCKET_NAME");
    });

    it("ANTHROPIC_API_KEYのバリデーションが引き続き動作すること", () => {
      setEnvVars({
        S3_ENDPOINT: "http://localhost:9000",
        S3_ACCESS_KEY_ID: "minioadmin",
        S3_SECRET_ACCESS_KEY: "minioadmin",
        S3_BUCKET_NAME: "default-bucket",
        DATABASE_URL:
          "postgresql://helpnavi:helpnavi@localhost:5432/helpnavi",
      });

      const result = validateEnv();
      expect(result.missingRequired).toContain("ANTHROPIC_API_KEY");
    });
  });

  describe("起動非ブロック", () => {
    it("DATABASE_URL未設定でもvalidateEnvが例外をスローしないこと", () => {
      expect(() => validateEnv()).not.toThrow();
    });

    it("全環境変数が未設定でもvalidateEnvが例外をスローしないこと", () => {
      expect(() => validateEnv()).not.toThrow();
    });

    it("logWarningsがconsole.warnのみを使用し例外をスローしないこと", () => {
      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = validateEnv();
      expect(() => logWarnings(result)).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
