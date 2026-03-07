/**
 * 個別コンポーネントの受け入れ基準テスト
 *
 * ToolInvocationPart、ToolStatusIcon、ToolDetailViewの各状態での正しい描画と
 * インタラクションを検証する。モック化せず実コンポーネントを統合テストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ToolInvocationPart } from "./tool-invocation-part";
import { ToolStatusIcon } from "./tool-status-icon";
import { ToolDetailView } from "./tool-detail-view";

describe("ToolInvocationPart 受け入れ基準テスト", () => {
  afterEach(() => {
    cleanup();
  });

  describe("各状態での正しい描画", () => {
    it("input-streaming状態: スピナーが表示され、詳細が展開される", () => {
      render(
        <ToolInvocationPart
          toolCallId="accept-1"
          toolName="webSearch"
          state="input-streaming"
          input={{ query: "test" }}
        />
      );

      // スピナーアイコンが表示される
      const icon = screen.getByTestId("tool-status-icon");
      expect(icon.className).toContain("animate-spin");

      // デフォルト展開
      expect(screen.getByTestId("tool-detail-view")).not.toBeNull();
    });

    it("input-available状態: スピナーが表示され、詳細が展開される", () => {
      render(
        <ToolInvocationPart
          toolCallId="accept-2"
          toolName="s3GetObject"
          state="input-available"
          input={{ key: "test.txt" }}
        />
      );

      const icon = screen.getByTestId("tool-status-icon");
      expect(icon.className).toContain("animate-spin");
      expect(screen.getByTestId("tool-detail-view")).not.toBeNull();
    });

    it("output-available状態: 緑色チェックが表示され、折りたたまれている", () => {
      render(
        <ToolInvocationPart
          toolCallId="accept-3"
          toolName="webSearch"
          state="output-available"
          input={{ query: "test" }}
          output={{ results: [] }}
        />
      );

      const icon = screen.getByTestId("tool-status-icon");
      expect(icon.className).toContain("text-green-500");
      expect(screen.queryByTestId("tool-detail-view")).toBeNull();
    });

    it("output-error状態: 赤色アイコンが表示され、折りたたまれている", () => {
      render(
        <ToolInvocationPart
          toolCallId="accept-4"
          toolName="webSearch"
          state="output-error"
          input={{ query: "test" }}
          errorText="タイムアウト"
        />
      );

      const icon = screen.getByTestId("tool-status-icon");
      expect(icon.className).toContain("text-red-500");
      expect(screen.queryByTestId("tool-detail-view")).toBeNull();
    });
  });

  describe("展開/折りたたみのクリック動作と初期状態", () => {
    it("完了状態で折りたたみ→クリック→展開→クリック→折りたたみ", () => {
      render(
        <ToolInvocationPart
          toolCallId="toggle-1"
          toolName="webSearch"
          state="output-available"
          input={{ query: "toggle" }}
          output={{ data: "result" }}
        />
      );

      // 初期: 折りたたみ
      expect(screen.queryByTestId("tool-detail-view")).toBeNull();

      const header = screen.getByTestId("tool-invocation-header");

      // 1回目クリック: 展開
      fireEvent.click(header);
      expect(screen.getByTestId("tool-detail-view")).not.toBeNull();

      // 2回目クリック: 折りたたみ
      fireEvent.click(header);
      expect(screen.queryByTestId("tool-detail-view")).toBeNull();
    });

    it("実行中状態で展開→クリック→折りたたみ→クリック→展開", () => {
      render(
        <ToolInvocationPart
          toolCallId="toggle-2"
          toolName="webSearch"
          state="input-available"
          input={{ query: "running" }}
        />
      );

      // 初期: 展開
      expect(screen.getByTestId("tool-detail-view")).not.toBeNull();

      const header = screen.getByTestId("tool-invocation-header");

      // 1回目クリック: 折りたたみ
      fireEvent.click(header);
      expect(screen.queryByTestId("tool-detail-view")).toBeNull();

      // 2回目クリック: 展開
      fireEvent.click(header);
      expect(screen.getByTestId("tool-detail-view")).not.toBeNull();
    });

    it("エラー状態の展開時にエラー情報が赤色背景で表示される", () => {
      render(
        <ToolInvocationPart
          toolCallId="error-expand"
          toolName="webSearch"
          state="output-error"
          input={{ query: "error" }}
          errorText="接続エラー"
        />
      );

      // クリックで展開
      const header = screen.getByTestId("tool-invocation-header");
      fireEvent.click(header);

      const errorDisplay = screen.getByTestId("tool-error-display");
      expect(errorDisplay).not.toBeNull();
      expect(errorDisplay.textContent).toContain("接続エラー");
      expect(errorDisplay.className).toContain("bg-red");
    });
  });
});

describe("ToolDetailView 受け入れ基準テスト", () => {
  afterEach(() => {
    cleanup();
  });

  it("入力パラメータが正しく表示される", () => {
    render(
      <ToolDetailView
        input={{ query: "React hooks", limit: 5 }}
        state="input-available"
      />
    );

    const view = screen.getByTestId("tool-detail-view");
    expect(view.textContent).toContain("query");
    expect(view.textContent).toContain("React hooks");
    expect(view.textContent).toContain("limit");
    expect(view.textContent).toContain("5");
  });

  it("出力結果がJSON整形表示される", () => {
    render(
      <ToolDetailView
        input={{ key: "file.txt" }}
        state="output-available"
        output={{ content: "Hello World", size: 11 }}
      />
    );

    const outputDisplay = screen.getByTestId("tool-output-display");
    expect(outputDisplay.textContent).toContain("Hello World");
    expect(outputDisplay.textContent).toContain("size");
  });

  it("500文字を超える出力が切り詰められる", () => {
    const longString = "x".repeat(600);
    render(
      <ToolDetailView
        input={{ key: "big-file.txt" }}
        state="output-available"
        output={longString}
      />
    );

    const view = screen.getByTestId("tool-detail-view");
    expect(view.textContent).toContain("... (省略)");
    // 切り詰められた後の長さが元の長さより短い
    const outputText = screen.getByTestId("tool-output-display").textContent ?? "";
    expect(outputText.length).toBeLessThan(longString.length);
  });

  it("エラー状態でエラーテキストが赤色背景で表示される", () => {
    render(
      <ToolDetailView
        input={{ query: "error test" }}
        state="output-error"
        errorText="ツール実行エラー: タイムアウト"
      />
    );

    const errorDisplay = screen.getByTestId("tool-error-display");
    expect(errorDisplay.className).toContain("bg-red");
    expect(errorDisplay.textContent).toContain("ツール実行エラー: タイムアウト");
  });

  it("input-streaming状態では出力・エラーセクションが非表示", () => {
    render(
      <ToolDetailView
        input={{ query: "streaming" }}
        state="input-streaming"
      />
    );

    expect(screen.queryByTestId("tool-output-display")).toBeNull();
    expect(screen.queryByTestId("tool-error-display")).toBeNull();
  });
});

describe("ToolStatusIcon 受け入れ基準テスト", () => {
  afterEach(() => {
    cleanup();
  });

  it("4つの状態すべてで正しいアイコンが描画される", () => {
    const states = [
      { state: "input-streaming" as const, expectSpin: true, color: null },
      { state: "input-available" as const, expectSpin: true, color: null },
      { state: "output-available" as const, expectSpin: false, color: "text-green-500" },
      { state: "output-error" as const, expectSpin: false, color: "text-red-500" },
    ];

    for (const { state, expectSpin, color } of states) {
      const { unmount } = render(<ToolStatusIcon state={state} />);
      const icon = screen.getByTestId("tool-status-icon");

      if (expectSpin) {
        expect(icon.className).toContain("animate-spin");
      } else {
        expect(icon.className).not.toContain("animate-spin");
      }

      if (color) {
        expect(icon.className).toContain(color);
      }

      unmount();
    }
  });
});
