import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク2: Docker ComposeによるMinIO S3互換ストレージ環境の構築", () => {
  describe("2.1 MinIOサービスのDocker Compose定義", () => {
    it("docker-compose.yml が存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, "docker-compose.yml"))).toBe(true);
    });

    it("docker-compose.yml にMinIOサービスが定義されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("minio:");
      expect(content).toContain("minio/minio");
    });

    it("S3 APIエンドポイント（ポート9000）が公開されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("9000:9000");
    });

    it("Webコンソール（ポート9001）が公開されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("9001:9001");
    });

    it("MinIOのデータ永続化用Dockerボリュームが設定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("minio-data");
      // ボリューム定義がトップレベルに存在すること
      expect(content).toMatch(/^volumes:/m);
    });

    it("MinIOのルートユーザーとパスワードが環境変数で設定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("MINIO_ROOT_USER");
      expect(content).toContain("MINIO_ROOT_PASSWORD");
    });

    it("MinIOのコンソールアドレスが指定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("--console-address");
      expect(content).toContain(":9001");
    });
  });

  describe("2.2 デフォルトバケット自動作成の設定", () => {
    it("docker-compose.yml にinitコンテナが定義されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("minio-init");
    });

    it("initコンテナがMinIO Client(minio/mc)イメージを使用していること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("minio/mc");
    });

    it("initコンテナがMinIOサービスに依存していること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("depends_on");
    });

    it("デフォルトバケット作成コマンドが含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("mc mb");
      expect(content).toContain("default-bucket");
    });

    it("mc alias setでMinIOへの接続設定が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("mc alias set");
    });
  });
});
