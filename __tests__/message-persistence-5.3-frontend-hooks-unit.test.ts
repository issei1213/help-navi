/**
 * メッセージ永続化 - タスク5.3: フロントエンドフックのユニットテスト
 *
 * useConversations と useChatSession フックの
 * アクセプタンスクライテリアを網羅的にテストする。
 *
 * 既存テストファイル（use-conversations.test.ts, use-chat-session.test.ts）を
 * 補完し、タスク5.3で要求されるテストケースを追加する。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.5, 4.1, 7.1, 7.2
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ============================================================================
// useConversations テスト
// ============================================================================

describe("useConversations - アクセプタンスクライテリア網羅テスト", () => {
  /** fetch モック用のレスポンス生成ヘルパー */
  function mockFetchResponse(data: unknown, status = 200) {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    } as Response);
  }

  /** テスト用の会話データ */
  const mockConversations = [
    { id: "conv-1", title: "会話1", updatedAt: "2026-03-04T10:00:00Z" },
    { id: "conv-2", title: "会話2", updatedAt: "2026-03-04T09:00:00Z" },
  ];

  /** テスト用のメッセージデータ */
  const mockMessages = [
    {
      id: "msg-1",
      role: "user",
      content: "こんにちは",
      createdAt: "2026-03-04T10:00:00Z",
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "こんにちは！",
      createdAt: "2026-03-04T10:00:01Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("Req 1.1: 会話作成と楽観的キャッシュ更新", () => {
    it("作成後にactiveConversationIdが新しい会話IDに設定される", async () => {
      const { useConversations } = await import(
        "@/features/chat/hooks/use-conversations"
      );

      const newConv = {
        id: "conv-new",
        title: "新しいチャット",
        createdAt: "2026-03-04T11:00:00Z",
        updatedAt: "2026-03-04T11:00:00Z",
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation((url) => {
          if (
            url === "/api/conversations" &&
            fetchSpy.mock.calls.length === 1
          ) {
            return mockFetchResponse(mockConversations);
          }
          return mockFetchResponse(newConv, 201);
        });

      const { result } = renderHook(() => useConversations());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createConversation();
      });

      expect(result.current.activeConversationId).toBe("conv-new");
    });

    it("作成後にactiveMessagesが空配列にクリアされる", async () => {
      const { useConversations } = await import(
        "@/features/chat/hooks/use-conversations"
      );

      const newConv = {
        id: "conv-new",
        title: "新しいチャット",
        createdAt: "2026-03-04T11:00:00Z",
        updatedAt: "2026-03-04T11:00:00Z",
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation((url) => {
          if (
            url === "/api/conversations" &&
            fetchSpy.mock.calls.length === 1
          ) {
            return mockFetchResponse(mockConversations);
          }
          if (url === "/api/conversations/conv-1/messages") {
            return mockFetchResponse(mockMessages);
          }
          return mockFetchResponse(newConv, 201);
        });

      const { result } = renderHook(() => useConversations());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // まず会話を選択してメッセージをロード
      await act(async () => {
        await result.current.selectConversation("conv-1");
      });
      expect(result.current.activeMessages).toHaveLength(2);

      // 新しい会話を作成
      await act(async () => {
        await result.current.createConversation();
      });

      // activeMessagesがクリアされている
      expect(result.current.activeMessages).toEqual([]);
    });

    it("作成した会話が一覧の先頭に楽観的に追加される", async () => {
      const { useConversations } = await import(
        "@/features/chat/hooks/use-conversations"
      );

      const newConv = {
        id: "conv-new",
        title: "新しいチャット",
        createdAt: "2026-03-04T11:00:00Z",
        updatedAt: "2026-03-04T11:00:00Z",
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation((url) => {
          if (
            url === "/api/conversations" &&
            fetchSpy.mock.calls.length === 1
          ) {
            return mockFetchResponse(mockConversations);
          }
          return mockFetchResponse(newConv, 201);
        });

      const { result } = renderHook(() => useConversations());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalCount = result.current.conversations.length;

      await act(async () => {
        await result.current.createConversation();
      });

      expect(result.current.conversations[0].id).toBe("conv-new");
      expect(result.current.conversations[0].title).toBe("新しいチャット");
      expect(result.current.conversations.length).toBe(originalCount + 1);
    });
  });

  describe("Req 1.2: 会話一覧フェッチ", () => {
    it("初回マウント時にGET /api/conversationsを呼び出す", async () => {
      const { useConversations } = await import(
        "@/features/chat/hooks/use-conversations"
      );

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(() => mockFetchResponse(mockConversations));

      renderHook(() => useConversations());

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith("/api/conversations");
      });
    });

    it("ローディング中はisLoading=trueでconversationsは空配列", async () => {
      const { useConversations } = await import(
        "@/features/chat/hooks/use-conversations"
      );

      vi.spyOn(globalThis, "fetch").mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockConversations),
                } as Response),
              100
            )
          )
      );

      const { result } = renderHook(() => useConversations());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.conversations).toEqual([]);
    });
  });

  describe("Req 1.3: 楽観的キャッシュ更新（タイトル更新）", () => {
    it("タイトル更新後にローカルキャッシュのtitleとupdatedAtが反映される", async () => {
      const { useConversations } = await import(
        "@/features/chat/hooks/use-conversations"
      );

      const updatedConv = {
        id: "conv-1",
        title: "更新タイトル",
        updatedAt: "2026-03-04T12:00:00Z",
      };

      vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => {
        if (url === "/api/conversations") {
          return mockFetchResponse(mockConversations);
        }
        if (
          url === "/api/conversations/conv-1" &&
          (options as RequestInit)?.method === "PATCH"
        ) {
          return mockFetchResponse(updatedConv);
        }
        return mockFetchResponse({}, 404);
      });

      const { result } = renderHook(() => useConversations());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateTitle("conv-1", "更新タイトル");
      });

      const item = result.current.conversations.find(
        (c) => c.id === "conv-1"
      );
      expect(item?.title).toBe("更新タイトル");
      expect(item?.updatedAt).toBe("2026-03-04T12:00:00Z");
    });
  });

  describe("Req 1.5: 楽観的キャッシュ更新（削除）", () => {
    it("削除後にローカルキャッシュから即座に除外される", async () => {
      const { useConversations } = await import(
        "@/features/chat/hooks/use-conversations"
      );

      vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => {
        if (url === "/api/conversations" && !options?.method) {
          return mockFetchResponse(mockConversations);
        }
        if (
          url === "/api/conversations/conv-1" &&
          (options as RequestInit)?.method === "DELETE"
        ) {
          return mockFetchResponse({ success: true });
        }
        return mockFetchResponse({}, 404);
      });

      const { result } = renderHook(() => useConversations());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversations).toHaveLength(2);

      await act(async () => {
        await result.current.deleteConversation("conv-1");
      });

      expect(result.current.conversations).toHaveLength(1);
      expect(
        result.current.conversations.find((c) => c.id === "conv-1")
      ).toBeUndefined();
    });
  });

  describe("Req 4.1: 会話選択時のメッセージ取得", () => {
    it("選択した会話のメッセージがactiveMessagesに設定される", async () => {
      const { useConversations } = await import(
        "@/features/chat/hooks/use-conversations"
      );

      vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
        if (url === "/api/conversations") {
          return mockFetchResponse(mockConversations);
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

      await act(async () => {
        await result.current.selectConversation("conv-1");
      });

      expect(result.current.activeMessages).toHaveLength(2);
      expect(result.current.activeMessages[0].role).toBe("user");
      expect(result.current.activeMessages[0].content).toBe("こんにちは");
      expect(result.current.activeMessages[1].role).toBe("assistant");
    });

    it("メッセージ取得失敗時はactiveMessagesが空配列になる", async () => {
      const { useConversations } = await import(
        "@/features/chat/hooks/use-conversations"
      );

      vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
        if (url === "/api/conversations") {
          return mockFetchResponse(mockConversations);
        }
        if (url === "/api/conversations/conv-1/messages") {
          return mockFetchResponse({ error: "取得失敗" }, 500);
        }
        return mockFetchResponse({}, 404);
      });

      const { result } = renderHook(() => useConversations());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.selectConversation("conv-1");
      });

      expect(result.current.activeMessages).toEqual([]);
    });
  });

  describe("エラーハンドリング: APIフェッチ失敗時のフォールバック", () => {
    it("会話一覧のフェッチがネットワークエラーの場合、空配列でフォールバック", async () => {
      const { useConversations } = await import(
        "@/features/chat/hooks/use-conversations"
      );

      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("ネットワークエラー")
      );

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversations).toEqual([]);
    });
  });
});

