/**
 * useChatSession フックのユニットテスト
 *
 * useChat のラッパーとして、conversationId 連動、sendMessage、stop、regenerate をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { UIMessage } from "@ai-sdk/react";
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

/** DefaultChatTransport のモック（コンストラクタ引数を記録する） */
const mockTransportInstances: { api: string; body?: Record<string, unknown> }[] = [];

vi.mock("ai", () => ({
  DefaultChatTransport: class MockTransport {
    constructor(options: { api: string; body?: Record<string, unknown> }) {
      mockTransportInstances.push(options);
    }
  },
}));

describe("useChatSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransportInstances.length = 0;
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
          modelId: "claude-sonnet-4-20250514",
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
          modelId: "claude-sonnet-4-20250514",
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
          modelId: "claude-sonnet-4-20250514",
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
          modelId: "claude-sonnet-4-20250514",
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
          modelId: "claude-sonnet-4-20250514",
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
          modelId: "claude-sonnet-4-20250514",
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
          modelId: "claude-sonnet-4-20250514",
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
          modelId: "claude-sonnet-4-20250514",
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
          modelId: "claude-sonnet-4-20250514",
        })
      );

      expect(mockUseChat).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMessages,
        })
      );
    });
  });

  describe("エラーハンドリング", () => {
    it("useChat の error を返す", () => {
      const testError = new Error("指定されたモデルは利用できません。別のモデルを選択してください。");
      mockUseChat.mockReturnValueOnce({
        messages: [],
        status: "error" as const,
        sendMessage: mockSendMessage,
        stop: mockStop,
        reload: mockReload,
        error: testError,
      });

      const { result } = renderHook(() =>
        useChatSession({
          conversationId: "conv-1",
          initialMessages: [],
          modelId: "invalid-model",
        })
      );

      expect(result.current.status).toBe("error");
      expect(result.current.error).toBe(testError);
    });
  });

  describe("modelId連動", () => {
    it("DefaultChatTransport の body に modelId が含まれる", () => {
      renderHook(() =>
        useChatSession({
          conversationId: "conv-1",
          initialMessages: [],
          modelId: "claude-opus-4-20250514",
        })
      );

      // Transport のコンストラクタに渡された body に modelId が含まれること
      const lastTransport = mockTransportInstances[mockTransportInstances.length - 1];
      expect(lastTransport.body).toEqual(
        expect.objectContaining({ modelId: "claude-opus-4-20250514" })
      );
    });

    it("modelId 変更時に transport が再生成される", () => {
      const { rerender } = renderHook(
        (props) => useChatSession(props),
        {
          initialProps: {
            conversationId: "conv-1" as string | null,
            initialMessages: [] as UIMessage[],
            modelId: "claude-sonnet-4-20250514",
          },
        }
      );

      const countBefore = mockTransportInstances.length;

      rerender({
        conversationId: "conv-1",
        initialMessages: [],
        modelId: "claude-opus-4-20250514",
      });

      // modelId 変更により新しい transport インスタンスが生成される
      expect(mockTransportInstances.length).toBeGreaterThan(countBefore);
      const latestTransport = mockTransportInstances[mockTransportInstances.length - 1];
      expect(latestTransport.body).toEqual(
        expect.objectContaining({ modelId: "claude-opus-4-20250514" })
      );
    });
  });
});
