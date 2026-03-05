/**
 * MarkdownErrorBoundary コンポーネント
 *
 * Streamdownレンダリングエラー発生時にプレーンテキスト表示へ
 * グレースフルデグレードするReactエラーバウンダリ。
 * エラー発生時はコンソールにエラーログを出力し、デバッグ可能にする。
 */
import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

/** MarkdownErrorBoundary のプロパティ */
interface MarkdownErrorBoundaryProps {
  /** フォールバック時に表示するプレーンテキスト */
  fallbackContent: string;
  /** 子コンポーネント */
  children: ReactNode;
}

/** MarkdownErrorBoundary の状態 */
interface MarkdownErrorBoundaryState {
  /** エラーが発生したかどうか */
  hasError: boolean;
}

/**
 * Markdownレンダリング用エラーバウンダリ
 *
 * Streamdownコンポーネントのレンダリングエラーをキャッチし、
 * 既存のプレーンテキスト表示と同等のフォールバック表示を行う。
 */
export class MarkdownErrorBoundary extends Component<
  MarkdownErrorBoundaryProps,
  MarkdownErrorBoundaryState
> {
  constructor(props: MarkdownErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MarkdownErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      "MarkdownRenderer でレンダリングエラーが発生しました:",
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="whitespace-pre-wrap text-sm">
          {this.props.fallbackContent}
        </p>
      );
    }

    return this.props.children;
  }
}
