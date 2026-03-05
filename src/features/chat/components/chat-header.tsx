/**
 * ChatHeader コンポーネント
 *
 * 現在の会話タイトルとモバイル用ナビゲーションアイコンを表示する。
 * デスクトップではタイトルのみ中央表示。
 * モバイルでは左にハンバーガーアイコン + 新規チャットアイコンを配置。
 * サイドバーが折りたたまれている場合は展開ボタンを表示する。
 */

/** ChatHeader のプロパティ */
interface ChatHeaderProps {
  /** 現在の会話タイトル */
  title: string;
  /** タイトル自動生成中かどうか */
  isGeneratingTitle: boolean;
  /** モバイル判定 */
  isMobile: boolean;
  /** サイドバートグルコールバック */
  onToggleSidebar: () => void;
  /** 新規チャット作成コールバック */
  onNewChat: () => void;
  /** サイドバーが折りたたまれているか（デスクトップ用） */
  sidebarCollapsed: boolean;
}

export function ChatHeader({
  title,
  isGeneratingTitle,
  isMobile,
  onToggleSidebar,
  onNewChat,
  sidebarCollapsed,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center h-12 px-4 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex-shrink-0">
      {/* 左側: モバイルのハンバーガーメニュー + 新規チャット / デスクトップの展開ボタン */}
      <div className="flex items-center gap-2">
        {isMobile && (
          <>
            <button
              data-testid="hamburger-menu-button"
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="サイドバーを開く"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <button
              data-testid="mobile-new-chat-button"
              onClick={onNewChat}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="新しいチャット"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </>
        )}

        {!isMobile && sidebarCollapsed && (
          <button
            data-testid="expand-sidebar-button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="サイドバーを展開"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 中央: タイトル（生成中はスケルトン表示） */}
      <h1 className="flex-1 text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
        {isGeneratingTitle ? (
          <span className="mx-auto block h-4 w-48 rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ) : (
          title
        )}
      </h1>

      {/* 右側: スペーサー（左側のボタン分の幅を確保してタイトルを中央に維持） */}
      <div className="flex items-center gap-2">
        {isMobile && <div className="w-16" />}
        {!isMobile && sidebarCollapsed && <div className="w-8" />}
      </div>
    </header>
  );
}
