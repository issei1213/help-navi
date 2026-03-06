/**
 * ChatContainer コンポーネントのレンダリングテスト
 *
 * 3つのカスタムフックの統合、Presentationalコンポーネントへのprops分配をテストする。
 * モデル選択の state 管理と各コンポーネントへの伝達をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ChatContainer } from "./chat-container";

/** フックのモック */
const mockCreateConversation = vi.fn().mockResolvedValue("new-conv-id");
const mockSelectConversation = vi.fn().mockResolvedValue(null);
const mockDeleteConversation = vi.fn().mockResolvedValue(undefined);
const mockUpdateTitle = vi.fn().mockResolvedValue(undefined);
const mockRefreshConversations = vi.fn().mockResolvedValue(undefined);
const mockSendMessage = vi.fn();
const mockStop = vi.fn();
const mockRegenerate = vi.fn();
const mockToggleSidebar = vi.fn();
const mockCloseSidebar = vi.fn();

/** useChatSession のモック参照（引数を検証するため） */
const mockUseChatSession = vi.fn(() => ({
  messages: [],
  status: "ready",
  sendMessage: mockSendMessage,
  stop: mockStop,
  regenerate: mockRegenerate,
}));

vi.mock("../hooks/use-conversations", () => ({
  useConversations: vi.fn(() => ({
    conversations: [
      { id: "conv-1", title: "テスト会話", updatedAt: "2026-03-04T10:00:00Z", modelId: "claude-sonnet-4-20250514" },
    ],
    activeConversationId: "conv-1",
    isLoading: false,
    createConversation: mockCreateConversation,
    selectConversation: mockSelectConversation,
    deleteConversation: mockDeleteConversation,
    updateTitle: mockUpdateTitle,
    activeMessages: [],
    refreshConversations: mockRefreshConversations,
  })),
}));

vi.mock("../hooks/use-chat-session", () => ({
  useChatSession: (params: unknown) => mockUseChatSession(params),
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

  describe("モデル選択", () => {
    it("useChatSession に modelId を渡す", () => {
      render(<ChatContainer />);

      // useChatSession が modelId パラメータ付きで呼ばれること
      expect(mockUseChatSession).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: expect.any(String),
        })
      );
    });

    it("メッセージが空の場合、モデルセレクターが表示される", () => {
      render(<ChatContainer />);

      // ウェルカム画面にモデルセレクターが含まれる
      expect(screen.getByTestId("model-selector")).toBeDefined();
    });

    it("エラー発生時にエラーメッセージを表示する", () => {
      mockUseChatSession.mockReturnValueOnce({
        messages: [],
        status: "error",
        sendMessage: mockSendMessage,
        stop: mockStop,
        regenerate: mockRegenerate,
        error: new Error("指定されたモデルは利用できません。別のモデルを選択してください。"),
      });

      render(<ChatContainer />);

      expect(
        screen.getByText("指定されたモデルは利用できません。別のモデルを選択してください。")
      ).toBeDefined();
    });
  });
});
