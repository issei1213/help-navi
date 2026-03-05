import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク5: Claude API連携のサンプルエージェント定義", () => {
  describe("エージェント定義ファイル", () => {
    it("src/mastra/agents/sample-agent.ts が存在すること", () => {
      expect(
        fs.existsSync(path.join(ROOT, "src/mastra/agents/sample-agent.ts"))
      ).toBe(true);
    });

    it("Agentクラスをインポートしていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/agents/sample-agent.ts"),
        "utf-8"
      );
      expect(content).toContain("Agent");
      expect(content).toContain("@mastra/core/agent");
    });

    it("sampleAgent がエクスポートされていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/agents/sample-agent.ts"),
        "utf-8"
      );
      expect(content).toContain("export");
      expect(content).toContain("sampleAgent");
    });

    it("AnthropicモデルプロバイダーとしてClaudeが設定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/agents/sample-agent.ts"),
        "utf-8"
      );
      // Anthropicプロバイダーの設定を確認
      expect(content).toContain("ANTHROPIC");
      expect(content).toContain("claude");
    });

    it("システムプロンプト（instructions）が設定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/agents/sample-agent.ts"),
        "utf-8"
      );
      expect(content).toContain("instructions");
    });

    it("エージェント名が設定されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/agents/sample-agent.ts"),
        "utf-8"
      );
      expect(content).toContain("name:");
    });
  });

  describe("Mastraへのエージェント登録", () => {
    it("src/mastra/index.ts でsampleAgentがインポートされていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/index.ts"),
        "utf-8"
      );
      expect(content).toContain("sampleAgent");
    });

    it("src/mastra/index.ts でagentsオブジェクトにエージェントが登録されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/mastra/index.ts"),
        "utf-8"
      );
      expect(content).toContain("agents:");
      expect(content).toContain("sample-agent");
    });
  });
});
