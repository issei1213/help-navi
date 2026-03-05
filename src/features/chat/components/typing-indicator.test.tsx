/**
 * TypingIndicator コンポーネントのレンダリングテスト
 *
 * タイピングインジケーターのドットアニメーション表示をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TypingIndicator } from "./typing-indicator";

describe("TypingIndicator", () => {
  afterEach(() => {
    cleanup();
  });

  it("タイピングインジケーターを表示する", () => {
    render(<TypingIndicator />);

    expect(screen.getByTestId("typing-indicator")).toBeDefined();
  });

  it("3つのアニメーションドットを表示する", () => {
    const { container } = render(<TypingIndicator />);

    const dots = container.querySelectorAll(".animate-bounce");
    expect(dots.length).toBe(3);
  });

  it("AIアバターを表示する", () => {
    render(<TypingIndicator />);

    expect(screen.getByText("AI")).toBeDefined();
  });
});
