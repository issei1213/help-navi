import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// テスト用に環境変数を動的に設定するヘルパー
function setEnvVars(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("タスク3.2: 環境変数バリデーションと警告機能", () => {
  // テスト対象のモジュールを各テストで動的にインポートする
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
    // 環境変数を元に戻す
    process.env = { ...originalEnv };
  });

  describe("validateEnv()", () => {
    it("全必須環境変数が設定されている場合、isValidがtrueであること", () => {
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

    it("ANTHROPIC_API_KEYが未設定の場合、missingRequiredに含まれること", () => {
      setEnvVars({
        S3_ENDPOINT: "http://localhost:9000",
        S3_ACCESS_KEY_ID: "minioadmin",
        S3_SECRET_ACCESS_KEY: "minioadmin",
        S3_BUCKET_NAME: "default-bucket",
      });

      const result = validateEnv();
      expect(result.isValid).toBe(false);
      expect(result.missingRequired).toContain("ANTHROPIC_API_KEY");
    });

    it("S3接続情報が未設定の場合、missingRequiredに含まれること", () => {
      setEnvVars({
        ANTHROPIC_API_KEY: "test-key",
      });

      const result = validateEnv();
      expect(result.missingRequired).toContain("S3_ENDPOINT");
      expect(result.missingRequired).toContain("S3_ACCESS_KEY_ID");
      expect(result.missingRequired).toContain("S3_SECRET_ACCESS_KEY");
      expect(result.missingRequired).toContain("S3_BUCKET_NAME");
    });

    it("ANTHROPIC_API_KEY未設定時に警告メッセージが含まれること", () => {
      const result = validateEnv();
      expect(result.warnings.some((w) => w.includes("ANTHROPIC_API_KEY"))).toBe(
        true
      );
    });

    it("S3接続情報未設定時に警告メッセージが含まれること", () => {
      setEnvVars({
        ANTHROPIC_API_KEY: "test-key",
      });
      const result = validateEnv();
      expect(result.warnings.some((w) => w.includes("S3"))).toBe(true);
    });

    it("S3_REGIONは必須ではないため、未設定でもmissingRequiredに含まれないこと", () => {
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
      expect(result.missingRequired).not.toContain("S3_REGION");
    });

    it("全環境変数が未設定の場合、isValidがfalseであること", () => {
      const result = validateEnv();
      expect(result.isValid).toBe(false);
      expect(result.missingRequired.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("logWarnings()", () => {
    it("警告がある場合、console.warnが呼ばれること", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = {
        isValid: false,
        warnings: ["テスト警告メッセージ"],
        missingRequired: ["ANTHROPIC_API_KEY"],
      };

      logWarnings(result);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("警告がない場合、console.warnが呼ばれないこと", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = {
        isValid: true,
        warnings: [],
        missingRequired: [],
      };

      logWarnings(result);
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
