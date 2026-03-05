/**
 * MarkdownRenderer コンポーネントのユニットテスト
 *
 * Streamdownコンポーネントが正しいpropsで描画されることを検証する。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MarkdownRenderer } from "./markdown-renderer";

/** エラーをスローさせるフラグ */
let shouldThrowError = false;

/** Streamdownモジュールをモック化 */
vi.mock("streamdown", () => {
  const MockStreamdown = vi.fn((props: Record<string, unknown>) => {
    if (shouldThrowError) {
      throw new Error("Streamdownレンダリングエラー");
    }
    return (
      <div
        data-testid="streamdown"
        data-is-animating={String(props.isAnimating)}
        data-has-plugins={String(!!props.plugins)}
        data-children={String(props.children)}
        className={String(props.className || "")}
      >
        {String(props.children)}
      </div>
    );
  });
  return { Streamdown: MockStreamdown };
});

vi.mock("@streamdown/code", () => ({
  createCodePlugin: vi.fn(() => ({
    name: "shiki",
    type: "code-highlighter",
  })),
}));

vi.mock("@streamdown/cjk", () => ({
  createCjkPlugin: vi.fn(() => ({
    name: "cjk",
    type: "cjk",
    remarkPlugins: [],
    remarkPluginsBefore: [],
    remarkPluginsAfter: [],
  })),
}));

describe("MarkdownRenderer", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    shouldThrowError = false;
  });

  it("Streamdownコンポーネントにcontentをchildrenとして渡す", () => {
    const { getByTestId } = render(
      <MarkdownRenderer content="# Hello" isStreaming={false} />
    );

    const streamdown = getByTestId("streamdown");
    expect(streamdown.getAttribute("data-children")).toBe("# Hello");
  });

  it("isStreamingがtrueの場合にisAnimating=trueがStreamdownに渡される", () => {
    const { getByTestId } = render(
      <MarkdownRenderer content="テスト" isStreaming={true} />
    );

    const streamdown = getByTestId("streamdown");
    expect(streamdown.getAttribute("data-is-animating")).toBe("true");
  });

  it("isStreamingがfalseの場合にisAnimating=falseがStreamdownに渡される", () => {
    const { getByTestId } = render(
      <MarkdownRenderer content="テスト" isStreaming={false} />
    );

    const streamdown = getByTestId("streamdown");
    expect(streamdown.getAttribute("data-is-animating")).toBe("false");
  });

  it("pluginsが渡される", () => {
    const { getByTestId } = render(
      <MarkdownRenderer content="テスト" isStreaming={false} />
    );

    const streamdown = getByTestId("streamdown");
    expect(streamdown.getAttribute("data-has-plugins")).toBe("true");
  });

  it("contentが空文字列の場合は空のレンダリング結果を返す", () => {
    const { container } = render(
      <MarkdownRenderer content="" isStreaming={false} />
    );

    // 空文字列の場合はnullを返す（何もレンダリングしない）
    expect(container.innerHTML).toBe("");
  });

  it("Streamdownにtext-smクラスが適用される", () => {
    const { getByTestId } = render(
      <MarkdownRenderer content="テスト" isStreaming={false} />
    );

    const streamdown = getByTestId("streamdown");
    expect(streamdown.className).toContain("text-sm");
  });

  it("コードブロック用のオーバーフロースタイルがラッパーに適用される", () => {
    const { container } = render(
      <MarkdownRenderer content="テスト" isStreaming={false} />
    );

    // MarkdownRendererのラッパーdivにoverflow-hiddenが設定される
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("overflow-hidden");
  });

  it("エラーバウンダリがStreamdownレンダリングエラー時にプレーンテキストへフォールバックする", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    shouldThrowError = true;

    render(
      <MarkdownRenderer content="フォールバックテキスト" isStreaming={false} />
    );

    // Streamdownの代わりにプレーンテキストが表示される
    expect(screen.getByText("フォールバックテキスト")).toBeDefined();
    expect(screen.queryByTestId("streamdown")).toBeNull();
  });
});
