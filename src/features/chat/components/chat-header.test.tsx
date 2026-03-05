/**
 * ChatHeader コンポーネントのレンダリングテスト
 *
 * 会話タイトル表示、モバイル時のハンバーガーメニュー・新規チャットアイコンをテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ChatHeader } from "./chat-header";

describe("ChatHeader", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    title: "テスト会話",
    isMobile: false,
    onToggleSidebar: vi.fn(),
    onNewChat: vi.fn(),
    sidebarCollapsed: false,
  };

  it("会話タイトルを表示する", () => {
    render(<ChatHeader {...defaultProps} />);

    expect(screen.getByText("テスト会話")).toBeDefined();
  });

  it("新規チャット時にデフォルトタイトルを表示する", () => {
    render(<ChatHeader {...defaultProps} title="新しいチャット" />);

    expect(screen.getByText("新しいチャット")).toBeDefined();
  });

  describe("モバイル表示", () => {
    it("ハンバーガーメニューアイコンを表示する", () => {
      render(<ChatHeader {...defaultProps} isMobile={true} />);

      expect(screen.getByTestId("hamburger-menu-button")).toBeDefined();
    });

    it("新規チャットアイコンを表示する", () => {
      render(<ChatHeader {...defaultProps} isMobile={true} />);

      expect(screen.getByTestId("mobile-new-chat-button")).toBeDefined();
    });

    it("ハンバーガーメニュークリック時に onToggleSidebar が呼ばれる", () => {
      const onToggleSidebar = vi.fn();
      render(
        <ChatHeader
          {...defaultProps}
          isMobile={true}
          onToggleSidebar={onToggleSidebar}
        />
      );

      fireEvent.click(screen.getByTestId("hamburger-menu-button"));

      expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    });

    it("新規チャットアイコンクリック時に onNewChat が呼ばれる", () => {
      const onNewChat = vi.fn();
      render(
        <ChatHeader
          {...defaultProps}
          isMobile={true}
          onNewChat={onNewChat}
        />
      );

      fireEvent.click(screen.getByTestId("mobile-new-chat-button"));

      expect(onNewChat).toHaveBeenCalledTimes(1);
    });
  });

  describe("デスクトップ表示", () => {
    it("サイドバーが折りたたまれている場合、展開ボタンを表示する", () => {
      render(
        <ChatHeader {...defaultProps} sidebarCollapsed={true} />
      );

      expect(screen.getByTestId("expand-sidebar-button")).toBeDefined();
    });

    it("サイドバーが展開されている場合、展開ボタンを表示しない", () => {
      render(
        <ChatHeader {...defaultProps} sidebarCollapsed={false} />
      );

      expect(screen.queryByTestId("expand-sidebar-button")).toBeNull();
    });
  });
});
