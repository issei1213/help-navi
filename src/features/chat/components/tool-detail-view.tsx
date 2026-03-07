/**
 * ToolDetailView コンポーネント
 *
 * ツール入力パラメータと実行結果の詳細を構造化して表示する。
 * - 入力パラメータ: key-value形式で表示
 * - 実行結果: JSON整形表示（output-available時）
 * - エラー情報: 赤色背景で表示（output-error時）
 * - 長大な出力は500文字で切り詰め、省略記号を表示
 */

import type { ToolInvocationState } from "./tool-status-icon";

/** 出力の最大表示文字数 */
const MAX_OUTPUT_LENGTH = 500;

/** ToolDetailView のプロパティ */
interface ToolDetailViewProps {
  /** ツール入力パラメータ */
  input: Record<string, unknown>;
  /** ツールの状態 */
  state: ToolInvocationState;
  /** ツール出力結果（output-available時のみ） */
  output?: unknown;
  /** エラーテキスト（output-error時のみ） */
  errorText?: string;
}

/**
 * 出力を文字列に変換し、必要に応じて切り詰める
 */
function formatOutput(output: unknown): string {
  const str =
    typeof output === "string" ? output : JSON.stringify(output, null, 2);
  if (str.length > MAX_OUTPUT_LENGTH) {
    return str.slice(0, MAX_OUTPUT_LENGTH) + "... (省略)";
  }
  return str;
}

/**
 * ツール入出力の詳細を表示するコンポーネント
 *
 * @param props - ToolDetailViewProps
 */
export function ToolDetailView({
  input,
  state,
  output,
  errorText,
}: ToolDetailViewProps) {
  return (
    <div
      data-testid="tool-detail-view"
      className="mt-2 space-y-2 text-xs text-zinc-600 dark:text-zinc-400"
    >
      {/* 入力パラメータ */}
      <div>
        <div className="font-semibold mb-1 text-zinc-500 dark:text-zinc-400">
          入力:
        </div>
        <pre className="bg-zinc-50 dark:bg-zinc-900 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(input, null, 2)}
        </pre>
      </div>

      {/* 出力結果（output-available時のみ） */}
      {state === "output-available" && output !== undefined && (
        <div data-testid="tool-output-display">
          <div className="font-semibold mb-1 text-zinc-500 dark:text-zinc-400">
            出力:
          </div>
          <pre className="bg-zinc-50 dark:bg-zinc-900 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
            {formatOutput(output)}
          </pre>
        </div>
      )}

      {/* エラー情報（output-error時のみ） */}
      {state === "output-error" && errorText && (
        <div
          data-testid="tool-error-display"
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2"
        >
          <div className="font-semibold mb-1 text-red-600 dark:text-red-400">
            エラー:
          </div>
          <p className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
            {errorText}
          </p>
        </div>
      )}
    </div>
  );
}
