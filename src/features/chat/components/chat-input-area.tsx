/**
 * ChatInputArea コンポーネント
 *
 * メッセージ入力テキストエリアと送信/停止ボタンを提供する。
 * 複数行入力をサポートし、入力量に応じて高さを自動調整する。
 * Enterで送信、Shift+Enterで改行。
 * ストリーミング中は送信ボタンを停止ボタンに切り替える。
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/** ChatInputArea のプロパティ */
interface ChatInputAreaProps {
  /** メッセージ送信コールバック */
  onSendMessage: (text: string) => void;
  /** ストリーミング停止コールバック */
  onStop: () => void;
  /** ストリーミング中かどうか */
  isStreaming: boolean;
  /** 入力を無効化するか */
  disabled: boolean;
}

export function ChatInputArea({
  onSendMessage,
  onStop,
  isStreaming,
  disabled,
}: ChatInputAreaProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** テキストエリアの高さを自動調整する */
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  /** メッセージを送信する */
  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || disabled) return;
    onSendMessage(trimmedInput);
    setInput("");
  };

  /** キー入力を処理する（IME変換中はスキップ） */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** コンテナクリック時にtextareaへフォーカスする */
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // ボタン等の他要素クリック時はスキップ
      if ((e.target as HTMLElement).closest("button")) return;
      textareaRef.current?.focus();
    },
    []
  );

  const canSend = input.trim().length > 0 && !disabled;

  return (
    <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div
          className="flex items-center gap-2 rounded-2xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 cursor-text"
          onClick={handleContainerClick}
        >
          <textarea
            id="chat-message-input"
            name="chat-message"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="なんでも聞いてください"
            disabled={disabled || isStreaming}
            autoComplete="off"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
            style={{ maxHeight: "200px" }}
          />

          {isStreaming ? (
            <button
              data-testid="stop-button"
              onClick={onStop}
              className="flex-shrink-0 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              aria-label="停止"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              data-testid="send-button"
              onClick={handleSend}
              disabled={!canSend}
              className="flex-shrink-0 p-1.5 rounded-lg bg-zinc-800 dark:bg-zinc-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 dark:hover:bg-zinc-500 transition-colors"
              aria-label="送信"
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
                  d="M5 12h14m-7-7l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
