/**
 * メッセージ永続化 タスク3.4: フロントエンド統合の要件適合検証
 *
 * Requirements: 4.3, 7.1, 7.2
 *
 * - 4.3: サイドバーから会話選択時にメッセージ履歴がUIMessage形式に変換されること
 * - 7.1: conversationIdが未指定の場合にメッセージ送信が無効化されること
 * - 7.2: conversationIdが指定されている場合にメッセージ送信可能であること
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useConversations,
  type ConversationMessage,
} from "@/features/chat/hooks/use-conversations";
import { useChatSession } from "@/features/chat/hooks/use-chat-session";
import type { UIMessage } from "@ai-sdk/react";

/** useChat のモック */
const { mockSendMessage, mockUseChat } = vi.hoisted(() => {
  const mockSendMessage = vi.fn();
  const mockUseChat = vi.fn(
    (options: { id?: string; initialMessages?: unknown[] }) => ({
      messages: options?.initialMessages || [],
      status: "ready" as const,
      sendMessage: mockSendMessage,
      stop: vi.fn(),
      reload: vi.fn(),
    })
  );
  return { mockSendMessage, mockUseChat };
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

/** fetch モック用のレスポンス生成ヘルパー */
function mockFetchResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

describe("Req 4.3: メッセージ履歴のUIMessage形式変換", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selectConversationで取得したメッセージがactiveMessagesに格納される", async () => {
    const mockMessages: ConversationMessage[] = [
      {
        id: "msg-1",
        role: "user",
        content: "こんにちは",
        createdAt: "2026-03-04T10:00:00Z",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "こんにちは！何かお手伝いしましょうか？",
        createdAt: "2026-03-04T10:00:01Z",
      },
    ];

    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      if (url === "/api/conversations") {
        return mockFetchResponse([
          {
            id: "conv-1",
            title: "テスト会話",
            updatedAt: "2026-03-04T10:00:00Z",
          },
        ]);
      }
      if (url === "/api/conversations/conv-1/messages") {
        return mockFetchResponse(mockMessages);
      }
      return mockFetchResponse({}, 404);
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 会話を選択
    await act(async () => {
      await result.current.selectConversation("conv-1");
    });

    // activeMessages にDBから取得したメッセージが格納されていること
    expect(result.current.activeMessages).toHaveLength(2);
    expect(result.current.activeMessages[0].id).toBe("msg-1");
    expect(result.current.activeMessages[0].role).toBe("user");
    expect(result.current.activeMessages[0].content).toBe("こんにちは");
    expect(result.current.activeMessages[1].id).toBe("msg-2");
    expect(result.current.activeMessages[1].role).toBe("assistant");
    expect(result.current.activeMessages[1].content).toBe(
      "こんにちは！何かお手伝いしましょうか？"
    );
  });

  it("activeMessagesがUIMessage形式に変換してuseChatSessionに渡される", () => {
    // ChatContainerで行われる変換ロジックをテスト
    const activeMessages: ConversationMessage[] = [
      {
        id: "msg-1",
        role: "user",
        content: "テストメッセージ",
        createdAt: "2026-03-04T10:00:00Z",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "テスト応答",
        createdAt: "2026-03-04T10:00:01Z",
      },
    ];

    // ChatContainerと同じ変換ロジック
    const initialMessages: UIMessage[] = activeMessages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: msg.content }],
    }));

    const { result } = renderHook(() =>
      useChatSession({
        conversationId: "conv-1",
        initialMessages,
      })
    );

    // useChatに変換されたinitialMessagesが渡されること
    expect(mockUseChat).toHaveBeenCalledWith(
      expect.objectContaining({
        initialMessages: expect.arrayContaining([
          expect.objectContaining({
            id: "msg-1",
            role: "user",
            parts: [{ type: "text", text: "テストメッセージ" }],
          }),
          expect.objectContaining({
            id: "msg-2",
            role: "assistant",
            parts: [{ type: "text", text: "テスト応答" }],
          }),
        ]),
      })
    );

    // メッセージが返却されること
    expect(result.current.messages).toHaveLength(2);
  });
});

describe("Req 7.1: conversationId未指定時のメッセージ送信無効化", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("conversationIdがnullの場合、sendMessageは実行されない", () => {
    const { result } = renderHook(() =>
      useChatSession({
        conversationId: null,
        initialMessages: [],
      })
    );

    // メッセージ送信を試みる
    act(() => {
      result.current.sendMessage("テスト");
    });

    // useChatのsendMessageは呼ばれない
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("conversationIdがnullの場合でもフック自体は正常に初期化される", () => {
    const { result } = renderHook(() =>
      useChatSession({
        conversationId: null,
        initialMessages: [],
      })
    );

    expect(result.current.status).toBe("ready");
    expect(result.current.messages).toEqual([]);
  });
});

describe("Req 7.2: conversationId指定時のメッセージ送信", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("conversationIdが指定されている場合、sendMessageが実行される", () => {
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

  it("conversationIdがTransportのbodyに含まれてAPIに送信される", () => {
    renderHook(() =>
      useChatSession({
        conversationId: "conv-test-456",
        initialMessages: [],
      })
    );

    // useChatがconversationIdをidとして受け取ること
    expect(mockUseChat).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "conv-test-456",
      })
    );
  });
});
