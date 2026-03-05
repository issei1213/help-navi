/**
 * ChatInputArea コンポーネントのレンダリングテスト
 *
 * 入力エリア、送信ボタン、Enter送信、Shift+Enter改行、非活性状態をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ChatInputArea } from "./chat-input-area";

describe("ChatInputArea", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    onSendMessage: vi.fn(),
    onStop: vi.fn(),
    isStreaming: false,
    disabled: false,
  };

  it("プレースホルダーテキストを表示する", () => {
    render(<ChatInputArea {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("なんでも聞いてください");
    expect(textarea).toBeDefined();
  });

  it("送信ボタンを表示する", () => {
    render(<ChatInputArea {...defaultProps} />);

    expect(screen.getByTestId("send-button")).toBeDefined();
  });

  it("空入力時に送信ボタンが非活性になる", () => {
    render(<ChatInputArea {...defaultProps} />);

    const sendButton = screen.getByTestId("send-button");
    expect(sendButton).toHaveProperty("disabled", true);
  });

  it("テキスト入力後に送信ボタンが活性になる", () => {
    render(<ChatInputArea {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("なんでも聞いてください");
    fireEvent.change(textarea, { target: { value: "テストメッセージ" } });

    const sendButton = screen.getByTestId("send-button");
    expect(sendButton).toHaveProperty("disabled", false);
  });

  it("送信ボタンクリック時に onSendMessage が呼ばれる", () => {
    const onSendMessage = vi.fn();
    render(<ChatInputArea {...defaultProps} onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText("なんでも聞いてください");
    fireEvent.change(textarea, { target: { value: "テストメッセージ" } });

    const sendButton = screen.getByTestId("send-button");
    fireEvent.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledWith("テストメッセージ");
  });

  it("送信後にテキストエリアがクリアされる", () => {
    render(<ChatInputArea {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "なんでも聞いてください"
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "テストメッセージ" } });
    fireEvent.click(screen.getByTestId("send-button"));

    expect(textarea.value).toBe("");
  });

  it("Enterキーで送信する", () => {
    const onSendMessage = vi.fn();
    render(<ChatInputArea {...defaultProps} onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText("なんでも聞いてください");
    fireEvent.change(textarea, { target: { value: "テストメッセージ" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSendMessage).toHaveBeenCalledWith("テストメッセージ");
  });

  it("Shift+Enterで送信しない（改行用）", () => {
    const onSendMessage = vi.fn();
    render(<ChatInputArea {...defaultProps} onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText("なんでも聞いてください");
    fireEvent.change(textarea, { target: { value: "テストメッセージ" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("disabled 時に入力とボタンが非活性になる", () => {
    render(<ChatInputArea {...defaultProps} disabled={true} />);

    const textarea = screen.getByPlaceholderText(
      "なんでも聞いてください"
    ) as HTMLTextAreaElement;
    const sendButton = screen.getByTestId("send-button");

    expect(textarea.disabled).toBe(true);
    expect(sendButton).toHaveProperty("disabled", true);
  });

  it("ストリーミング中は停止ボタンを表示する", () => {
    render(<ChatInputArea {...defaultProps} isStreaming={true} />);

    expect(screen.getByTestId("stop-button")).toBeDefined();
  });

  it("停止ボタンクリック時に onStop が呼ばれる", () => {
    const onStop = vi.fn();
    render(
      <ChatInputArea {...defaultProps} isStreaming={true} onStop={onStop} />
    );

    fireEvent.click(screen.getByTestId("stop-button"));

    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
