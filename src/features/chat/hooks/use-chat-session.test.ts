/**
 * useChatSession フックのユニットテスト
 *
 * useChat のラッパーとして、conversationId 連動、sendMessage、stop、regenerate をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatSession } from "./use-chat-session";

/** useChat のモック（vi.hoisted でファクトリ内から参照可能にする） */
const {
  mockSendMessage,
  mockStop,
  mockReload,
  mockUseChat,
} = vi.hoisted(() => {
  const mockSendMessage = vi.fn();
  const mockStop = vi.fn();
  const mockReload = vi.fn();
  const mockUseChat = vi.fn((options: { id?: string; initialMessages?: unknown[] }) => ({
    messages: options?.initialMessages || [],
    status: "ready" as const,
    sendMessage: mockSendMessage,
    stop: mockStop,
    reload: mockReload,
  }));
  return { mockSendMessage, mockStop, mockReload, mockUseChat };
});

vi.mock("@ai-sdk/react", () => ({
  useChat: mockUseChat,
}));

vi.mock("ai", () => ({
  DefaultChatTransport: class MockTransport {
    constructor() {
      // モックTransport
    }
  },
}));

describe("useChatSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期化", () => {
    it("conversationId と initialMessages を useChat に渡す", () => {
      const initialMessages = [
        {
          id: "msg-1",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "こんにちは" }],
        },
      ];

      const { result } = renderHook(() =>
        useChatSession({
          conversationId: "conv-1",
          initialMessages,
        })
      );

      expect(result.current.messages).toEqual(initialMessages);
      expect(result.current.status).toBe("ready");
    });

    it("conversationId が null の場合でも初期化できる", () => {
      const { result } = renderHook(() =>
        useChatSession({
          conversationId: null,
          initialMessages: [],
        })
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.status).toBe("ready");
    });
  });

  describe("sendMessage", () => {
    it("conversationId が設定されている場合、メッセージを送信できる", () => {
      const { result } = renderHook(() =>
        useChatSession({
          conversationId: "conv-1",
          initialMessages: [],
        })
      );

      act(() => {
        result.current.sendMessage("テストメッセージ");
      });

      expect(mockSendMessage).toHaveBeenCalledWith({
        text: "テストメッセージ",
      });
    });

    it("conversationId が null の場合、メッセージを送信しない", () => {
      const { result } = renderHook(() =>
        useChatSession({
          conversationId: null,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.sendMessage("テストメッセージ");
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("ストリーミングを停止する", () => {
      const { result } = renderHook(() =>
        useChatSession({
          conversationId: "conv-1",
          initialMessages: [],
        })
      );

      act(() => {
        result.current.stop();
      });

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe("regenerate", () => {
    it("最後のAIメッセージを再生成する", () => {
      const { result } = renderHook(() =>
        useChatSession({
          conversationId: "conv-1",
          initialMessages: [],
        })
      );

      act(() => {
        result.current.regenerate();
      });

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe("conversationId連動", () => {
    it("useChat に conversationId が id として渡される", () => {
      renderHook(() =>
        useChatSession({
          conversationId: "conv-test-123",
          initialMessages: [],
        })
      );

      // useChat が conversationId を id として受け取っていること
      expect(mockUseChat).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "conv-test-123",
        })
      );
    });

    it("conversationId が null の場合、useChat の id は undefined になる", () => {
      renderHook(() =>
        useChatSession({
          conversationId: null,
          initialMessages: [],
        })
      );

      // id が undefined で呼ばれること
      expect(mockUseChat).toHaveBeenCalledWith(
        expect.objectContaining({
          id: undefined,
        })
      );
    });

    it("initialMessages が useChat にそのまま渡される", () => {
      const initialMessages = [
        {
          id: "msg-test",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "テスト" }],
        },
      ];

      renderHook(() =>
        useChatSession({
          conversationId: "conv-1",
          initialMessages,
        })
      );

      expect(mockUseChat).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMessages,
        })
      );
    });
  });
});
