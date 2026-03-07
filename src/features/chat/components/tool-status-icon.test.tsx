/**
 * ToolStatusIcon コンポーネントのテスト
 *
 * ツール状態に応じたアイコンとアニメーションの描画を検証する。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolStatusIcon } from "./tool-status-icon";

describe("ToolStatusIcon", () => {
  afterEach(() => {
    cleanup();
  });

  it("input-streaming状態でスピナーアイコンを表示する", () => {
    render(<ToolStatusIcon state="input-streaming" />);

    const icon = screen.getByTestId("tool-status-icon");
    expect(icon.className).toContain("animate-spin");
  });

  it("input-available状態でスピナーアイコンを表示する", () => {
    render(<ToolStatusIcon state="input-available" />);

    const icon = screen.getByTestId("tool-status-icon");
    expect(icon.className).toContain("animate-spin");
  });

  it("output-available状態で緑色のチェックマークアイコンを表示する", () => {
    render(<ToolStatusIcon state="output-available" />);

    const icon = screen.getByTestId("tool-status-icon");
    expect(icon.className).toContain("text-green-500");
    expect(icon.className).not.toContain("animate-spin");
  });

  it("output-error状態で赤色のエラーアイコンを表示する", () => {
    render(<ToolStatusIcon state="output-error" />);

    const icon = screen.getByTestId("tool-status-icon");
    expect(icon.className).toContain("text-red-500");
    expect(icon.className).not.toContain("animate-spin");
  });

  it("SVGインライン要素を含む", () => {
    const { container } = render(<ToolStatusIcon state="input-streaming" />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("output-available状態のアイコンにはチェックマークのパスが含まれる", () => {
    const { container } = render(<ToolStatusIcon state="output-available" />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("output-error状態のアイコンにはエラーマークのパスが含まれる", () => {
    const { container } = render(<ToolStatusIcon state="output-error" />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });
});
