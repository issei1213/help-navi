/**
 * Markdownレンダリング受け入れ基準の検証テスト
 *
 * 各Markdown要素（コードブロック、インラインコード、見出し、リスト、太字、リンク）が
 * Streamdownを通じて正しくHTMLにレンダリングされることを検証する。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Streamdown } from "streamdown";

describe("Markdownレンダリング受け入れ基準", () => {
  afterEach(() => {
    cleanup();
  });

  it("フェンスドコードブロックがpre/code要素としてレンダリングされる", () => {
    const markdown = '```typescript\nconst x = 1;\n```';
    const { container } = render(
      <Streamdown>{markdown}</Streamdown>
    );

    const preElement = container.querySelector("pre");
    const codeElement = container.querySelector("code");
    expect(preElement).not.toBeNull();
    expect(codeElement).not.toBeNull();
  });

  it("インラインコードがcode要素としてレンダリングされる", () => {
    const markdown = "これは `inline code` です";
    const { container } = render(
      <Streamdown>{markdown}</Streamdown>
    );

    const codeElements = container.querySelectorAll("code");
    expect(codeElements.length).toBeGreaterThan(0);
    // pre要素の中にないcode要素（インラインコード）が存在する
    const inlineCode = Array.from(codeElements).find(
      (el) => !el.closest("pre")
    );
    expect(inlineCode).toBeDefined();
    expect(inlineCode?.textContent).toBe("inline code");
  });

  it("見出しがh1/h2/h3要素としてレンダリングされる", () => {
    const markdown = "# 見出し1\n\n## 見出し2\n\n### 見出し3";
    const { container } = render(
      <Streamdown>{markdown}</Streamdown>
    );

    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelector("h2")).not.toBeNull();
    expect(container.querySelector("h3")).not.toBeNull();
  });

  it("リストがul/li要素としてレンダリングされる", () => {
    const markdown = "- 項目1\n- 項目2\n- 項目3";
    const { container } = render(
      <Streamdown>{markdown}</Streamdown>
    );

    const ulElement = container.querySelector("ul");
    const liElements = container.querySelectorAll("li");
    expect(ulElement).not.toBeNull();
    expect(liElements.length).toBe(3);
  });

  it("太字がfont-semibold付きspan要素としてレンダリングされる", () => {
    const markdown = "これは **太字** テキストです";
    const { container } = render(
      <Streamdown>{markdown}</Streamdown>
    );

    // Streamdownは太字を<span data-streamdown="strong" class="font-semibold">としてレンダリングする
    const strongElement = container.querySelector('[data-streamdown="strong"]');
    expect(strongElement).not.toBeNull();
    expect(strongElement?.textContent).toBe("太字");
  });

  it("リンクがbutton要素としてレンダリングされる", () => {
    const markdown = "[リンクテキスト](https://example.com)";
    const { container } = render(
      <Streamdown>{markdown}</Streamdown>
    );

    // Streamdownはリンクを<button data-streamdown="link">としてレンダリングする
    const linkElement = container.querySelector('[data-streamdown="link"]');
    expect(linkElement).not.toBeNull();
    expect(linkElement?.textContent).toBe("リンクテキスト");
  });

  it("言語指定ありコードブロックにdata-language属性が設定される", () => {
    const markdown = '```javascript\nconsole.log("hello");\n```';
    const { container } = render(
      <Streamdown>{markdown}</Streamdown>
    );

    // Streamdownはコードブロックに data-language 属性を設定する
    const codeBlock = container.querySelector('[data-streamdown="code-block"]');
    expect(codeBlock).not.toBeNull();
    expect(codeBlock?.getAttribute("data-language")).toBe("javascript");
  });

  it("言語指定なしコードブロックがレンダリングされる", () => {
    const markdown = '```\nplain code\n```';
    const { container } = render(
      <Streamdown>{markdown}</Streamdown>
    );

    const preElement = container.querySelector("pre");
    expect(preElement).not.toBeNull();
    // コードの内容が表示される
    expect(container.textContent).toContain("plain code");
  });
});
