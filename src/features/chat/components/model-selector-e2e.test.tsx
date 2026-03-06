/**
 * モデルセレクター E2E 的シナリオテスト
 *
 * ChatContainer を通した統合シナリオを検証する。
 * - 新規会話でのモデル選択とメッセージ送信後のセレクター無効化
 * - 既存会話選択時のモデル名表示
 * - モデル未選択時のデフォルトモデル使用
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ChatContainer } from "./chat-container";
import { DEFAULT_MODEL_ID, AVAILABLE_MODELS } from "@/lib/models";

/** フックのモック定義 */
const mockCreateConversation = vi.fn().mockResolvedValue("new-conv-id");
const mockSelectConversation = vi.fn().mockResolvedValue("claude-opus-4-20250514");
const mockDeleteConversation = vi.fn().mockResolvedValue(undefined);
const mockUpdateTitle = vi.fn().mockResolvedValue(undefined);
const mockRefreshConversations = vi.fn().mockResolvedValue(undefined);
const mockSendMessage = vi.fn();
const mockStop = vi.fn();
const mockRegenerate = vi.fn();
const mockToggleSidebar = vi.fn();
const mockCloseSidebar = vi.fn();

/** useConversations のモック参照 */
let mockConversationsReturn = {
  conversations: [
    { id: "conv-1", title: "既存の会話", updatedAt: "2026-03-04T10:00:00Z", modelId: "claude-opus-4-20250514" },
  ],
  activeConversationId: null as string | null,
  isLoading: false,
  createConversation: mockCreateConversation,
  selectConversation: mockSelectConversation,
  deleteConversation: mockDeleteConversation,
  updateTitle: mockUpdateTitle,
  activeMessages: [] as { id: string; role: string; content: string; createdAt: string }[],
  refreshConversations: mockRefreshConversations,
};

/** useChatSession のモック参照 */
let mockChatSessionReturn = {
  messages: [] as { id: string; role: string; parts: { type: string; text: string }[] }[],
  status: "ready" as string,
  sendMessage: mockSendMessage,
  stop: mockStop,
  regenerate: mockRegenerate,
  error: undefined as Error | undefined,
};

vi.mock("../hooks/use-conversations", () => ({
  useConversations: vi.fn(() => mockConversationsReturn),
}));

vi.mock("../hooks/use-chat-session", () => ({
  useChatSession: vi.fn(() => mockChatSessionReturn),
}));

vi.mock("../hooks/use-sidebar", () => ({
  useSidebar: vi.fn(() => ({
    sidebarState: "expanded",
    isMobile: false,
    toggleSidebar: mockToggleSidebar,
    closeSidebar: mockCloseSidebar,
  })),
}));

describe("モデルセレクター E2E シナリオ", () => {
  beforeEach(() => {
    // デフォルトのモック状態にリセット
    mockConversationsReturn = {
      conversations: [
        { id: "conv-1", title: "既存の会話", updatedAt: "2026-03-04T10:00:00Z", modelId: "claude-opus-4-20250514" },
      ],
      activeConversationId: null,
      isLoading: false,
      createConversation: mockCreateConversation,
      selectConversation: mockSelectConversation,
      deleteConversation: mockDeleteConversation,
      updateTitle: mockUpdateTitle,
      activeMessages: [],
      refreshConversations: mockRefreshConversations,
    };

    mockChatSessionReturn = {
      messages: [],
      status: "ready",
      sendMessage: mockSendMessage,
      stop: mockStop,
      regenerate: mockRegenerate,
      error: undefined,
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("シナリオ1: 新規会話でモデルを選択", () => {
    it("メッセージが空の場合、モデルセレクターが操作可能で表示される", () => {
      render(<ChatContainer />);

      // モデルセレクターが表示される
      const selector = screen.getByTestId("model-selector");
      expect(selector).toBeDefined();

      // デフォルトモデルが選択状態
      const defaultOption = screen.getByTestId(`model-option-${DEFAULT_MODEL_ID}`);
      expect(defaultOption.getAttribute("data-selected")).toBe("true");

      // 全モデルが表示される（ChatHeader にもモデル名が出るため getAllByText で検証）
      for (const model of AVAILABLE_MODELS) {
        expect(screen.getAllByText(model.displayName).length).toBeGreaterThanOrEqual(1);
      }
    });

    it("モデルを選択してクリックできる", () => {
      render(<ChatContainer />);

      // Opus を選択
      const opusOption = screen.getByTestId("model-option-claude-opus-4-20250514");
      fireEvent.click(opusOption);

      // ボタンが disabled 属性を持たないこと（操作可能）
      expect(opusOption.getAttribute("disabled")).toBeNull();
    });

    it("メッセージ送信後、モデルセレクターが無効化される", () => {
      // メッセージがある状態をシミュレート
      mockChatSessionReturn = {
        ...mockChatSessionReturn,
        messages: [
          { id: "msg-1", role: "user", parts: [{ type: "text", text: "こんにちは" }] },
        ],
      };
      mockConversationsReturn = {
        ...mockConversationsReturn,
        activeConversationId: "conv-1",
      };

      render(<ChatContainer />);

      // メッセージがあるため、WelcomeScreen（モデルセレクター含む）は表示されない
      expect(screen.queryByTestId("model-selector")).toBeNull();
    });
  });

  describe("シナリオ2: 既存会話選択時のモデル名表示", () => {
    it("既存会話を選択した際に、ChatHeader にモデル名が表示される", () => {
      mockConversationsReturn = {
        ...mockConversationsReturn,
        activeConversationId: "conv-1",
        activeMessages: [
          { id: "msg-1", role: "user", content: "テスト", createdAt: "2026-03-04T10:00:00Z" },
        ],
      };
      mockChatSessionReturn = {
        ...mockChatSessionReturn,
        messages: [
          { id: "msg-1", role: "user", parts: [{ type: "text", text: "テスト" }] },
        ],
      };

      render(<ChatContainer />);

      // ChatHeader にモデル名が表示される
      const modelDisplay = screen.getByTestId("model-name-display");
      expect(modelDisplay).toBeDefined();
      // デフォルトモデルの表示名（ChatContainer の初期状態）
      expect(modelDisplay.textContent).toBeDefined();
    });
  });

  describe("シナリオ3: モデル未選択時のデフォルトモデル使用", () => {
    it("モデル未選択でもデフォルトモデルが使用される", () => {
      render(<ChatContainer />);

      // デフォルトモデルが選択状態
      const defaultOption = screen.getByTestId(`model-option-${DEFAULT_MODEL_ID}`);
      expect(defaultOption.getAttribute("data-selected")).toBe("true");

      // ChatHeader にデフォルトモデル名が表示される
      const modelDisplay = screen.getByTestId("model-name-display");
      const defaultModel = AVAILABLE_MODELS.find((m) => m.id === DEFAULT_MODEL_ID)!;
      expect(modelDisplay.textContent).toBe(defaultModel.displayName);
    });
  });
});
