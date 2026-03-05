/**
 * MessageActions コンポーネント
 *
 * AIメッセージに対するコピー・リトライアクションを提供する。
 * コピーボタンクリック時にメッセージ内容をクリップボードにコピーし、
 * チェックマークアイコンで完了フィードバックを表示する。
 */
"use client";

import { useState } from "react";

/** MessageActions のプロパティ */
interface MessageActionsProps {
  /** コピー対象のメッセージ内容 */
  content: string;
  /** コピーコールバック */
  onCopy: (content: string) => void;
  /** リトライコールバック */
  onRegenerate: () => void;
}

export function MessageActions({
  content,
  onCopy,
  onRegenerate,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  /** コピー処理 */
  const handleCopy = () => {
    onCopy(content);
    navigator.clipboard.writeText(content).catch(() => {
      // クリップボードAPI未対応環境のフォールバック
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="message-actions"
      className="flex items-center gap-1"
    >
      {/* コピーボタン */}
      <button
        data-testid="copy-button"
        onClick={handleCopy}
        className="p-1 rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="コピー"
      >
        {copied ? (
          <svg
            data-testid="check-icon"
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            data-testid="copy-icon"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>

      {/* リトライボタン */}
      <button
        data-testid="regenerate-button"
        onClick={onRegenerate}
        className="p-1 rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="再生成"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}
