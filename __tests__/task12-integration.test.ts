import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク12: 統合動作確認", () => {
  describe("プロジェクト構成の整合性", () => {
    it("全必須ファイルが存在すること", () => {
      const requiredFiles = [
        "package.json",
        "tsconfig.json",
        "next.config.ts",
        "docker-compose.yml",
        ".env.example",
        ".gitignore",
        ".prettierrc",
        "eslint.config.mjs",
        "README.md",
        "vitest.config.ts",
        "src/app/page.tsx",
        "src/app/layout.tsx",
        "src/app/api/chat/route.ts",
        "src/app/actions/agent.ts",
        "src/components/chat.tsx",
        "src/components/agent-action.tsx",
        "src/mastra/index.ts",
        "src/mastra/agents/chat-agent.ts",
        "src/mastra/tools/s3.ts",
        "src/lib/env-validation.ts",
      ];

      for (const file of requiredFiles) {
        expect(
          fs.existsSync(path.join(ROOT, file)),
          `${file} が存在すること`
        ).toBe(true);
      }
    });
  });

  describe("依存関係の整合性", () => {
    it("全必須パッケージが package.json に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );

      // 本番依存関係
      const requiredDeps = [
        "next",
        "react",
        "react-dom",
        "@mastra/core",
        "@mastra/ai-sdk",
        "@ai-sdk/react",
        "ai",
        "zod",
        "@aws-sdk/client-s3",
      ];

      for (const dep of requiredDeps) {
        expect(
          pkg.dependencies[dep],
          `${dep} が dependencies に含まれていること`
        ).toBeDefined();
      }

      // 開発依存関係
      const requiredDevDeps = [
        "typescript",
        "eslint",
        "tailwindcss",
        "prettier",
        "eslint-config-prettier",
        "vitest",
      ];

      for (const dep of requiredDevDeps) {
        expect(
          pkg.devDependencies[dep],
          `${dep} が devDependencies に含まれていること`
        ).toBeDefined();
      }
    });
  });

  describe("全スクリプトの定義", () => {
    it("全必須スクリプトが package.json に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );

      const requiredScripts = [
        "dev",
        "build",
        "start",
        "lint",
        "test",
        "format",
      ];

      for (const script of requiredScripts) {
        expect(
          pkg.scripts[script],
          `${script} スクリプトが定義されていること`
        ).toBeDefined();
      }
    });
  });

  describe("Docker Compose構成の整合性", () => {
    it("docker-compose.yml にMinIOとinitコンテナが含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "docker-compose.yml"),
        "utf-8"
      );
      expect(content).toContain("minio:");
      expect(content).toContain("minio-init:");
      expect(content).toContain("minio-data:");
    });
  });

  describe("環境変数バリデーションの統合テスト", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      // 環境変数をクリーン状態にする
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.S3_ENDPOINT;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
      delete process.env.S3_BUCKET_NAME;
      delete process.env.S3_REGION;
      delete process.env.DATABASE_URL;
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("環境変数未設定時に適切な警告が生成されること", async () => {
      vi.resetModules();
      const { validateEnv, logWarnings } = await import(
        "@/lib/env-validation"
      );

      const result = validateEnv();

      // isValidがfalseであること
      expect(result.isValid).toBe(false);

      // ANTHROPIC_API_KEYの警告が含まれること
      expect(
        result.warnings.some((w) => w.includes("ANTHROPIC_API_KEY"))
      ).toBe(true);

      // S3関連の警告が含まれること
      expect(result.warnings.some((w) => w.includes("S3"))).toBe(true);

      // logWarningsが正常に動作すること
      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      logWarnings(result);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("全環境変数設定時にisValidがtrueであること", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      process.env.S3_ENDPOINT = "http://localhost:9000";
      process.env.S3_ACCESS_KEY_ID = "minioadmin";
      process.env.S3_SECRET_ACCESS_KEY = "minioadmin";
      process.env.S3_BUCKET_NAME = "default-bucket";
      process.env.DATABASE_URL =
        "postgresql://helpnavi:helpnavi@localhost:5432/helpnavi";

      vi.resetModules();
      const { validateEnv } = await import("@/lib/env-validation");

      const result = validateEnv();
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("Gitセキュリティの整合性", () => {
    it(".gitignore に環境ファイルの除外パターンが含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, ".gitignore"),
        "utf-8"
      );
      // .env* パターンが含まれていること
      expect(content.includes(".env")).toBe(true);
    });
  });

  describe("Mastra設定の整合性", () => {
    it("next.config.ts にserverExternalPackagesが設定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "next.config.ts"),
        "utf-8"
      );
      expect(content).toContain("serverExternalPackages");
      expect(content).toContain("@mastra");
    });

    it("エージェントがMastraインスタンスに登録されていること", () => {
      const mastraContent = fs.readFileSync(
        path.join(ROOT, "src/mastra/index.ts"),
        "utf-8"
      );
      expect(mastraContent).toContain("agents:");
      expect(mastraContent).toContain("chat-agent");
      expect(mastraContent).toContain("chatAgent");
    });

    it("エージェントにS3ツールが統合されていること", () => {
      const agentContent = fs.readFileSync(
        path.join(ROOT, "src/mastra/agents/chat-agent.ts"),
        "utf-8"
      );
      expect(agentContent).toContain("tools");
      expect(agentContent).toContain("s3Tools");
    });
  });

  describe("API/UIレイヤーの整合性", () => {
    it("チャットAPIがmastraインスタンスを使用していること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/app/api/chat/route.ts"),
        "utf-8"
      );
      expect(content).toContain("mastra");
      expect(content).toContain("chat-agent");
    });

    it("Server Actionがmastraインスタンスを使用していること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/app/actions/agent.ts"),
        "utf-8"
      );
      expect(content).toContain("mastra");
      expect(content).toContain("chat-agent");
    });

    it("チャットUIが/api/chatエンドポイントに接続していること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/components/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/chat");
    });

    it("Server ActionコンポーネントがcallAgentを使用していること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/components/agent-action.tsx"),
        "utf-8"
      );
      expect(content).toContain("callAgent");
    });
  });
});
