/**
 * useConversations フックのユニットテスト
 *
 * 会話一覧のCRUD操作、キャッシュ管理、選択中会話のメッセージ取得をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useConversations } from "./use-conversations";

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
  { id: "conv-1", title: "会話1", updatedAt: "2026-03-04T10:00:00Z", modelId: "claude-sonnet-4-20250514" },
  { id: "conv-2", title: "会話2", updatedAt: "2026-03-04T09:00:00Z", modelId: null },
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
    content: "こんにちは！何かお手伝いしましょうか？",
    createdAt: "2026-03-04T10:00:01Z",
  },
];

describe("useConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期化", () => {
    it("マウント時に会話一覧をフェッチする", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(() => mockFetchResponse(mockConversations));

      const { result } = renderHook(() => useConversations());

      // 初期状態はローディング
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetchSpy).toHaveBeenCalledWith("/api/conversations");
      expect(result.current.conversations).toEqual(mockConversations);
      expect(result.current.activeConversationId).toBeNull();
    });
  });

  describe("createConversation", () => {
    it("新しい会話を作成し、IDを返す", async () => {
      const newConv = {
        id: "conv-new",
        title: "新しいチャット",
        createdAt: "2026-03-04T11:00:00Z",
        updatedAt: "2026-03-04T11:00:00Z",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
        if (url === "/api/conversations" && fetchSpy.mock.calls.length === 1) {
          // 初期ロード
          return mockFetchResponse(mockConversations);
        }
        // 作成 POST
        return mockFetchResponse(newConv, 201);
      });

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let newId: string = "";
      await act(async () => {
        newId = await result.current.createConversation();
      });

      expect(newId).toBe("conv-new");
      expect(result.current.activeConversationId).toBe("conv-new");
      // 新しい会話が一覧の先頭に追加される
      expect(result.current.conversations[0].id).toBe("conv-new");
    });
  });

  describe("selectConversation", () => {
    it("会話を選択し、メッセージを取得する", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation((url) => {
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

      expect(result.current.activeConversationId).toBe("conv-1");
      expect(result.current.activeMessages).toHaveLength(2);
      expect(result.current.activeMessages[0].content).toBe("こんにちは");
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/conversations/conv-1/messages"
      );
    });
  });

  describe("updateTitle", () => {
    it("会話タイトルを更新する", async () => {
      const updatedConv = {
        id: "conv-1",
        title: "更新されたタイトル",
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
        await result.current.updateTitle("conv-1", "更新されたタイトル");
      });

      const updatedItem = result.current.conversations.find(
        (c) => c.id === "conv-1"
      );
      expect(updatedItem?.title).toBe("更新されたタイトル");
    });
  });

  describe("deleteConversation", () => {
    it("会話を削除し、一覧から除外する", async () => {
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

      await act(async () => {
        await result.current.deleteConversation("conv-1");
      });

      expect(result.current.conversations).toHaveLength(1);
      expect(
        result.current.conversations.find((c) => c.id === "conv-1")
      ).toBeUndefined();
    });

    it("選択中の会話を削除した場合、activeConversationId が null になる", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => {
        if (url === "/api/conversations" && !options?.method) {
          return mockFetchResponse(mockConversations);
        }
        if (url === "/api/conversations/conv-1/messages") {
          return mockFetchResponse(mockMessages);
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

      // まず会話を選択
      await act(async () => {
        await result.current.selectConversation("conv-1");
      });
      expect(result.current.activeConversationId).toBe("conv-1");

      // 選択中の会話を削除
      await act(async () => {
        await result.current.deleteConversation("conv-1");
      });

      expect(result.current.activeConversationId).toBeNull();
      expect(result.current.activeMessages).toEqual([]);
    });
  });

  describe("エラーハンドリング", () => {
    it("会話一覧のフェッチ失敗時は空配列を維持する", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(() =>
        mockFetchResponse({ error: "サーバーエラー" }, 500)
      );

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversations).toEqual([]);
    });

    it("会話作成失敗時はエラーをスローする", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
        if (url === "/api/conversations") {
          // 初回GET
          if (!vi.mocked(globalThis.fetch).mock.calls.find(
            (c) => c[1] && (c[1] as RequestInit).method === "POST"
          )) {
            return mockFetchResponse(mockConversations);
          }
          // POST失敗
          return mockFetchResponse({ error: "作成失敗" }, 500);
        }
        return mockFetchResponse({}, 404);
      });

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.createConversation();
        })
      ).rejects.toThrow("会話の作成に失敗しました");
    });

    it("会話削除失敗時はエラーをスローし、一覧を維持する", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => {
        if (url === "/api/conversations" && !options?.method) {
          return mockFetchResponse(mockConversations);
        }
        if (
          url === "/api/conversations/conv-1" &&
          (options as RequestInit)?.method === "DELETE"
        ) {
          return mockFetchResponse({ error: "削除失敗" }, 500);
        }
        return mockFetchResponse({}, 404);
      });

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 削除前の会話数を記録
      const countBefore = result.current.conversations.length;

      await expect(
        act(async () => {
          await result.current.deleteConversation("conv-1");
        })
      ).rejects.toThrow("会話の削除に失敗しました");

      // 一覧が変更されていないことを確認
      expect(result.current.conversations.length).toBe(countBefore);
    });

    it("タイトル更新失敗時はエラーをスローし、一覧を維持する", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => {
        if (url === "/api/conversations" && !options?.method) {
          return mockFetchResponse(mockConversations);
        }
        if (
          url === "/api/conversations/conv-1" &&
          (options as RequestInit)?.method === "PATCH"
        ) {
          return mockFetchResponse({ error: "更新失敗" }, 500);
        }
        return mockFetchResponse({}, 404);
      });

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateTitle("conv-1", "新しいタイトル");
        })
      ).rejects.toThrow("タイトルの更新に失敗しました");

      // タイトルが変更されていないことを確認
      const item = result.current.conversations.find((c) => c.id === "conv-1");
      expect(item?.title).toBe("会話1");
    });
  });

  describe("modelId管理", () => {
    it("会話一覧のレスポンスに modelId が含まれる", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(() =>
        mockFetchResponse(mockConversations)
      );

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversations[0].modelId).toBe("claude-sonnet-4-20250514");
      expect(result.current.conversations[1].modelId).toBeNull();
    });

    it("createConversation に modelId を渡すと POST ボディに含まれる", async () => {
      const newConv = {
        id: "conv-new",
        title: "新しいチャット",
        modelId: "claude-opus-4-20250514",
        createdAt: "2026-03-04T11:00:00Z",
        updatedAt: "2026-03-04T11:00:00Z",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => {
        if (url === "/api/conversations" && !(options as RequestInit)?.method) {
          return mockFetchResponse(mockConversations);
        }
        return mockFetchResponse(newConv, 201);
      });

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createConversation("claude-opus-4-20250514");
      });

      // POST リクエストのボディに modelId が含まれること
      const postCall = fetchSpy.mock.calls.find(
        (c) => (c[1] as RequestInit)?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.modelId).toBe("claude-opus-4-20250514");
    });

    it("selectConversation で会話の modelId を返却する", async () => {
      const messagesResponse = {
        modelId: "claude-sonnet-4-20250514",
        messages: mockMessages,
      };

      vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
        if (url === "/api/conversations") {
          return mockFetchResponse(mockConversations);
        }
        if (url === "/api/conversations/conv-1/messages") {
          return mockFetchResponse(messagesResponse);
        }
        return mockFetchResponse({}, 404);
      });

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let returnedModelId: string | null = null;
      await act(async () => {
        returnedModelId = await result.current.selectConversation("conv-1");
      });

      expect(returnedModelId).toBe("claude-sonnet-4-20250514");
    });
  });

  describe("選択中でない会話の削除", () => {
    it("選択中でない会話を削除しても activeConversationId は変わらない", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => {
        if (url === "/api/conversations" && !options?.method) {
          return mockFetchResponse(mockConversations);
        }
        if (url === "/api/conversations/conv-1/messages") {
          return mockFetchResponse(mockMessages);
        }
        if (
          url === "/api/conversations/conv-2" &&
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

      // conv-1 を選択
      await act(async () => {
        await result.current.selectConversation("conv-1");
      });
      expect(result.current.activeConversationId).toBe("conv-1");

      // conv-2 を削除（選択中ではない会話）
      await act(async () => {
        await result.current.deleteConversation("conv-2");
      });

      // activeConversationId は conv-1 のまま
      expect(result.current.activeConversationId).toBe("conv-1");
      // activeMessages も維持されている
      expect(result.current.activeMessages).toHaveLength(2);
    });
  });
});
