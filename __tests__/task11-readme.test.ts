import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク11: READMEドキュメントの作成", () => {
  it("README.md が存在すること", () => {
    expect(fs.existsSync(path.join(ROOT, "README.md"))).toBe(true);
  });

  describe("前提条件", () => {
    it("Node.js の前提条件が記載されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "README.md"),
        "utf-8"
      );
      expect(content).toContain("Node.js");
    });

    it("pnpm の前提条件が記載されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "README.md"),
        "utf-8"
      );
      expect(content).toContain("pnpm");
    });

    it("Docker の前提条件が記載されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "README.md"),
        "utf-8"
      );
      expect(content).toContain("Docker");
    });
  });

  describe("インストール手順", () => {
    it("pnpm install コマンドが記載されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "README.md"),
        "utf-8"
      );
      expect(content).toContain("pnpm install");
    });
  });

  describe("MinIO起動手順", () => {
    it("docker compose up コマンドが記載されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "README.md"),
        "utf-8"
      );
      expect(content).toContain("docker compose up");
    });

    it("MinIO Webコンソールアクセス情報が記載されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "README.md"),
        "utf-8"
      );
      expect(content).toContain("9001");
      expect(content).toContain("localhost");
    });
  });

  describe("環境変数設定手順", () => {
    it(".env.example から .env.local へのコピー手順が記載されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "README.md"),
        "utf-8"
      );
      expect(content).toContain(".env.example");
      expect(content).toContain(".env.local");
    });

    it("ANTHROPIC_API_KEY の設定について記載されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "README.md"),
        "utf-8"
      );
      expect(content).toContain("ANTHROPIC_API_KEY");
    });
  });

  describe("Next.js起動手順", () => {
    it("pnpm dev コマンドが記載されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "README.md"),
        "utf-8"
      );
      expect(content).toContain("pnpm dev");
    });
  });

  describe("トラブルシューティング", () => {
    it("トラブルシューティングセクションが存在すること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "README.md"),
        "utf-8"
      );
      expect(content.toLowerCase()).toContain("トラブルシューティング");
    });
  });
});
