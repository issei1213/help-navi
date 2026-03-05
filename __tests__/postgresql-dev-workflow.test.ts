import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * タスク4.1: pnpm devによるPostgreSQL自動起動・停止の設定検証テスト
 *
 * Docker Compose構成が正しく、pnpm devで全サービスが起動する設定であることを検証する
 * （実際のDocker起動テストは手動検証で行う）
 */
describe("タスク4.1: 開発ワークフロー統合設定の検証", () => {
  const rootDir = resolve(__dirname, "..");

  describe("pnpm devスクリプトの設定", () => {
    const packageJsonPath = resolve(rootDir, "package.json");
    let scripts: Record<string, string>;

    scripts = (
      JSON.parse(readFileSync(packageJsonPath, "utf-8")) as Record<
        string,
        unknown
      >
    ).scripts as Record<string, string>;

    it("devスクリプトがdocker compose upを含むこと", () => {
      expect(scripts.dev).toContain("docker compose up");
    });

    it("devスクリプトがdocker compose downによる停止処理を含むこと", () => {
      expect(scripts.dev).toContain("docker compose down");
    });

    it("devスクリプトがtrapによるシグナルハンドリングを含むこと", () => {
      expect(scripts.dev).toContain("trap");
    });
  });

  describe("Docker Compose全体構成", () => {
    const composeFilePath = resolve(rootDir, "docker-compose.yml");
    let composeContent: string;

    composeContent = readFileSync(composeFilePath, "utf-8");

    it("MinIOサービスが定義されていること", () => {
      expect(composeContent).toContain("minio:");
    });

    it("PostgreSQLサービスが定義されていること", () => {
      expect(composeContent).toContain("postgres:");
    });

    it("MinIOとPostgreSQLのポートが競合しないこと", () => {
      // MinIO: 9000, 9001
      // PostgreSQL: 5432
      // Next.js: 3000（Docker Composeには含まれない）
      expect(composeContent).toMatch(/"9000:9000"/);
      expect(composeContent).toMatch(/"9001:9001"/);
      expect(composeContent).toMatch(/"5432:5432"/);
    });

    it("PostgreSQLが独立したサービスとして定義されていること（depends_onなし）", () => {
      // PostgreSQLはMinIOに依存しないことを確認
      // postgres:セクション内にdepends_onがないことを確認する
      const lines = composeContent.split("\n");
      const postgresStart = lines.findIndex((l) =>
        l.match(/^\s{2}postgres:/)
      );
      // postgresセクションの範囲を特定（次のトップレベルセクションまで）
      let postgresEnd = lines.length;
      for (let i = postgresStart + 1; i < lines.length; i++) {
        if (lines[i].match(/^\s{2}\w/) || lines[i].match(/^[a-z]/)) {
          postgresEnd = i;
          break;
        }
      }
      const postgresSection = lines
        .slice(postgresStart, postgresEnd)
        .join("\n");
      expect(postgresSection).not.toContain("depends_on");
    });
  });

  describe("環境変数テンプレートの完全性", () => {
    const envExamplePath = resolve(rootDir, ".env.example");
    let envContent: string;

    envContent = readFileSync(envExamplePath, "utf-8");

    it("S3接続情報が定義されていること", () => {
      expect(envContent).toContain("S3_ENDPOINT=");
      expect(envContent).toContain("S3_ACCESS_KEY_ID=");
      expect(envContent).toContain("S3_SECRET_ACCESS_KEY=");
      expect(envContent).toContain("S3_BUCKET_NAME=");
    });

    it("PostgreSQL接続情報が定義されていること", () => {
      expect(envContent).toContain("DATABASE_URL=");
      expect(envContent).toContain("POSTGRES_HOST=");
      expect(envContent).toContain("POSTGRES_PORT=");
      expect(envContent).toContain("POSTGRES_USER=");
      expect(envContent).toContain("POSTGRES_PASSWORD=");
      expect(envContent).toContain("POSTGRES_DB=");
    });

    it("Claude API設定が定義されていること", () => {
      expect(envContent).toContain("ANTHROPIC_API_KEY=");
    });
  });
});
