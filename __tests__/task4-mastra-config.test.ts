import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク4: Mastraフレームワークの初期化とサーバーサイド統合", () => {
  describe("Mastra依存関係の確認", () => {
    it("@mastra/core が依存関係に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.dependencies["@mastra/core"]).toBeDefined();
    });

    it("@mastra/ai-sdk が依存関係に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.dependencies["@mastra/ai-sdk"]).toBeDefined();
    });

    it("@ai-sdk/react が依存関係に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.dependencies["@ai-sdk/react"]).toBeDefined();
    });

    it("ai パッケージが依存関係に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.dependencies["ai"]).toBeDefined();
    });
  });

  describe("Mastra初期化モジュール", () => {
    it("src/mastra/index.ts が存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, "src/mastra/index.ts"))).toBe(true);
    });

    it("src/mastra/index.ts がMastraクラスをインポートしていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/index.ts"),
        "utf-8"
      );
      expect(content).toContain("Mastra");
      expect(content).toContain("@mastra/core");
    });

    it("src/mastra/index.ts がmastraインスタンスをエクスポートしていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/index.ts"),
        "utf-8"
      );
      expect(content).toMatch(/export\s/);
      expect(content).toContain("mastra");
    });
  });

  describe("next.config.ts の設定", () => {
    it("next.config.ts に serverExternalPackages が設定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "next.config.ts"),
        "utf-8"
      );
      expect(content).toContain("serverExternalPackages");
    });

    it("next.config.ts に @mastra が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "next.config.ts"),
        "utf-8"
      );
      expect(content).toContain("@mastra");
    });
  });

  describe("Mastra初期化時の環境変数バリデーション", () => {
    it("src/mastra/index.ts で環境変数バリデーションが呼び出されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/index.ts"),
        "utf-8"
      );
      expect(content).toContain("validateEnv");
    });
  });
});
