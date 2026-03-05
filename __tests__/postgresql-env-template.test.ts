import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * タスク1.2: .env.exampleにPostgreSQL接続用環境変数テンプレートを追加するテスト
 *
 * 既存S3セクションとの一貫性、Docker Compose設定との整合性を検証する
 */
describe("タスク1.2: .env.example PostgreSQL環境変数テンプレート", () => {
  const envExamplePath = resolve(__dirname, "../.env.example");
  const composeFilePath = resolve(__dirname, "../docker-compose.yml");
  let envContent: string;
  let composeContent: string;

  envContent = readFileSync(envExamplePath, "utf-8");
  composeContent = readFileSync(composeFilePath, "utf-8");

  describe("PostgreSQL環境変数の定義", () => {
    it("DATABASE_URL接続文字列が定義されていること", () => {
      expect(envContent).toContain("DATABASE_URL=");
    });

    it("DATABASE_URLのデフォルト値がPostgreSQL接続文字列であること", () => {
      expect(envContent).toContain(
        "postgresql://helpnavi:helpnavi@localhost:5432/helpnavi"
      );
    });

    it("POSTGRES_HOST環境変数が定義されていること", () => {
      expect(envContent).toContain("POSTGRES_HOST=");
    });

    it("POSTGRES_PORT環境変数が定義されていること", () => {
      expect(envContent).toContain("POSTGRES_PORT=");
    });

    it("POSTGRES_USER環境変数が定義されていること", () => {
      expect(envContent).toContain("POSTGRES_USER=");
    });

    it("POSTGRES_PASSWORD環境変数が定義されていること", () => {
      expect(envContent).toContain("POSTGRES_PASSWORD=");
    });

    it("POSTGRES_DB環境変数が定義されていること", () => {
      expect(envContent).toContain("POSTGRES_DB=");
    });
  });

  describe("セクション構成とコメントスタイル", () => {
    it("PostgreSQLセクションのヘッダーコメントが存在すること", () => {
      // 既存S3セクションと同じ区切り線スタイルを確認
      expect(envContent).toContain("PostgreSQL");
    });

    it("S3セクションの後にPostgreSQLセクションが配置されていること", () => {
      const s3SectionIndex = envContent.indexOf("S3互換ストレージ設定");
      const pgSectionIndex = envContent.indexOf("PostgreSQL");
      expect(pgSectionIndex).toBeGreaterThan(s3SectionIndex);
    });

    it("セクション区切り線が既存と同じスタイルであること", () => {
      // 既存のS3セクションと同様の区切り線パターンを確認
      const lines = envContent.split("\n");
      const pgSectionStart = lines.findIndex((line) =>
        line.includes("PostgreSQL")
      );
      // PostgreSQLセクションの前に区切り線があること
      expect(pgSectionStart).toBeGreaterThan(0);
      const prevLine = lines[pgSectionStart - 1];
      expect(prevLine).toMatch(/^# -{10,}/);
    });
  });

  describe("Docker Compose設定との整合性", () => {
    it("POSTGRES_USERのデフォルト値がDocker Compose設定と一致すること", () => {
      expect(envContent).toContain("POSTGRES_USER=helpnavi");
      expect(composeContent).toContain("POSTGRES_USER: helpnavi");
    });

    it("POSTGRES_PASSWORDのデフォルト値がDocker Compose設定と一致すること", () => {
      expect(envContent).toContain("POSTGRES_PASSWORD=helpnavi");
      expect(composeContent).toContain("POSTGRES_PASSWORD: helpnavi");
    });

    it("POSTGRES_DBのデフォルト値がDocker Compose設定と一致すること", () => {
      expect(envContent).toContain("POSTGRES_DB=helpnavi");
      expect(composeContent).toContain("POSTGRES_DB: helpnavi");
    });
  });

  describe("開発デフォルト値", () => {
    it("POSTGRES_HOSTのデフォルト値がlocalhostであること", () => {
      expect(envContent).toContain("POSTGRES_HOST=localhost");
    });

    it("POSTGRES_PORTのデフォルト値が5432であること", () => {
      expect(envContent).toContain("POSTGRES_PORT=5432");
    });
  });
});
