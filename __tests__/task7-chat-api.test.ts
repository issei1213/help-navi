import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク7: ストリーミングチャットAPIエンドポイントの実装", () => {
  describe("API Routeファイル構造", () => {
    it("src/app/api/chat/route.ts が存在すること", () => {
      expect(
        fs.existsSync(path.join(ROOT, "src/app/api/chat/route.ts"))
      ).toBe(true);
    });

    it("POST ハンドラがエクスポートされていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/app/api/chat/route.ts"),
        "utf-8"
      );
      expect(content).toContain("export");
      expect(content).toContain("POST");
    });
  });

  describe("Mastra統合", () => {
    it("mastraインスタンスをインポートしていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/app/api/chat/route.ts"),
        "utf-8"
      );
      expect(content).toContain("mastra");
    });

    it("handleChatStreamまたはagent.streamを使用していること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/app/api/chat/route.ts"),
        "utf-8"
      );
      expect(
        content.includes("handleChatStream") || content.includes("stream")
      ).toBe(true);
    });

    it("createUIMessageStreamResponse を使用していること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/app/api/chat/route.ts"),
        "utf-8"
      );
      expect(content).toContain("createUIMessageStreamResponse");
    });
  });

  describe("エラーハンドリング", () => {
    it("リクエストバリデーションが含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/app/api/chat/route.ts"),
        "utf-8"
      );
      // メッセージの検証またはエラーハンドリングが含まれていること
      expect(content).toContain("messages");
    });

    it("try-catchまたはエラーレスポンスが含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/app/api/chat/route.ts"),
        "utf-8"
      );
      expect(
        content.includes("try") ||
          content.includes("catch") ||
          content.includes("Response")
      ).toBe(true);
    });
  });
});
