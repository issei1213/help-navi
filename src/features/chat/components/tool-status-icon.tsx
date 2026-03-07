/**
 * ToolStatusIcon コンポーネント
 *
 * ツールの実行状態に応じたアイコンとアニメーションを表示する。
 * - 実行中: 回転するスピナーアイコン
 * - 完了: 緑色のチェックマークアイコン
 * - エラー: 赤色のエラーアイコン
 *
 * アイコンはSVGインラインで実装し、外部ライブラリに依存しない。
 */

/** ツール呼び出しの状態型 */
export type ToolInvocationState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

/** ToolStatusIcon のプロパティ */
interface ToolStatusIconProps {
  /** ツールの現在の状態 */
  state: ToolInvocationState;
}

/** スピナーアイコン（実行中状態用） */
function SpinnerIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/** チェックマークアイコン（完了状態用） */
function CheckIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** エラーアイコン（エラー状態用） */
function ErrorIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v4m0 4h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * ツール状態に応じたアイコンとアニメーションを表示するコンポーネント
 *
 * @param props - ToolStatusIconProps
 */
export function ToolStatusIcon({ state }: ToolStatusIconProps) {
  /** 実行中かどうかを判定 */
  const isRunning = state === "input-streaming" || state === "input-available";

  if (isRunning) {
    return (
      <span
        data-testid="tool-status-icon"
        className="inline-flex items-center animate-spin text-blue-500"
      >
        <SpinnerIcon />
      </span>
    );
  }

  if (state === "output-available") {
    return (
      <span
        data-testid="tool-status-icon"
        className="inline-flex items-center text-green-500"
      >
        <CheckIcon />
      </span>
    );
  }

  // output-error
  return (
    <span
      data-testid="tool-status-icon"
      className="inline-flex items-center text-red-500"
    >
      <ErrorIcon />
    </span>
  );
}
