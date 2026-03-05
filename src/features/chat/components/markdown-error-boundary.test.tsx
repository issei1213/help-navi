/**
 * MarkdownErrorBoundary コンポーネントのユニットテスト
 *
 * Streamdownレンダリングエラー時にプレーンテキストへフォールバックすることを検証する。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MarkdownErrorBoundary } from "./markdown-error-boundary";

/** エラーをスローするテスト用コンポーネント */
function ThrowingComponent() {
  throw new Error("Streamdownレンダリングエラー");
}

/** 正常にレンダリングするテスト用コンポーネント */
function NormalComponent() {
  return <div data-testid="normal-content">正常なコンテンツ</div>;
}

describe("MarkdownErrorBoundary", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("子コンポーネントが正常な場合はそのまま表示する", () => {
    render(
      <MarkdownErrorBoundary fallbackContent="フォールバック">
        <NormalComponent />
      </MarkdownErrorBoundary>
    );

    expect(screen.getByTestId("normal-content")).toBeDefined();
    expect(screen.getByText("正常なコンテンツ")).toBeDefined();
  });

  it("子コンポーネントがエラーをスローした場合にプレーンテキスト表示にフォールバックする", () => {
    // console.errorを抑制（Reactのエラーバウンダリがconsole.errorを呼ぶため）
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MarkdownErrorBoundary fallbackContent="フォールバックテキスト">
        <ThrowingComponent />
      </MarkdownErrorBoundary>
    );

    expect(screen.getByText("フォールバックテキスト")).toBeDefined();
  });

  it("エラー発生時にwhitespace-pre-wrapスタイルのプレーンテキストを表示する", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <MarkdownErrorBoundary fallbackContent="テスト内容">
        <ThrowingComponent />
      </MarkdownErrorBoundary>
    );

    const fallback = container.querySelector(".whitespace-pre-wrap");
    expect(fallback).not.toBeNull();
    expect(fallback?.textContent).toBe("テスト内容");
  });

  it("エラー発生時にコンソールにエラーログを出力する", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <MarkdownErrorBoundary fallbackContent="テスト">
        <ThrowingComponent />
      </MarkdownErrorBoundary>
    );

    // Reactのエラーバウンダリに加えて、コンポーネント内でもconsole.errorが呼ばれることを確認
    expect(consoleSpy).toHaveBeenCalled();
  });
});
