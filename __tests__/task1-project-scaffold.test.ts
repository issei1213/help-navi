import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク1: Next.js + TypeScript + pnpmプロジェクトの基盤構築", () => {
  describe("1.1 Next.js App Routerの基本構成", () => {
    it("src/app ディレクトリが存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, "src/app"))).toBe(true);
    });

    it("src/app/layout.tsx が存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, "src/app/layout.tsx"))).toBe(true);
    });

    it("src/app/page.tsx が存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, "src/app/page.tsx"))).toBe(true);
    });

    it("next.config.ts が存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, "next.config.ts"))).toBe(true);
    });
  });

  describe("1.2 TypeScript設定", () => {
    it("tsconfig.json が存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, "tsconfig.json"))).toBe(true);
    });

    it("tsconfig.json が strict モードであること", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it("tsconfig.json にパスエイリアス(@/*)が設定されていること", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.paths).toHaveProperty("@/*");
      expect(tsconfig.compilerOptions.paths["@/*"]).toContain("./src/*");
    });
  });

  describe("1.4 pnpmパッケージマネージャー", () => {
    it("package.json に packageManager フィールドが定義されていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.packageManager).toBeDefined();
      expect(pkg.packageManager).toContain("pnpm");
    });
  });

  describe("1.3 開発サーバー起動スクリプト", () => {
    it("package.json に dev スクリプトが定義されていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.scripts.dev).toBeDefined();
      expect(pkg.scripts.dev).toContain("next dev");
    });

    it("package.json に build スクリプトが定義されていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.scripts.build).toBe("next build");
    });

    it("package.json に start スクリプトが定義されていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.scripts.start).toBe("next start");
    });
  });

  describe("1.5 依存関係の確認", () => {
    it("Next.js が依存関係に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.dependencies.next).toBeDefined();
    });

    it("React が依存関係に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.dependencies.react).toBeDefined();
    });

    it("TypeScript が devDependencies に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.devDependencies.typescript).toBeDefined();
    });

    it("Tailwind CSS が devDependencies に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.devDependencies.tailwindcss).toBeDefined();
    });

    it("ESLint が devDependencies に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.devDependencies.eslint).toBeDefined();
    });

    it("vitest の test スクリプトが package.json に定義されていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.scripts.test).toBeDefined();
      expect(pkg.scripts.test).toContain("vitest");
    });
  });
});
