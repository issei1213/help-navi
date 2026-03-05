/**
 * TypingIndicator コンポーネント
 *
 * AI応答生成中にドットアニメーションのタイピングインジケーターを表示する。
 * CSS @keyframes によるドットの上下アニメーションを使用する。
 */

export function TypingIndicator() {
  return (
    <div
      data-testid="typing-indicator"
      className="flex items-center gap-1 mb-4"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mr-2">
        AI
      </div>
      <div className="flex items-center gap-1 px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <span
          className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
