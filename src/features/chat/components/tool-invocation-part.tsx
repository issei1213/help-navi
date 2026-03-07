/**
 * ToolInvocationPart コンポーネント
 *
 * 個別のツール呼び出しを表示し、状態に応じたインジケーター・展開/折りたたみ機能を提供する。
 * - 実行中状態: デフォルト展開
 * - 完了/エラー状態: デフォルト折りたたみ
 * - クリックで展開/折りたたみを切り替え
 * - CSS transition と min-height でレイアウト安定性を確保
 */
"use client";

import { useState, useEffect } from "react";
import { ToolStatusIcon } from "./tool-status-icon";
import { ToolDetailView } from "./tool-detail-view";
import { getToolDisplayName } from "@/lib/tool-display-names";
import type { ToolInvocationState } from "./tool-status-icon";

/** ToolInvocationPart のプロパティ */
export interface ToolInvocationPartProps {
  /** ツール呼び出しID */
  toolCallId: string;
  /** ツール名（API名） */
  toolName: string;
  /** 現在の状態 */
  state: ToolInvocationState;
  /** ツール入力パラメータ */
  input: Record<string, unknown>;
  /** ツール出力結果（output-available時のみ） */
  output?: unknown;
  /** エラーテキスト（output-error時のみ） */
  errorText?: string;
}

/** 実行中の状態かどうかを判定する */
function isRunningState(state: ToolInvocationState): boolean {
  return state === "input-streaming" || state === "input-available";
}

/**
 * 個別のツール呼び出し表示コンポーネント
 *
 * @param props - ToolInvocationPartProps
 */
export function ToolInvocationPart({
  toolCallId,
  toolName,
  state,
  input,
  output,
  errorText,
}: ToolInvocationPartProps) {
  // ツール名が不正な場合はレンダリングをスキップ
  if (!toolName) {
    console.warn(
      `ToolInvocationPart: ツール名が不正です (toolCallId: ${toolCallId})`
    );
    return null;
  }

  const [isExpanded, setIsExpanded] = useState(isRunningState(state));

  // 実行中から完了/エラーに遷移した際に自動的に折りたたむ
  useEffect(() => {
    if (!isRunningState(state)) {
      setIsExpanded(false);
    }
  }, [state]);

  /** 展開/折りたたみを切り替えるハンドラ */
  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const displayName = getToolDisplayName(toolName);

  return (
    <div
      data-testid={`tool-invocation-${toolCallId}`}
      className="min-h-[40px] transition-all duration-200 ease-in-out rounded-md border border-zinc-200 dark:border-zinc-700 my-1"
    >
      {/* ヘッダー（クリック可能） */}
      <button
        data-testid="tool-invocation-header"
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md cursor-pointer"
      >
        <ToolStatusIcon state={state} />
        <span className="font-medium">{displayName}</span>
        <span className="ml-auto text-zinc-400 text-xs">
          {isExpanded ? "▲" : "▼"}
        </span>
      </button>

      {/* 詳細表示（展開時のみ） */}
      {isExpanded && (
        <div className="px-3 pb-2">
          <ToolDetailView
            input={input}
            state={state}
            output={output}
            errorText={errorText}
          />
        </div>
      )}
    </div>
  );
}
