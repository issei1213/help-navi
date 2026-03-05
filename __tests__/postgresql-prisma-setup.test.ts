import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * タスク2.1: Prisma ORMパッケージのインストールとスキーマファイル配置のテスト
 *
 * Prisma依存関係の追加、schema.prismaの正しい配置・設定を検証する
 */
describe("タスク2.1: Prisma ORM導入とスキーマファイル配置", () => {
  const rootDir = resolve(__dirname, "..");

  describe("Prismaパッケージの依存関係", () => {
    const packageJsonPath = resolve(rootDir, "package.json");
    let packageJson: Record<string, unknown>;

    packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    it("@prisma/clientがdependenciesに含まれていること", () => {
      const deps = packageJson.dependencies as Record<string, string>;
      expect(deps["@prisma/client"]).toBeDefined();
    });

    it("prismaがdevDependenciesに含まれていること", () => {
      const devDeps = packageJson.devDependencies as Record<string, string>;
      expect(devDeps["prisma"]).toBeDefined();
    });
  });

  describe("Prismaスキーマファイル", () => {
    const schemaPath = resolve(rootDir, "prisma/schema.prisma");

    it("prisma/schema.prismaファイルが存在すること", () => {
      expect(existsSync(schemaPath)).toBe(true);
    });

    it("datasourceプロバイダーがpostgresqlであること", () => {
      const schemaContent = readFileSync(schemaPath, "utf-8");
      expect(schemaContent).toContain('provider = "postgresql"');
    });

    it("datasourceのurlがDATABASE_URL環境変数を参照していること", () => {
      const schemaContent = readFileSync(schemaPath, "utf-8");
      expect(schemaContent).toContain('env("DATABASE_URL")');
    });

    it("generatorプロバイダーがprisma-client-jsであること", () => {
      const schemaContent = readFileSync(schemaPath, "utf-8");
      expect(schemaContent).toContain('provider = "prisma-client-js"');
    });

    it("datasource dbブロックが定義されていること", () => {
      const schemaContent = readFileSync(schemaPath, "utf-8");
      expect(schemaContent).toContain("datasource db");
    });

    it("generator clientブロックが定義されていること", () => {
      const schemaContent = readFileSync(schemaPath, "utf-8");
      expect(schemaContent).toContain("generator client");
    });
  });

  describe("prismaディレクトリ構造", () => {
    it("prisma/ディレクトリが存在すること", () => {
      expect(existsSync(resolve(rootDir, "prisma"))).toBe(true);
    });
  });
});
