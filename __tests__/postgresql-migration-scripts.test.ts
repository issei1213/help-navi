import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * タスク3.2: Prismaマイグレーション操作用npmスクリプト定義のテスト
 *
 * package.jsonに必要なdb:*スクリプトが正しく定義されていることを検証する
 */
describe("タスク3.2: Prismaマイグレーション用npmスクリプト", () => {
  const packageJsonPath = resolve(__dirname, "../package.json");
  let packageJson: Record<string, unknown>;
  let scripts: Record<string, string>;

  packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  scripts = packageJson.scripts as Record<string, string>;

  describe("npmスクリプトの定義", () => {
    it("db:migrate:devスクリプトが定義されていること", () => {
      expect(scripts["db:migrate:dev"]).toBeDefined();
    });

    it("db:migrate:devがprisma migrate devコマンドを実行すること", () => {
      expect(scripts["db:migrate:dev"]).toContain("prisma migrate dev");
    });

    it("db:migrate:deployスクリプトが定義されていること", () => {
      expect(scripts["db:migrate:deploy"]).toBeDefined();
    });

    it("db:migrate:deployがprisma migrate deployコマンドを実行すること", () => {
      expect(scripts["db:migrate:deploy"]).toContain(
        "prisma migrate deploy"
      );
    });

    it("db:generateスクリプトが定義されていること", () => {
      expect(scripts["db:generate"]).toBeDefined();
    });

    it("db:generateがprisma generateコマンドを実行すること", () => {
      expect(scripts["db:generate"]).toContain("prisma generate");
    });

    it("db:studioスクリプトが定義されていること", () => {
      expect(scripts["db:studio"]).toBeDefined();
    });

    it("db:studioがprisma studioコマンドを実行すること", () => {
      expect(scripts["db:studio"]).toContain("prisma studio");
    });
  });

  describe("既存スクリプトとの共存", () => {
    it("既存のdevスクリプトが維持されていること", () => {
      expect(scripts["dev"]).toBeDefined();
      expect(scripts["dev"]).toContain("docker compose");
    });

    it("既存のbuildスクリプトが維持されていること", () => {
      expect(scripts["build"]).toBeDefined();
    });

    it("既存のtestスクリプトが維持されていること", () => {
      expect(scripts["test"]).toBeDefined();
    });

    it("既存のformat:checkスクリプトが維持されていること", () => {
      expect(scripts["format:check"]).toBeDefined();
    });
  });
});
