import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * タスク1.1: Docker Compose設定にPostgreSQLサービスを定義するテスト
 *
 * docker-compose.ymlにPostgreSQL 17サービスが正しく定義されていることを検証する
 */
describe("タスク1.1: Docker Compose PostgreSQLサービス定義", () => {
  const composePath = resolve(__dirname, "../docker-compose.yml");
  let composeContent: string;

  // docker-compose.ymlの内容を読み込む
  composeContent = readFileSync(composePath, "utf-8");

  it("PostgreSQLサービスが定義されていること", () => {
    expect(composeContent).toContain("postgres:");
  });

  it("PostgreSQL 17公式イメージを使用していること", () => {
    expect(composeContent).toMatch(/image:\s*postgres:17/);
  });

  it("ホストポート5432がマッピングされていること", () => {
    // 5432:5432のポートマッピングを確認
    expect(composeContent).toMatch(/"5432:5432"/);
  });

  it("POSTGRES_USER環境変数がhelpnaviに設定されていること", () => {
    expect(composeContent).toMatch(/POSTGRES_USER:\s*helpnavi/);
  });

  it("POSTGRES_PASSWORD環境変数がhelpnaviに設定されていること", () => {
    expect(composeContent).toMatch(/POSTGRES_PASSWORD:\s*helpnavi/);
  });

  it("POSTGRES_DB環境変数がhelpnaviに設定されていること", () => {
    expect(composeContent).toMatch(/POSTGRES_DB:\s*helpnavi/);
  });

  it("postgres-dataボリュームが定義されていること", () => {
    expect(composeContent).toContain("postgres-data:");
  });

  it("PostgreSQLサービスがpostgres-dataボリュームを使用していること", () => {
    expect(composeContent).toContain("postgres-data:/var/lib/postgresql/data");
  });

  it("pg_isreadyによるヘルスチェックが定義されていること", () => {
    expect(composeContent).toContain("pg_isready");
  });

  it("ヘルスチェックのintervalが5sに設定されていること", () => {
    expect(composeContent).toMatch(/interval:\s*5s/);
  });

  it("ヘルスチェックのtimeoutが5sに設定されていること", () => {
    expect(composeContent).toMatch(/timeout:\s*5s/);
  });

  it("ヘルスチェックのretriesが5に設定されていること", () => {
    expect(composeContent).toMatch(/retries:\s*5/);
  });

  it("ヘルスチェックのstart_periodが10sに設定されていること", () => {
    expect(composeContent).toMatch(/start_period:\s*10s/);
  });

  it("既存のMinIOサービスが維持されていること", () => {
    expect(composeContent).toContain("minio:");
    expect(composeContent).toContain("minio-data:");
  });

  it("既存のminio-initサービスが維持されていること", () => {
    expect(composeContent).toContain("minio-init:");
  });
});
