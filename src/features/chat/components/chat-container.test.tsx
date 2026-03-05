/**
 * ChatContainer コンポーネントのレンダリングテスト
 *
 * 3つのカスタムフックの統合、Presentationalコンポーネントへのprops分配をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ChatContainer } from "./chat-container";

/** フックのモック */
const mockCreateConversation = vi.fn().mockResolvedValue("new-conv-id");
const mockSelectConversation = vi.fn().mockResolvedValue(undefined);
const mockDeleteConversation = vi.fn().mockResolvedValue(undefined);
const mockUpdateTitle = vi.fn().mockResolvedValue(undefined);
const mockSendMessage = vi.fn();
const mockStop = vi.fn();
const mockRegenerate = vi.fn();
const mockToggleSidebar = vi.fn();
const mockCloseSidebar = vi.fn();

vi.mock("../hooks/use-conversations", () => ({
  useConversations: vi.fn(() => ({
    conversations: [
      { id: "conv-1", title: "テスト会話", updatedAt: "2026-03-04T10:00:00Z" },
    ],
    activeConversationId: "conv-1",
    isLoading: false,
    createConversation: mockCreateConversation,
    selectConversation: mockSelectConversation,
    deleteConversation: mockDeleteConversation,
    updateTitle: mockUpdateTitle,
    activeMessages: [],
  })),
}));

vi.mock("../hooks/use-chat-session", () => ({
  useChatSession: vi.fn(() => ({
    messages: [],
    status: "ready",
    sendMessage: mockSendMessage,
    stop: mockStop,
    regenerate: mockRegenerate,
  })),
}));

vi.mock("../hooks/use-sidebar", () => ({
  useSidebar: vi.fn(() => ({
    sidebarState: "expanded",
    isMobile: false,
    toggleSidebar: mockToggleSidebar,
    closeSidebar: mockCloseSidebar,
  })),
}));

describe("ChatContainer", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("ChatLayout（全体レイアウト）をレンダリングする", () => {
    render(<ChatContainer />);

    // レイアウトコンテナが存在する（h-screen クラスを持つ）
    const layout = document.querySelector(".h-screen");
    expect(layout).toBeTruthy();
  });

  it("サイドバーコンテンツをレンダリングする", () => {
    render(<ChatContainer />);

    // サイドバーの「新しいチャット」ボタンが表示される
    expect(screen.getByText("新しいチャット")).toBeDefined();
  });

  it("ヘッダーとサイドバーに会話タイトルを表示する", () => {
    render(<ChatContainer />);

    // ヘッダーとサイドバーの両方にタイトルが表示される
    const titleElements = screen.getAllByText("テスト会話");
    expect(titleElements.length).toBeGreaterThanOrEqual(2);
  });

  it("メッセージが空の場合、ウェルカム画面を表示する", () => {
    render(<ChatContainer />);

    expect(screen.getByTestId("welcome-screen")).toBeDefined();
  });

  it("入力エリアを表示する", () => {
    render(<ChatContainer />);

    expect(
      screen.getByPlaceholderText("なんでも聞いてください")
    ).toBeDefined();
  });
});
