import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("タスク9: チャットUIサンプルの実装", () => {
  describe("チャットページ", () => {
    it("src/app/page.tsx が存在すること", () => {
      expect(fs.existsSync(path.join(ROOT, "src/app/page.tsx"))).toBe(true);
    });

    it("'use client' ディレクティブが含まれていること（クライアントコンポーネント）", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/app/page.tsx"),
        "utf-8"
      );
      expect(content).toContain("use client");
    });
  });

  describe("チャットコンポーネント", () => {
    it("src/components/chat.tsx が存在すること", () => {
      expect(
        fs.existsSync(path.join(ROOT, "src/components/chat.tsx"))
      ).toBe(true);
    });

    it("useChat フックをインポートしていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/components/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("useChat");
      expect(content).toContain("@ai-sdk/react");
    });

    it("/api/chat エンドポイントに接続していること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/components/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("/api/chat");
    });

    it("メッセージの送受信表示が実装されていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/components/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("messages");
    });

    it("入力フォームが含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/components/chat.tsx"),
        "utf-8"
      );
      // formまたはinput要素が含まれていること
      expect(
        content.includes("<form") || content.includes("<input")
      ).toBe(true);
    });

    it("'use client' ディレクティブが含まれていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/components/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("use client");
    });
  });

  describe("Server Action呼び出しUI", () => {
    it("Server Action呼び出し用コンポーネントが存在すること", () => {
      expect(
        fs.existsSync(path.join(ROOT, "src/components/agent-action.tsx"))
      ).toBe(true);
    });

    it("callAgent Server Actionをインポートしていること", () => {
      const content = fs.readFileSync(
        path.join(ROOT, "src/components/agent-action.tsx"),
        "utf-8"
      );
      expect(content).toContain("callAgent");
    });
  });
});
