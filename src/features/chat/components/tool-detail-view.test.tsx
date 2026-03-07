/**
 * ToolDetailView コンポーネントのテスト
 *
 * ツール入出力の詳細表示、エラー表示、長大データの切り詰めを検証する。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolDetailView } from "./tool-detail-view";

describe("ToolDetailView", () => {
  afterEach(() => {
    cleanup();
  });

  it("入力パラメータをkey-value形式で表示する", () => {
    render(
      <ToolDetailView
        input={{ query: "TypeScript", limit: 10 }}
        state="input-available"
      />
    );

    const container = screen.getByTestId("tool-detail-view");
    expect(container.textContent).toContain("query");
    expect(container.textContent).toContain("TypeScript");
    expect(container.textContent).toContain("limit");
  });

  it("output-available状態で出力結果をJSON整形して表示する", () => {
    const output = { results: [{ title: "Result 1" }] };
    render(
      <ToolDetailView
        input={{ query: "test" }}
        state="output-available"
        output={output}
      />
    );

    const container = screen.getByTestId("tool-detail-view");
    expect(container.textContent).toContain("results");
    expect(container.textContent).toContain("Result 1");
  });

  it("output-error状態でエラー情報を赤色背景で表示する", () => {
    render(
      <ToolDetailView
        input={{ query: "test" }}
        state="output-error"
        errorText="ネットワークエラーが発生しました"
      />
    );

    const errorSection = screen.getByTestId("tool-error-display");
    expect(errorSection).not.toBeNull();
    expect(errorSection.textContent).toContain(
      "ネットワークエラーが発生しました"
    );
    expect(errorSection.className).toContain("bg-red");
  });

  it("出力が500文字を超える場合は切り詰めて省略記号を付加する", () => {
    const longOutput = "a".repeat(600);
    render(
      <ToolDetailView
        input={{ query: "test" }}
        state="output-available"
        output={longOutput}
      />
    );

    const container = screen.getByTestId("tool-detail-view");
    expect(container.textContent).toContain("... (省略)");
  });

  it("出力が500文字以内の場合は切り詰めない", () => {
    const shortOutput = "a".repeat(100);
    render(
      <ToolDetailView
        input={{ query: "test" }}
        state="output-available"
        output={shortOutput}
      />
    );

    const container = screen.getByTestId("tool-detail-view");
    expect(container.textContent).not.toContain("... (省略)");
  });

  it("input-streaming状態では出力セクションを表示しない", () => {
    render(
      <ToolDetailView
        input={{ query: "test" }}
        state="input-streaming"
      />
    );

    expect(screen.queryByTestId("tool-output-display")).toBeNull();
    expect(screen.queryByTestId("tool-error-display")).toBeNull();
  });

  it("入力がオブジェクトの場合にpre要素でJSON整形表示する", () => {
    const { container } = render(
      <ToolDetailView
        input={{ query: "test", options: { deep: true } }}
        state="input-available"
      />
    );

    const preElements = container.querySelectorAll("pre");
    expect(preElements.length).toBeGreaterThan(0);
  });

  it("入力が空オブジェクトの場合でも正しく表示する", () => {
    render(
      <ToolDetailView input={{}} state="input-available" />
    );

    const container = screen.getByTestId("tool-detail-view");
    expect(container).not.toBeNull();
  });
});
