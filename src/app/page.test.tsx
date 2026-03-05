/**
 * page.tsx のテスト
 *
 * ChatContainer コンポーネントが正しく呼び出されることを確認する。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import Home from "./page";

/** ChatContainer をモックして正しく呼び出されることを確認 */
vi.mock("@/features/chat/components/chat-container", () => ({
  ChatContainer: () => (
    <div data-testid="chat-container">ChatContainer モック</div>
  ),
}));

describe("Home (page.tsx)", () => {
  afterEach(() => {
    cleanup();
  });

  it("ChatContainer をレンダリングする", () => {
    const { container } = render(<Home />);

    const chatContainer = container.querySelector(
      '[data-testid="chat-container"]'
    );
    expect(chatContainer).toBeTruthy();
  });

  it("古い Chat コンポーネントを使用していない", () => {
    const { container } = render(<Home />);

    // 旧UIの要素が含まれていないことを確認
    expect(container.querySelector("header")).toBeNull();
    expect(
      container.textContent?.includes("Mastra + Claude AI エージェント")
    ).toBe(false);
  });
});
