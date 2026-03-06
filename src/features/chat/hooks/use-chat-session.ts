/**
 * useChatSession フック
 *
 * @ai-sdk/react の useChat をラップし、会話ID連動とメッセージ永続化を管理するフック。
 * conversationId と initialMessages の動的切替、sendMessage / stop / regenerate 操作を提供する。
 *
 * @param params - 会話IDと初期メッセージ
 * @returns {UseChatSessionReturn} チャットセッションの操作インターフェース
 */
import { useCallback, useMemo } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

/** チャットストリーミングの状態 */
export type ChatStatus = "submitted" | "streaming" | "ready" | "error";

/** useChatSession のパラメータ型 */
export interface UseChatSessionParams {
  /** 会話ID */
  conversationId: string | null;
  /** DB から取得した初期メッセージ */
  initialMessages: UIMessage[];
  /** 使用するモデル ID */
  modelId: string;
}

/** useChatSession の戻り値型 */
export interface UseChatSessionReturn {
  /** メッセージ一覧 */
  messages: UIMessage[];
  /** ストリーミング状態 */
  status: ChatStatus;
  /** メッセージ送信 */
  sendMessage: (text: string) => void;
  /** ストリーミング停止 */
  stop: () => void;
  /** 最後のAIメッセージを再生成 */
  regenerate: () => void;
  /** エラーオブジェクト */
  error: Error | undefined;
}

export function useChatSession({
  conversationId,
  initialMessages,
  modelId,
}: UseChatSessionParams): UseChatSessionReturn {
  /** Transport の生成（conversationId と modelId を body に含める） */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          ...(conversationId ? { conversationId } : {}),
          modelId,
        },
      }),
    [conversationId, modelId]
  );

  const {
    messages,
    status,
    sendMessage: chatSendMessage,
    stop: chatStop,
    reload,
    error,
  } = useChat({
    id: conversationId ?? undefined,
    transport,
    initialMessages,
  });

  /** メッセージ送信（conversationId が null の場合は送信しない） */
  const sendMessage = useCallback(
    (text: string) => {
      if (!conversationId) return;
      chatSendMessage({ text });
    },
    [conversationId, chatSendMessage]
  );

  /** ストリーミング停止 */
  const stop = useCallback(() => {
    chatStop();
  }, [chatStop]);

  /** 最後のAIメッセージを再生成 */
  const regenerate = useCallback(() => {
    reload();
  }, [reload]);

  return {
    messages,
    status: status as ChatStatus,
    sendMessage,
    stop,
    regenerate,
    error,
  };
}
