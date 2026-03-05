/**
 * ChatLayout コンポーネント
 *
 * 2カラムレイアウト（左サイドバー + メインチャットエリア）のフレーム構造を提供する。
 * サイドバーの表示状態に応じてCSS transitionで表示/非表示を制御する。
 * モバイルオーバーレイ時はfixed配置とバックドロップ表示を行う。
 */
import type { ReactNode } from "react";
import type { SidebarState } from "../hooks/use-sidebar";

/** ChatLayout のプロパティ */
interface ChatLayoutProps {
  /** サイドバーの表示状態 */
  sidebarState: SidebarState;
  /** モバイル判定 */
  isMobile: boolean;
  /** サイドバーコンテンツ */
  sidebar: ReactNode;
  /** メインエリアコンテンツ */
  main: ReactNode;
  /** オーバーレイバックドロップクリック時のコールバック */
  onOverlayClick: () => void;
}

export function ChatLayout({
  sidebarState,
  isMobile,
  sidebar,
  main,
  onOverlayClick,
}: ChatLayoutProps) {
  /** サイドバーの幅と表示制御のクラス名を決定する */
  const getSidebarWrapperClasses = (): string => {
    const baseClasses = "transition-all duration-300 overflow-hidden";

    if (isMobile) {
      // モバイル: オーバーレイ表示
      if (sidebarState === "overlay") {
        return `fixed inset-y-0 left-0 z-50 w-72 ${baseClasses}`;
      }
      // hidden
      return `fixed inset-y-0 left-0 z-50 w-0 ${baseClasses}`;
    }

    // デスクトップ: インライン表示
    if (sidebarState === "collapsed") {
      return `w-0 ${baseClasses}`;
    }
    return `w-72 flex-shrink-0 ${baseClasses}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-900">
      {/* モバイルオーバーレイバックドロップ */}
      {isMobile && sidebarState === "overlay" && (
        <div
          data-testid="overlay-backdrop"
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={onOverlayClick}
        />
      )}

      {/* サイドバー */}
      <div
        data-testid="sidebar-wrapper"
        className={getSidebarWrapperClasses()}
      >
        {sidebar}
      </div>

      {/* メインエリア */}
      <div className="flex flex-1 flex-col min-w-0">{main}</div>
    </div>
  );
}
