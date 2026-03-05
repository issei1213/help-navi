/**
 * MarkdownRenderer コンポーネント
 *
 * StreamdownによるMarkdownレンダリングの設定を集約するラッパーコンポーネント。
 * codeプラグイン（デュアルテーマ）とcjkプラグインの設定を一元管理する。
 * コードブロックのコピーボタン・言語ラベル表示はStreamdown組み込み機能に委任する。
 */
"use client";

import { Streamdown } from "streamdown";
import type { PluginConfig } from "streamdown";
import { createCodePlugin } from "@streamdown/code";
import { createCjkPlugin } from "@streamdown/cjk";
import { MarkdownErrorBoundary } from "./markdown-error-boundary";

/** MarkdownRenderer のプロパティ */
interface MarkdownRendererProps {
  /** レンダリング対象のMarkdownテキスト */
  content: string;
  /** ストリーミング中かどうか */
  isStreaming: boolean;
}

/**
 * プラグインインスタンスをモジュールスコープで生成し、
 * レンダリング毎の再生成を防止する
 */
const codePlugin = createCodePlugin({
  themes: ["github-light", "github-dark"],
});

const cjkPlugin = createCjkPlugin();

/** プラグイン設定 */
const plugins: PluginConfig = {
  code: codePlugin,
  cjk: cjkPlugin,
};

/**
 * Markdownコンテンツをレンダリングするコンポーネント
 *
 * @param props - MarkdownRendererProps
 * @returns Streamdownによるレンダリング結果、またはcontentが空の場合はnull
 */
export function MarkdownRenderer({
  content,
  isStreaming,
}: MarkdownRendererProps) {
  // 空文字列の場合は何もレンダリングしない
  if (!content) {
    return null;
  }

  return (
    <div className="overflow-hidden">
      <MarkdownErrorBoundary fallbackContent={content}>
        <Streamdown
          className="text-sm"
          isAnimating={isStreaming}
          plugins={plugins}
        >
          {content}
        </Streamdown>
      </MarkdownErrorBoundary>
    </div>
  );
}
