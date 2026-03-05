/**
 * ChatContainer コンポーネント
 *
 * チャット機能全体の状態管理とロジック集約を担うContainerコンポーネント。
 * 3つのカスタムフック（useConversations, useChatSession, useSidebar）を呼び出し、
 * 各Presentationalコンポーネントへ適切なpropsを分配する。
 */
"use client";

import { useCallback, useRef, useEffect } from "react";
import { useConversations } from "../hooks/use-conversations";
import { useChatSession } from "../hooks/use-chat-session";
import { useSidebar } from "../hooks/use-sidebar";
import { ChatLayout } from "./chat-layout";
import { ChatSidebar } from "./chat-sidebar";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInputArea } from "./chat-input-area";
import type { UIMessage } from "@ai-sdk/react";

export function ChatContainer() {
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

  /** activeMessages を UIMessage 形式に変換する */
  const initialMessages: UIMessage[] = activeMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: msg.content }],
  }));

  /** チャットセッション管理フック */
  const { messages, status, sendMessage, stop, regenerate } = useChatSession({
    conversationId: activeConversationId,
    initialMessages,
  });

  /** 現在の会話タイトルを取得する */
  const currentTitle =
    conversations.find((c) => c.id === activeConversationId)?.title ||
    "新しいチャット";

  /** 会話未作成時の保留メッセージ */
  const pendingMessageRef = useRef<string | null>(null);

  /** 新しいチャットを作成する */
  const handleNewChat = useCallback(async () => {
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
        await createConversation();
        return;
      }
      sendMessage(text);
    },
    [activeConversationId, createConversation, sendMessage]
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
      await selectConversation(id);
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
          />
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            onCopy={handleCopy}
            onRegenerate={regenerate}
          />
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
