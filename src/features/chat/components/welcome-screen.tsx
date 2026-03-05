/**
 * WelcomeScreen コンポーネント
 *
 * 会話が空の場合にウェルカムメッセージを表示する。
 * アプリ名とガイダンステキストを中央配置で表示する。
 */

export function WelcomeScreen() {
  return (
    <div
      data-testid="welcome-screen"
      className="flex flex-1 flex-col items-center justify-center text-center px-4"
    >
      <div className="mb-4">
        <svg
          className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
        Help Navi
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
        AIエージェントとの対話を始めましょう。
        なんでも気軽に質問してください。
      </p>
    </div>
  );
}
