/**
 * useSidebar フックのユニットテスト
 *
 * サイドバーの表示状態（expanded / collapsed / hidden / overlay）の管理、
 * ウィンドウリサイズによるモバイル判定、トグル/クローズ操作をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSidebar } from "./use-sidebar";

/** matchMedia のモックヘルパー */
function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: "(max-width: 639px)",
    addEventListener: vi.fn(
      (_event: string, handler: (e: MediaQueryListEvent) => void) => {
        listeners.push(handler);
      }
    ),
    removeEventListener: vi.fn(
      (_event: string, handler: (e: MediaQueryListEvent) => void) => {
        const idx = listeners.indexOf(handler);
        if (idx >= 0) listeners.splice(idx, 1);
      }
    ),
    dispatchEvent: vi.fn(),
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });

  return {
    mql,
    /** matchMedia のリスナーに変更イベントを発火する */
    triggerChange: (newMatches: boolean) => {
      mql.matches = newMatches;
      listeners.forEach((listener) =>
        listener({ matches: newMatches } as MediaQueryListEvent)
      );
    },
  };
}

describe("useSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("初期状態", () => {
    it("デスクトップ（640px以上）では expanded 状態で初期化される", () => {
      mockMatchMedia(false); // 640px以上 = モバイルではない
      const { result } = renderHook(() => useSidebar());

      expect(result.current.sidebarState).toBe("expanded");
      expect(result.current.isMobile).toBe(false);
    });

    it("モバイル（640px未満）では hidden 状態で初期化される", () => {
      mockMatchMedia(true); // 640px未満 = モバイル
      const { result } = renderHook(() => useSidebar());

      expect(result.current.sidebarState).toBe("hidden");
      expect(result.current.isMobile).toBe(true);
    });
  });

  describe("toggleSidebar", () => {
    it("デスクトップで expanded -> collapsed に遷移する", () => {
      mockMatchMedia(false);
      const { result } = renderHook(() => useSidebar());

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarState).toBe("collapsed");
    });

    it("デスクトップで collapsed -> expanded に遷移する", () => {
      mockMatchMedia(false);
      const { result } = renderHook(() => useSidebar());

      // まず collapsed にする
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarState).toBe("collapsed");

      // expanded に戻す
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarState).toBe("expanded");
    });

    it("モバイルで hidden -> overlay に遷移する", () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useSidebar());

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarState).toBe("overlay");
    });

    it("モバイルで overlay -> hidden に遷移する", () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useSidebar());

      // overlay にする
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarState).toBe("overlay");

      // hidden に戻す
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarState).toBe("hidden");
    });
  });

  describe("closeSidebar", () => {
    it("モバイル overlay 状態から hidden に遷移する", () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useSidebar());

      // overlay にする
      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarState).toBe("overlay");

      // closeSidebar で hidden にする
      act(() => {
        result.current.closeSidebar();
      });
      expect(result.current.sidebarState).toBe("hidden");
    });

    it("デスクトップ expanded 状態では closeSidebar を呼んでも collapsed にならない（モバイルオーバーレイ用）", () => {
      mockMatchMedia(false);
      const { result } = renderHook(() => useSidebar());

      // closeSidebar は expanded を collapsed にはしない（toggleSidebar を使う）
      act(() => {
        result.current.closeSidebar();
      });
      // closeSidebar はモバイルオーバーレイ用なので、デスクトップでは hidden にする
      // ただし、デスクトップでは collapsed 状態のとき closeSidebar は collapsed を維持
      expect(result.current.sidebarState).toBe("expanded");
    });
  });

  describe("リサイズイベントによる状態遷移", () => {
    it("デスクトップからモバイルにリサイズしたとき hidden に遷移する", () => {
      const { triggerChange } = mockMatchMedia(false);
      const { result } = renderHook(() => useSidebar());

      expect(result.current.sidebarState).toBe("expanded");

      act(() => {
        triggerChange(true); // モバイルに変更
      });

      expect(result.current.sidebarState).toBe("hidden");
      expect(result.current.isMobile).toBe(true);
    });

    it("モバイルからデスクトップにリサイズしたとき expanded に遷移する", () => {
      const { triggerChange } = mockMatchMedia(true);
      const { result } = renderHook(() => useSidebar());

      expect(result.current.sidebarState).toBe("hidden");

      act(() => {
        triggerChange(false); // デスクトップに変更
      });

      expect(result.current.sidebarState).toBe("expanded");
      expect(result.current.isMobile).toBe(false);
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にイベントリスナーが解除される", () => {
      const { mql } = mockMatchMedia(false);
      const { unmount } = renderHook(() => useSidebar());

      unmount();

      expect(mql.removeEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });
  });
});
