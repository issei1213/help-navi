/**
 * ChatLayout コンポーネントのレンダリングテスト
 *
 * 2カラムレイアウトのフレーム構造、サイドバー状態に応じた表示制御をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ChatLayout } from "./chat-layout";
import type { SidebarState } from "../hooks/use-sidebar";

describe("ChatLayout", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    sidebarState: "expanded" as SidebarState,
    isMobile: false,
    sidebar: <div data-testid="sidebar">サイドバー</div>,
    main: <div data-testid="main">メインエリア</div>,
    onOverlayClick: vi.fn(),
  };

  it("サイドバーとメインエリアの両方をレンダリングする", () => {
    render(<ChatLayout {...defaultProps} />);

    expect(screen.getByTestId("sidebar")).toBeDefined();
    expect(screen.getByTestId("main")).toBeDefined();
  });

  it("ビューポート全高のレイアウトを持つ", () => {
    const { container } = render(<ChatLayout {...defaultProps} />);
    const layout = container.firstChild as HTMLElement;

    expect(layout.className).toContain("h-screen");
  });

  it("flexレイアウトで配置する", () => {
    const { container } = render(<ChatLayout {...defaultProps} />);
    const layout = container.firstChild as HTMLElement;

    expect(layout.className).toContain("flex");
  });

  describe("サイドバー状態に応じた表示制御", () => {
    it("expanded 状態でサイドバーが表示される", () => {
      render(
        <ChatLayout {...defaultProps} sidebarState="expanded" />
      );
      const sidebarWrapper = screen.getByTestId("sidebar-wrapper");

      // サイドバーが幅を持っている（非表示ではない）
      expect(sidebarWrapper.className).not.toContain("w-0");
    });

    it("collapsed 状態でサイドバーが非表示になる", () => {
      render(
        <ChatLayout {...defaultProps} sidebarState="collapsed" />
      );
      const sidebarWrapper = screen.getByTestId("sidebar-wrapper");

      expect(sidebarWrapper.className).toContain("w-0");
    });

    it("hidden 状態（モバイル）でサイドバーが非表示になる", () => {
      render(
        <ChatLayout
          {...defaultProps}
          sidebarState="hidden"
          isMobile={true}
        />
      );
      // オーバーレイが存在しない
      expect(screen.queryByTestId("overlay-backdrop")).toBeNull();
    });

    it("overlay 状態（モバイル）でオーバーレイバックドロップが表示される", () => {
      render(
        <ChatLayout
          {...defaultProps}
          sidebarState="overlay"
          isMobile={true}
        />
      );
      expect(screen.getByTestId("overlay-backdrop")).toBeDefined();
    });

    it("overlay 状態でバックドロップクリック時に onOverlayClick が呼ばれる", async () => {
      const onOverlayClick = vi.fn();
      render(
        <ChatLayout
          {...defaultProps}
          sidebarState="overlay"
          isMobile={true}
          onOverlayClick={onOverlayClick}
        />
      );

      const backdrop = screen.getByTestId("overlay-backdrop");
      backdrop.click();

      expect(onOverlayClick).toHaveBeenCalledTimes(1);
    });
  });
});
