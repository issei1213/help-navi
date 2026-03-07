/**
 * ToolInvocationPart コンポーネントのテスト
 *
 * ツール呼び出しの状態表示、展開/折りたたみ動作、不正入力の処理を検証する。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ToolInvocationPart } from "./tool-invocation-part";

/** ToolDetailViewをモック化 */
vi.mock("./tool-detail-view", () => ({
  ToolDetailView: vi.fn(
    (props: {
      input: Record<string, unknown>;
      state: string;
      output?: unknown;
      errorText?: string;
    }) => (
      <div data-testid="tool-detail-view" data-state={props.state}>
        {props.errorText && <span>{props.errorText}</span>}
      </div>
    )
  ),
}));

/** ToolStatusIconをモック化 */
vi.mock("./tool-status-icon", () => ({
  ToolStatusIcon: vi.fn((props: { state: string }) => (
    <span data-testid="tool-status-icon" data-state={props.state} />
  )),
}));

/** getToolDisplayNameをモック化 */
vi.mock("@/lib/tool-display-names", () => ({
  getToolDisplayName: vi.fn((name: string) => {
    const names: Record<string, string> = {
      webSearch: "Web検索",
    };
    return names[name] ?? name;
  }),
}));

describe("ToolInvocationPart", () => {
  afterEach(() => {
    cleanup();
  });

  it("ツール名を表示する", () => {
    render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName="webSearch"
        state="output-available"
        input={{ query: "test" }}
      />
    );

    expect(screen.getByText("Web検索")).not.toBeNull();
  });

  it("ToolStatusIconを表示する", () => {
    render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName="webSearch"
        state="input-streaming"
        input={{ query: "test" }}
      />
    );

    expect(screen.getByTestId("tool-status-icon")).not.toBeNull();
  });

  it("完了状態ではデフォルトで折りたたまれている", () => {
    render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName="webSearch"
        state="output-available"
        input={{ query: "test" }}
        output={{ results: [] }}
      />
    );

    // ToolDetailViewが非表示であることを確認
    expect(screen.queryByTestId("tool-detail-view")).toBeNull();
  });

  it("実行中状態（input-streaming）ではデフォルトで展開されている", () => {
    render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName="webSearch"
        state="input-streaming"
        input={{ query: "test" }}
      />
    );

    expect(screen.getByTestId("tool-detail-view")).not.toBeNull();
  });

  it("実行中状態（input-available）ではデフォルトで展開されている", () => {
    render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName="webSearch"
        state="input-available"
        input={{ query: "test" }}
      />
    );

    expect(screen.getByTestId("tool-detail-view")).not.toBeNull();
  });

  it("クリックで折りたたみ→展開を切り替える", () => {
    render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName="webSearch"
        state="output-available"
        input={{ query: "test" }}
        output={{ results: [] }}
      />
    );

    // 初期状態: 折りたたみ
    expect(screen.queryByTestId("tool-detail-view")).toBeNull();

    // クリックで展開
    const header = screen.getByTestId("tool-invocation-header");
    fireEvent.click(header);
    expect(screen.getByTestId("tool-detail-view")).not.toBeNull();

    // 再度クリックで折りたたみ
    fireEvent.click(header);
    expect(screen.queryByTestId("tool-detail-view")).toBeNull();
  });

  it("エラー状態ではデフォルトで折りたたまれている", () => {
    render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName="webSearch"
        state="output-error"
        input={{ query: "test" }}
        errorText="エラーが発生しました"
      />
    );

    expect(screen.queryByTestId("tool-detail-view")).toBeNull();
  });

  it("min-heightスタイルが設定されている", () => {
    const { container } = render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName="webSearch"
        state="output-available"
        input={{ query: "test" }}
      />
    );

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("min-h-[40px]");
  });

  it("transitionスタイルが設定されている", () => {
    const { container } = render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName="webSearch"
        state="output-available"
        input={{ query: "test" }}
      />
    );

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("transition-all");
  });

  it("toolNameがundefinedの場合はレンダリングをスキップする", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container } = render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName={undefined as unknown as string}
        state="output-available"
        input={{ query: "test" }}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("toolNameが空文字列の場合はレンダリングをスキップする", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container } = render(
      <ToolInvocationPart
        toolCallId="call-1"
        toolName=""
        state="output-available"
        input={{ query: "test" }}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
