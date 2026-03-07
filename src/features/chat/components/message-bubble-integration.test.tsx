/**
 * MessageBubble 統合テスト
 *
 * ToolInvocationPartをモック化せずに、MessageBubble → ToolInvocationPart → ToolStatusIcon → ToolDetailView
 * の統合的なレンダリングを検証する。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MessageBubble } from "./message-bubble";
import type { UIMessage } from "@ai-sdk/react";

/** MarkdownRendererのみモック化（Streamdown依存のため） */
vi.mock("./markdown-renderer", () => ({
  MarkdownRenderer: vi.fn(
    (props: { content: string; isStreaming: boolean }) => (
      <div
        data-testid="markdown-renderer"
        data-is-streaming={String(props.isStreaming)}
      >
        {props.content}
      </div>
    )
  ),
}));

describe("MessageBubble 統合テスト: ツールパーツとテキストの混在レンダリング", () => {
  afterEach(() => {
    cleanup();
  });

  it("ツールパーツ→テキストの順序で正しくレンダリングされる", () => {
    const message: UIMessage = {
      id: "msg-int-1",
      role: "assistant",
      parts: [
        {
          type: "tool-webSearch",
          toolCallId: "call-1",
          toolName: "webSearch",
          state: "output-available",
          input: { query: "TypeScript tutorial" },
          output: { results: [{ title: "Result" }] },
        } as unknown as UIMessage["parts"][number],
        { type: "text", text: "検索結果をまとめました。" },
      ],
    };

    render(
      <MessageBubble
        message={message}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // ツール呼び出しが表示される
    expect(screen.getByTestId("tool-invocation-call-1")).not.toBeNull();
    // テキストが表示される
    expect(screen.getByText("検索結果をまとめました。")).not.toBeNull();
    // ツール名がWeb検索として表示される
    expect(screen.getByText("Web検索")).not.toBeNull();
  });

  it("複数ツール呼び出しを含むメッセージがリスト表示される", () => {
    const message: UIMessage = {
      id: "msg-int-2",
      role: "assistant",
      parts: [
        {
          type: "tool-webSearch",
          toolCallId: "call-1",
          toolName: "webSearch",
          state: "output-available",
          input: { query: "React hooks" },
          output: { results: [] },
        } as unknown as UIMessage["parts"][number],
        {
          type: "tool-s3ListObjects",
          toolCallId: "call-2",
          toolName: "s3ListObjects",
          state: "output-available",
          input: { prefix: "/docs" },
          output: { objects: [] },
        } as unknown as UIMessage["parts"][number],
        { type: "text", text: "全ての処理が完了しました。" },
      ],
    };

    render(
      <MessageBubble
        message={message}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.getByTestId("tool-invocation-call-1")).not.toBeNull();
    expect(screen.getByTestId("tool-invocation-call-2")).not.toBeNull();
    expect(screen.getByText("Web検索")).not.toBeNull();
    expect(screen.getByText("ファイル一覧取得")).not.toBeNull();
    expect(screen.getByText("全ての処理が完了しました。")).not.toBeNull();
  });

  it("エラー状態のツールが赤色インジケーターで表示される", () => {
    const message: UIMessage = {
      id: "msg-int-3",
      role: "assistant",
      parts: [
        {
          type: "tool-webSearch",
          toolCallId: "call-err",
          toolName: "webSearch",
          state: "output-error",
          input: { query: "test" },
          errorText: "検索に失敗しました",
        } as unknown as UIMessage["parts"][number],
        { type: "text", text: "エラーが発生しました。" },
      ],
    };

    render(
      <MessageBubble
        message={message}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // エラー状態のツールが表示される
    const toolPart = screen.getByTestId("tool-invocation-call-err");
    expect(toolPart).not.toBeNull();

    // 赤色のアイコンが表示される
    const statusIcon = toolPart.querySelector("[data-testid='tool-status-icon']");
    expect(statusIcon).not.toBeNull();
    expect(statusIcon?.className).toContain("text-red-500");
  });

  it("完了したツールは折りたたまれ、クリックで展開できる", () => {
    const message: UIMessage = {
      id: "msg-int-4",
      role: "assistant",
      parts: [
        {
          type: "tool-webSearch",
          toolCallId: "call-expand",
          toolName: "webSearch",
          state: "output-available",
          input: { query: "test expand" },
          output: { results: ["item1"] },
        } as unknown as UIMessage["parts"][number],
      ],
    };

    render(
      <MessageBubble
        message={message}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // 初期状態: 折りたたまれている
    expect(screen.queryByTestId("tool-detail-view")).toBeNull();

    // クリックで展開
    const header = screen.getByTestId("tool-invocation-header");
    fireEvent.click(header);
    expect(screen.getByTestId("tool-detail-view")).not.toBeNull();
  });

  it("実行中のツールはデフォルトで展開されている", () => {
    const message: UIMessage = {
      id: "msg-int-5",
      role: "assistant",
      parts: [
        {
          type: "tool-webSearch",
          toolCallId: "call-running",
          toolName: "webSearch",
          state: "input-streaming",
          input: { query: "streaming" },
        } as unknown as UIMessage["parts"][number],
      ],
    };

    render(
      <MessageBubble
        message={message}
        isStreaming={true}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    // 実行中はデフォルトで展開
    expect(screen.getByTestId("tool-detail-view")).not.toBeNull();
  });

  it("テキストのみのAIメッセージは従来通りMarkdownRendererで表示される", () => {
    const message: UIMessage = {
      id: "msg-int-6",
      role: "assistant",
      parts: [{ type: "text", text: "テキストのみの応答です。" }],
    };

    render(
      <MessageBubble
        message={message}
        onCopy={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(screen.getByTestId("markdown-renderer")).not.toBeNull();
    expect(screen.getByText("テキストのみの応答です。")).not.toBeNull();
  });
});
