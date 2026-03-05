/**
 * useSidebar フック
 *
 * サイドバーの開閉状態とレスポンシブ制御を管理するカスタムフック。
 * ウィンドウサイズに応じてモバイル/デスクトップの状態を自動切替する。
 *
 * @returns {UseSidebarReturn} サイドバー状態と操作関数
 */
import { useState, useEffect, useCallback } from "react";

/** サイドバーの表示状態 */
export type SidebarState = "expanded" | "collapsed" | "hidden" | "overlay";

/** useSidebar の戻り値型 */
export interface UseSidebarReturn {
  /** 現在のサイドバー状態 */
  sidebarState: SidebarState;
  /** モバイル判定（640px未満） */
  isMobile: boolean;
  /** サイドバーを開閉する */
  toggleSidebar: () => void;
  /** サイドバーを閉じる（モバイルオーバーレイ用） */
  closeSidebar: () => void;
}

/** モバイル判定のブレークポイント（640px未満） */
const MOBILE_BREAKPOINT = "(max-width: 639px)";

export function useSidebar(): UseSidebarReturn {
  const [sidebarState, setSidebarState] = useState<SidebarState>("expanded");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT);

    /** メディアクエリの変更ハンドラ */
    const handleChange = (e: MediaQueryListEvent) => {
      const mobile = e.matches;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarState("hidden");
      } else {
        setSidebarState("expanded");
      }
    };

    // 初期値を設定
    setIsMobile(mql.matches);
    if (mql.matches) {
      setSidebarState("hidden");
    }

    mql.addEventListener("change", handleChange);

    return () => {
      mql.removeEventListener("change", handleChange);
    };
  }, []);

  /** サイドバーの開閉を切り替える */
  const toggleSidebar = useCallback(() => {
    setSidebarState((prev) => {
      if (isMobile) {
        // モバイル: hidden <-> overlay
        return prev === "hidden" ? "overlay" : "hidden";
      }
      // デスクトップ: expanded <-> collapsed
      return prev === "expanded" ? "collapsed" : "expanded";
    });
  }, [isMobile]);

  /** サイドバーを閉じる（モバイルオーバーレイ用） */
  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarState("hidden");
    }
  }, [isMobile]);

  return {
    sidebarState,
    isMobile,
    toggleSidebar,
    closeSidebar,
  };
}