// ============================================================================
// useChatSession テスト
// ============================================================================

/** useChat のモック（vi.hoisted でファクトリ内から参照可能にする） */
const { mockSendMessage, mockStop, mockReload, mockUseChat } = vi.hoisted(
  () => {
    const mockSendMessage = vi.fn();
    const mockStop = vi.fn();
    const mockReload = vi.fn();
    const mockUseChat = vi.fn(
      (options: { id?: string; initialMessages?: unknown[] }) => ({
        messages: options?.initialMessages || [],
        status: "ready" as const,
        sendMessage: mockSendMessage,
        stop: mockStop,
        reload: mockReload,
      })
    );
    return { mockSendMessage, mockStop, mockReload, mockUseChat };
  }
);

/** MockTransportのコンストラクタ引数をキャプチャするための変数 */
const { mockTransportConstructor } = vi.hoisted(() => {
  const mockTransportConstructor = vi.fn();
  return { mockTransportConstructor };
});

vi.mock("@ai-sdk/react", () => ({
  useChat: mockUseChat,
}));

vi.mock("ai", () => ({
  DefaultChatTransport: class MockTransport {
    api: string;
    body: unknown;
    constructor(opts: { api: string; body?: unknown }) {
      this.api = opts.api;
      this.body = opts.body;
      mockTransportConstructor(opts);
    }
  },
}));

