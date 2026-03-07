/**
 * ChatContainer コンポーネント
 *
 * チャット機能全体の状態管理とロジック集約を担うContainerコンポーネント。
 * 3つのカスタムフック（useConversations, useChatSession, useSidebar）を呼び出し、
 * 各Presentationalコンポーネントへ適切なpropsを分配する。
 */
"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useConversations } from "../hooks/use-conversations";
import { useChatSession } from "../hooks/use-chat-session";
import { useSidebar } from "../hooks/use-sidebar";
import { ChatLayout } from "./chat-layout";
import { ChatSidebar } from "./chat-sidebar";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInputArea } from "./chat-input-area";
import type { ChatUIMessage } from "../hooks/use-chat-session";
import { DEFAULT_MODEL_ID } from "@/lib/models";

export function ChatContainer() {
  /** モデル選択の state 管理 */
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);

  /** 会話管理フック */
  const {
    conversations,
    activeConversationId,
    isLoading,
    createConversation,
    selectConversation,
    deleteConversation,
    updateTitle,
    activeMessages,
    refreshConversations,
  } = useConversations();

  /** サイドバー状態管理フック */
  const { sidebarState, isMobile, toggleSidebar, closeSidebar } = useSidebar();

  /** activeMessages を ChatUIMessage 形式に変換する */
  const initialMessages: ChatUIMessage[] = activeMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: msg.content }],
  }));

  /** チャットセッション管理フック */
  const { messages, status, sendMessage, stop, regenerate, error } = useChatSession({
    conversationId: activeConversationId,
    initialMessages,
    modelId: selectedModelId,
  });

  /** 現在の会話タイトルを取得する */
  const currentTitle =
    conversations.find((c) => c.id === activeConversationId)?.title ||
    "新しいチャット";

  /** 会話未作成時の保留メッセージ */
  const pendingMessageRef = useRef<string | null>(null);

  /** 新しいチャットを作成する */
  const handleNewChat = useCallback(async () => {
    setSelectedModelId(DEFAULT_MODEL_ID);
    await createConversation();
    if (isMobile) {
      closeSidebar();
    }
  }, [createConversation, isMobile, closeSidebar]);

  /** メッセージ送信（会話がなければ自動作成してから送信） */
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!activeConversationId) {
        pendingMessageRef.current = text;
        await createConversation(selectedModelId);
        return;
      }
      sendMessage(text);
    },
    [activeConversationId, createConversation, sendMessage, selectedModelId]
  );

  /** 保留メッセージを会話作成後に送信する */
  useEffect(() => {
    if (activeConversationId && pendingMessageRef.current) {
      const text = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessage(text);
    }
  }, [activeConversationId, sendMessage]);

  /** タイトル自動生成中かどうか */
  const isGeneratingTitle =
    activeConversationId !== null &&
    currentTitle === "新しいチャット" &&
    messages.length > 0;

  /** ストリーミング完了後に自動生成タイトルを反映する（リトライ付き） */
  useEffect(() => {
    if (!isGeneratingTitle || status === "streaming" || status === "submitted") {
      return;
    }

    // タイトルが反映されるまでポーリング（最大5回、1.5秒間隔）
    let retryCount = 0;
    const maxRetries = 5;
    const poll = () => {
      retryCount++;
      refreshConversations();
    };

    const timer = setTimeout(poll, 1500);
    const interval = setInterval(() => {
      if (retryCount >= maxRetries) {
        clearInterval(interval);
        return;
      }
      poll();
    }, 1500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isGeneratingTitle, status, refreshConversations]);

  /** 会話を選択する */
  const handleSelectConversation = useCallback(
    async (id: string) => {
      const modelId = await selectConversation(id);
      setSelectedModelId(modelId ?? DEFAULT_MODEL_ID);
      if (isMobile) {
        closeSidebar();
      }
    },
    [selectConversation, isMobile, closeSidebar]
  );

  /** メッセージをコピーする */
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch(() => {
      // クリップボードAPI未対応環境のフォールバック
    });
  }, []);

  /** モデルセレクターの disabled 判定（メッセージが存在する場合は無効化） */
  const isModelSelectorDisabled = messages.length > 0;

  /** モデル選択ハンドラ */
  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
  }, []);

  /** ストリーミング中かどうか */
  const isStreaming = status === "streaming" || status === "submitted";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <ChatLayout
      sidebarState={sidebarState}
      isMobile={isMobile}
      onOverlayClick={closeSidebar}
      sidebar={
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          isGeneratingTitle={isGeneratingTitle}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={deleteConversation}
          onUpdateTitle={updateTitle}
          onToggleSidebar={toggleSidebar}
          isMobile={isMobile}
        />
      }
      main={
        <>
          <ChatHeader
            title={currentTitle}
            isGeneratingTitle={isGeneratingTitle}
            isMobile={isMobile}
            onToggleSidebar={toggleSidebar}
            onNewChat={handleNewChat}
            sidebarCollapsed={sidebarState === "collapsed"}
            modelId={selectedModelId}
          />
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            onCopy={handleCopy}
            onRegenerate={regenerate}
            selectedModelId={selectedModelId}
            onModelSelect={handleModelSelect}
            isModelSelectorDisabled={isModelSelectorDisabled}
          />
          {/* エラーメッセージ表示 */}
          {error && (
            <div
              data-testid="chat-error-message"
              className="mx-4 mb-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
            >
              <p className="text-sm text-red-600 dark:text-red-400">
                {error.message}
              </p>
            </div>
          )}
          <ChatInputArea
            onSendMessage={handleSendMessage}
            onStop={stop}
            isStreaming={isStreaming}
            disabled={false}
          />
        </>
      }
    />
  );
}
