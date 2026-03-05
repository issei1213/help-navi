/**
 * useConversations フック
 *
 * 会話一覧のCRUD操作とキャッシュ管理を担うカスタムフック。
 * 会話の取得（更新日時降順）、新規作成、削除、タイトル更新、
 * 選択中の会話IDの管理と切替、メッセージ取得を提供する。
 *
 * @returns {UseConversationsReturn} 会話一覧の操作インターフェース
 */
import { useState, useEffect, useCallback } from "react";

/** 会話一覧の項目表示用型 */
export interface ConversationListItem {
  id: string;
  title: string;
  updatedAt: string;
}

/** APIから取得したメッセージ型 */
export interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

/** useConversations の戻り値型 */
export interface UseConversationsReturn {
  /** 会話一覧（更新日時降順） */
  conversations: ConversationListItem[];
  /** 現在選択中の会話ID（null = 未選択） */
  activeConversationId: string | null;
  /** ローディング状態 */
  isLoading: boolean;
  /** 新しい会話を作成し、IDを返す */
  createConversation: () => Promise<string>;
  /** 会話を選択し、メッセージを取得する */
  selectConversation: (id: string) => Promise<void>;
  /** 会話タイトルを更新する */
  updateTitle: (id: string, title: string) => Promise<void>;
  /** 会話を削除する */
  deleteConversation: (id: string) => Promise<void>;
  /** 選択中の会話に紐づくメッセージ */
  activeMessages: ConversationMessage[];
  /** 会話一覧を再取得する（タイトル自動生成後の反映用） */
  refreshConversations: () => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    []
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [activeMessages, setActiveMessages] = useState<ConversationMessage[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  /** 会話一覧をフェッチする */
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch("/api/conversations");
        if (!response.ok) {
          throw new Error("会話一覧の取得に失敗しました");
        }
        const data = await response.json();
        setConversations(data);
      } catch (error) {
        console.error("会話一覧フェッチエラー:", error);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  /** 新しい会話を作成し、IDを返す */
  const createConversation = useCallback(async (): Promise<string> => {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error("会話の作成に失敗しました");
    }

    const newConversation = await response.json();
    const newItem: ConversationListItem = {
      id: newConversation.id,
      title: newConversation.title,
      updatedAt: newConversation.updatedAt,
    };

    // 新しい会話を一覧の先頭に追加
    setConversations((prev) => [newItem, ...prev]);
    setActiveConversationId(newConversation.id);
    setActiveMessages([]);

    return newConversation.id;
  }, []);

  /** 会話を選択し、メッセージを取得する */
  const selectConversation = useCallback(async (id: string): Promise<void> => {
    setActiveConversationId(id);

    try {
      const response = await fetch(`/api/conversations/${id}/messages`);
      if (!response.ok) {
        throw new Error("メッセージの取得に失敗しました");
      }
      const messages = await response.json();
      setActiveMessages(messages);
    } catch (error) {
      console.error("メッセージ取得エラー:", error);
      setActiveMessages([]);
    }
  }, []);

  /** 会話タイトルを更新する */
  const updateTitle = useCallback(
    async (id: string, title: string): Promise<void> => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("タイトルの更新に失敗しました");
      }

      const updated = await response.json();

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id
            ? { ...conv, title: updated.title, updatedAt: updated.updatedAt }
            : conv
        )
      );
    },
    []
  );

  /** 会話を削除する */
  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("会話の削除に失敗しました");
      }

      setConversations((prev) => prev.filter((conv) => conv.id !== id));

      // 削除した会話が選択中だった場合、選択をリセット
      setActiveConversationId((prevId) => {
        if (prevId === id) {
          setActiveMessages([]);
          return null;
        }
        return prevId;
      });
    },
    []
  );

  /** 会話一覧を再取得する（ローディング状態は変更しない） */
  const refreshConversations = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/conversations");
      if (!response.ok) return;
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("会話一覧リフレッシュエラー:", error);
    }
  }, []);

  return {
    conversations,
    activeConversationId,
    isLoading,
    createConversation,
    selectConversation,
    updateTitle,
    deleteConversation,
    activeMessages,
    refreshConversations,
  };
}
