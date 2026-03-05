import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク10: コード品質ツールの設定", () => {
  describe("Prettier設定", () => {
    it("prettier が devDependencies に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.devDependencies.prettier).toBeDefined();
    });

    it(".prettierrc 設定ファイルが存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, ".prettierrc"))).toBe(true);
    });

    it(".prettierrc が有効なJSONであること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".prettierrc"),
        "utf-8"
      );
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe("ESLint + Prettier統合", () => {
    it("eslint-config-prettier が devDependencies に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.devDependencies["eslint-config-prettier"]).toBeDefined();
    });

    it("eslint.config.mjs にprettier設定が含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "eslint.config.mjs"),
        "utf-8"
      );
      expect(content).toContain("prettier");
    });
  });

  describe("ESLint設定", () => {
    it("eslint.config.mjs が存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, "eslint.config.mjs"))).toBe(true);
    });

    it("Next.js推奨ルールが含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "eslint.config.mjs"),
        "utf-8"
      );
      expect(content).toContain("eslint-config-next");
    });
  });

  describe("フォーマットスクリプト", () => {
    it("package.json に format スクリプトが定義されていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.scripts.format).toBeDefined();
      expect(pkg.scripts.format).toContain("prettier");
    });
  });
});
