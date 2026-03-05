import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク3: 環境変数管理とセキュリティ設定", () => {
  describe("3.1 環境変数テンプレートとGitセキュリティ設定", () => {
    it(".env.example ファイルが存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, ".env.example"))).toBe(true);
    });

    it(".env.example に ANTHROPIC_API_KEY が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".env.example"),
        "utf-8"
      );
      expect(content).toContain("ANTHROPIC_API_KEY");
    });

    it(".env.example に S3_ENDPOINT が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".env.example"),
        "utf-8"
      );
      expect(content).toContain("S3_ENDPOINT");
    });

    it(".env.example に S3_ACCESS_KEY_ID が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".env.example"),
        "utf-8"
      );
      expect(content).toContain("S3_ACCESS_KEY_ID");
    });

    it(".env.example に S3_SECRET_ACCESS_KEY が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".env.example"),
        "utf-8"
      );
      expect(content).toContain("S3_SECRET_ACCESS_KEY");
    });

    it(".env.example に S3_BUCKET_NAME が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".env.example"),
        "utf-8"
      );
      expect(content).toContain("S3_BUCKET_NAME");
    });

    it(".env.example に S3_REGION が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".env.example"),
        "utf-8"
      );
      expect(content).toContain("S3_REGION");
    });

    it(".env.example にMinIO開発環境用デフォルト値が設定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".env.example"),
        "utf-8"
      );
      expect(content).toContain("http://localhost:9000");
      expect(content).toContain("minioadmin");
      expect(content).toContain("default-bucket");
    });

    it(".env.example にコメントによる説明が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".env.example"),
        "utf-8"
      );
      // コメント行が存在すること
      const commentLines = content
        .split("\n")
        .filter((line) => line.startsWith("#"));
      expect(commentLines.length).toBeGreaterThan(0);
    });

    it(".env.example にNEXT_PUBLIC_プレフィックスのクライアント変数が含まれていないこと（サーバー専用変数のみ）", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".env.example"),
        "utf-8"
      );
      // ANTHROPIC_API_KEYやS3_*にはNEXT_PUBLIC_プレフィックスがないこと
      const lines = content
        .split("\n")
        .filter((l) => l.includes("ANTHROPIC_API_KEY") || l.includes("S3_"));
      for (const line of lines) {
        if (line.startsWith("#")) continue;
        expect(line).not.toContain("NEXT_PUBLIC_");
      }
    });

    it(".gitignore に .env.local が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".gitignore"),
        "utf-8"
      );
      // .env* パターンまたは .env.local が含まれていること
      expect(
        content.includes(".env.local") || content.includes(".env*")
      ).toBe(true);
    });

    it(".gitignore に .env*.local パターンが含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".gitignore"),
        "utf-8"
      );
      // .env*.local または .env* パターンが含まれていること
      expect(
        content.includes(".env*.local") || content.includes(".env*")
      ).toBe(true);
    });
  });

  describe("3.2 環境変数バリデーションと警告機能", () => {
    it("環境変数バリデーションモジュールが存在すること", () => {
      expect(
        fs.existsSync(path.join(ROOT, "src/lib/env-validation.ts"))
      ).toBe(true);
    });
  });
});
