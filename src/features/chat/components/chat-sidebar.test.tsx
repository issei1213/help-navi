/**
 * ChatSidebar コンポーネントのレンダリングテスト
 *
 * 会話一覧の表示、選択ハイライト、新規作成ボタン、3点メニュー、折りたたみボタンをテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ChatSidebar } from "./chat-sidebar";

describe("ChatSidebar", () => {
  afterEach(() => {
    cleanup();
  });

  const mockConversations = [
    { id: "conv-1", title: "会話1", updatedAt: "2026-03-04T10:00:00Z" },
    { id: "conv-2", title: "会話2", updatedAt: "2026-03-04T09:00:00Z" },
  ];

  const defaultProps = {
    conversations: mockConversations,
    activeConversationId: null as string | null,
    onNewChat: vi.fn(),
    onSelectConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onUpdateTitle: vi.fn(),
    onToggleSidebar: vi.fn(),
    isMobile: false,
  };

  it("「新しいチャット」ボタンが表示される", () => {
    render(<ChatSidebar {...defaultProps} />);

    expect(screen.getByText("新しいチャット")).toBeDefined();
  });

  it("会話一覧が表示される", () => {
    render(<ChatSidebar {...defaultProps} />);

    expect(screen.getByText("会話1")).toBeDefined();
    expect(screen.getByText("会話2")).toBeDefined();
  });

  it("新しいチャットボタンクリック時に onNewChat が呼ばれる", () => {
    const onNewChat = vi.fn();
    render(<ChatSidebar {...defaultProps} onNewChat={onNewChat} />);

    fireEvent.click(screen.getByText("新しいチャット"));

    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it("会話アイテムクリック時に onSelectConversation が呼ばれる", () => {
    const onSelectConversation = vi.fn();
    render(
      <ChatSidebar
        {...defaultProps}
        onSelectConversation={onSelectConversation}
      />
    );

    fireEvent.click(screen.getByText("会話1"));

    expect(onSelectConversation).toHaveBeenCalledWith("conv-1");
  });

  it("選択中の会話がハイライト表示される", () => {
    render(
      <ChatSidebar {...defaultProps} activeConversationId="conv-1" />
    );

    const activeItem = screen.getByText("会話1").closest("[data-testid]");
    expect(activeItem?.className).toContain("bg-zinc-200");
  });

  it("デスクトップ時に折りたたみボタンが表示される", () => {
    render(<ChatSidebar {...defaultProps} isMobile={false} />);

    expect(screen.getByTestId("toggle-sidebar-button")).toBeDefined();
  });

  it("折りたたみボタンクリック時に onToggleSidebar が呼ばれる", () => {
    const onToggleSidebar = vi.fn();
    render(
      <ChatSidebar
        {...defaultProps}
        isMobile={false}
        onToggleSidebar={onToggleSidebar}
      />
    );

    fireEvent.click(screen.getByTestId("toggle-sidebar-button"));

    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it("会話が空の場合、空状態メッセージを表示する", () => {
    render(<ChatSidebar {...defaultProps} conversations={[]} />);

    expect(screen.getByText("会話がありません")).toBeDefined();
  });

  describe("3点メニューと会話操作", () => {
    it("3点メニューボタンが各会話に存在する", () => {
      render(<ChatSidebar {...defaultProps} />);

      expect(screen.getByTestId("menu-button-conv-1")).toBeDefined();
      expect(screen.getByTestId("menu-button-conv-2")).toBeDefined();
    });

    it("3点メニューボタンクリックでドロップダウンメニューが表示される", () => {
      render(<ChatSidebar {...defaultProps} />);

      // メニューが非表示であることを確認
      expect(screen.queryByTestId("menu-dropdown-conv-1")).toBeNull();

      // 3点メニューをクリック
      fireEvent.click(screen.getByTestId("menu-button-conv-1"));

      // ドロップダウンが表示されることを確認
      expect(screen.getByTestId("menu-dropdown-conv-1")).toBeDefined();
    });

    it("ドロップダウンにタイトル編集と削除のオプションが表示される", () => {
      render(<ChatSidebar {...defaultProps} />);

      fireEvent.click(screen.getByTestId("menu-button-conv-1"));

      expect(screen.getByText("タイトル編集")).toBeDefined();
      expect(screen.getByText("削除")).toBeDefined();
    });

    it("タイトル編集をクリックすると編集用のinputが表示される", () => {
      render(<ChatSidebar {...defaultProps} />);

      fireEvent.click(screen.getByTestId("menu-button-conv-1"));
      fireEvent.click(screen.getByText("タイトル編集"));

      // 編集用inputが表示される
      const input = screen.getByDisplayValue("会話1");
      expect(input).toBeDefined();
      expect(input.tagName.toLowerCase()).toBe("input");
    });

    it("編集inputでEnterキーを押すとタイトル更新コールバックが呼ばれる", () => {
      const onUpdateTitle = vi.fn();
      render(
        <ChatSidebar {...defaultProps} onUpdateTitle={onUpdateTitle} />
      );

      // 編集モードに入る
      fireEvent.click(screen.getByTestId("menu-button-conv-1"));
      fireEvent.click(screen.getByText("タイトル編集"));

      const input = screen.getByDisplayValue("会話1");
      fireEvent.change(input, { target: { value: "編集後のタイトル" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onUpdateTitle).toHaveBeenCalledWith("conv-1", "編集後のタイトル");
    });

    it("編集inputでEscapeキーを押すと編集がキャンセルされる", () => {
      render(<ChatSidebar {...defaultProps} />);

      // 編集モードに入る
      fireEvent.click(screen.getByTestId("menu-button-conv-1"));
      fireEvent.click(screen.getByText("タイトル編集"));

      const input = screen.getByDisplayValue("会話1");
      fireEvent.keyDown(input, { key: "Escape" });

      // inputが消えて元のタイトルが表示される
      expect(screen.queryByDisplayValue("会話1")).toBeNull();
      expect(screen.getByText("会話1")).toBeDefined();
    });

    it("削除クリック時にwindow.confirmが呼ばれ、確認後にonDeleteConversationが呼ばれる", () => {
      const onDeleteConversation = vi.fn();
      const confirmSpy = vi
        .spyOn(window, "confirm")
        .mockReturnValue(true);

      render(
        <ChatSidebar
          {...defaultProps}
          onDeleteConversation={onDeleteConversation}
        />
      );

      fireEvent.click(screen.getByTestId("menu-button-conv-1"));
      fireEvent.click(screen.getByText("削除"));

      expect(confirmSpy).toHaveBeenCalledWith("この会話を削除しますか？");
      expect(onDeleteConversation).toHaveBeenCalledWith("conv-1");

      confirmSpy.mockRestore();
    });

    it("削除確認をキャンセルした場合、onDeleteConversationは呼ばれない", () => {
      const onDeleteConversation = vi.fn();
      const confirmSpy = vi
        .spyOn(window, "confirm")
        .mockReturnValue(false);

      render(
        <ChatSidebar
          {...defaultProps}
          onDeleteConversation={onDeleteConversation}
        />
      );

      fireEvent.click(screen.getByTestId("menu-button-conv-1"));
      fireEvent.click(screen.getByText("削除"));

      expect(confirmSpy).toHaveBeenCalled();
      expect(onDeleteConversation).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe("モバイル表示", () => {
    it("モバイル時は折りたたみボタンが表示されない", () => {
      render(<ChatSidebar {...defaultProps} isMobile={true} />);

      expect(screen.queryByTestId("toggle-sidebar-button")).toBeNull();
    });
  });
});