describe("useChatSession - アクセプタンスクライテリア網羅テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Req 7.1: conversationId未指定時の動作", () => {
    it("conversationIdがnullの場合、sendMessageは何もしない", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

      const { result } = renderHook(() =>
        useChatSession({
          conversationId: null,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.sendMessage("テスト");
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it("conversationIdがnullの場合、useChatのidはundefinedになる", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

      renderHook(() =>
        useChatSession({
          conversationId: null,
          initialMessages: [],
        })
      );

      expect(mockUseChat).toHaveBeenCalledWith(
        expect.objectContaining({
          id: undefined,
        })
      );
    });

    it("conversationIdがnullの場合、Transportのbodyはundefinedになる", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

      renderHook(() =>
        useChatSession({
          conversationId: null,
          initialMessages: [],
        })
      );

      expect(mockTransportConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          api: "/api/chat",
          body: undefined,
        })
      );
    });
  });

  describe("Req 7.2: conversationId指定時の動作", () => {
    it("conversationIdが設定されている場合、sendMessageが有効になる", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

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

    it("conversationIdが設定されている場合、TransportのbodyにconversationIdが含まれる", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

      renderHook(() =>
        useChatSession({
          conversationId: "conv-abc-123",
          initialMessages: [],
        })
      );

      expect(mockTransportConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          api: "/api/chat",
          body: { conversationId: "conv-abc-123" },
        })
      );
    });

    it("conversationIdがuseChatのidとして渡される", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

      renderHook(() =>
        useChatSession({
          conversationId: "conv-xyz",
          initialMessages: [],
        })
      );

      expect(mockUseChat).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "conv-xyz",
        })
      );
    });
  });

  describe("Req 4.1: initialMessagesの渡し方", () => {
    it("DB取得済みのinitialMessagesがuseChatに透過的に渡される", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

      const initialMessages = [
        {
          id: "msg-1",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "過去のメッセージ1" }],
        },
        {
          id: "msg-2",
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: "過去の応答1" }],
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

    it("initialMessagesが空配列の場合もuseChatに正しく渡される", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

      renderHook(() =>
        useChatSession({
          conversationId: "conv-1",
          initialMessages: [],
        })
      );

      expect(mockUseChat).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMessages: [],
        })
      );
    });
  });

  describe("Transport生成のconversationId連動", () => {
    it("conversationId変更時にTransportが再生成される", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

      const { rerender } = renderHook(
        (props: { conversationId: string | null }) =>
          useChatSession({
            conversationId: props.conversationId,
            initialMessages: [],
          }),
        {
          initialProps: { conversationId: "conv-1" as string | null },
        }
      );

      // 初回のTransport生成
      const firstCallCount = mockTransportConstructor.mock.calls.length;
      expect(firstCallCount).toBeGreaterThanOrEqual(1);

      // conversationIdを変更してrerenderする
      rerender({ conversationId: "conv-2" });

      // 新しいTransportが生成される
      expect(mockTransportConstructor.mock.calls.length).toBeGreaterThan(
        firstCallCount
      );

      // 最新のTransportにconv-2が含まれている
      const lastCall =
        mockTransportConstructor.mock.calls[
          mockTransportConstructor.mock.calls.length - 1
        ];
      expect(lastCall[0].body).toEqual({ conversationId: "conv-2" });
    });
  });

  describe("ストリーミング制御", () => {
    it("stopメソッドがuseChatのstopを呼び出す", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

      const { result } = renderHook(() =>
        useChatSession({
          conversationId: "conv-1",
          initialMessages: [],
        })
      );

      act(() => {
        result.current.stop();
      });

      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it("regenerateメソッドがuseChatのreloadを呼び出す", async () => {
      const { useChatSession } = await import(
        "@/features/chat/hooks/use-chat-session"
      );

      const { result } = renderHook(() =>
        useChatSession({
          conversationId: "conv-1",
          initialMessages: [],
        })
      );

      act(() => {
        result.current.regenerate();
      });

      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });
});
