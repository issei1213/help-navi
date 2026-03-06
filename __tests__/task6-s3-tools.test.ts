import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク6: S3ファイル操作ツールの定義", () => {
  describe("AWS SDK依存関係", () => {
    it("@aws-sdk/client-s3 が依存関係に含まれていること", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
      );
      expect(pkg.dependencies["@aws-sdk/client-s3"]).toBeDefined();
    });
  });

  describe("S3ツール定義ファイル", () => {
    it("src/mastra/tools/s3.ts が存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, "src/mastra/tools/s3.ts"))).toBe(
        true
      );
    });

    it("createTool をインポートしていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/tools/s3.ts"),
        "utf-8"
      );
      expect(content).toContain("createTool");
      expect(content).toContain("@mastra/core/tools");
    });

    it("@aws-sdk/client-s3 をインポートしていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/tools/s3.ts"),
        "utf-8"
      );
      expect(content).toContain("@aws-sdk/client-s3");
    });

    it("zodスキーマをインポートしていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/tools/s3.ts"),
        "utf-8"
      );
      expect(content).toContain("zod");
    });

    it("s3ListObjectsTool が定義されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/tools/s3.ts"),
        "utf-8"
      );
      expect(content).toContain("s3ListObjectsTool");
      expect(content).toContain("s3-list-objects");
    });

    it("s3GetObjectTool が定義されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/tools/s3.ts"),
        "utf-8"
      );
      expect(content).toContain("s3GetObjectTool");
      expect(content).toContain("s3-get-object");
    });

    it("s3PutObjectTool が定義されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/tools/s3.ts"),
        "utf-8"
      );
      expect(content).toContain("s3PutObjectTool");
      expect(content).toContain("s3-put-object");
    });

    it("S3クライアントにforcePathStyleが設定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/tools/s3.ts"),
        "utf-8"
      );
      expect(content).toContain("forcePathStyle");
    });

    it("inputSchemaが各ツールに定義されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/tools/s3.ts"),
        "utf-8"
      );
      const inputSchemaCount = (content.match(/inputSchema/g) || []).length;
      expect(inputSchemaCount).toBeGreaterThanOrEqual(3);
    });

    it("outputSchemaが各ツールに定義されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/tools/s3.ts"),
        "utf-8"
      );
      const outputSchemaCount = (content.match(/outputSchema/g) || []).length;
      expect(outputSchemaCount).toBeGreaterThanOrEqual(3);
    });

    it("ツール群がエクスポートされていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/tools/s3.ts"),
        "utf-8"
      );
      expect(content).toContain("export");
    });
  });

  describe("エージェントへのS3ツール統合", () => {
    it("src/mastra/agents/chat-agent.ts にS3ツールのインポートが含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/agents/chat-agent.ts"),
        "utf-8"
      );
      expect(content).toContain("tools");
    });

    it("サンプルエージェントにtoolsプロパティが設定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/agents/chat-agent.ts"),
        "utf-8"
      );
      expect(content).toContain("tools:");
    });
  });
});
