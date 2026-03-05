/**
 * MessageActions コンポーネントのレンダリングテスト
 *
 * コピーボタン、リトライボタンの表示と動作をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MessageActions } from "./message-actions";

describe("MessageActions", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    content: "テストメッセージ内容",
    onCopy: vi.fn(),
    onRegenerate: vi.fn(),
  };

  it("コピーボタンを表示する", () => {
    render(<MessageActions {...defaultProps} />);

    expect(screen.getByTestId("copy-button")).toBeDefined();
  });

  it("リトライボタンを表示する", () => {
    render(<MessageActions {...defaultProps} />);

    expect(screen.getByTestId("regenerate-button")).toBeDefined();
  });

  it("コピーボタンクリック時に onCopy が呼ばれる", () => {
    // クリップボードAPIのモック
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const onCopy = vi.fn();
    render(<MessageActions {...defaultProps} onCopy={onCopy} />);

    fireEvent.click(screen.getByTestId("copy-button"));

    expect(onCopy).toHaveBeenCalledWith("テストメッセージ内容");
  });

  it("コピー後にチェックマークアイコンが表示される", () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<MessageActions {...defaultProps} />);

    fireEvent.click(screen.getByTestId("copy-button"));

    expect(screen.getByTestId("check-icon")).toBeDefined();
  });

  it("リトライボタンクリック時に onRegenerate が呼ばれる", () => {
    const onRegenerate = vi.fn();
    render(<MessageActions {...defaultProps} onRegenerate={onRegenerate} />);

    fireEvent.click(screen.getByTestId("regenerate-button"));

    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });
});
