/**
 * ChatSidebar コンポーネント
 *
 * 会話一覧の表示と管理UI（新規作成ボタン、3点メニュー、折りたたみボタン）を提供する。
 * ホバー時の3点メニューで会話のタイトル編集・削除操作が可能。
 */
"use client";

import { useState, useRef, useEffect } from "react";
import type { ConversationListItem } from "../hooks/use-conversations";

/** ChatSidebar のプロパティ */
interface ChatSidebarProps {
  /** 会話一覧 */
  conversations: ConversationListItem[];
  /** 選択中の会話ID */
  activeConversationId: string | null;
  /** タイトル自動生成中かどうか */
  isGeneratingTitle: boolean;
  /** 新規チャット作成コールバック */
  onNewChat: () => void;
  /** 会話選択コールバック */
  onSelectConversation: (id: string) => void;
  /** 会話削除コールバック */
  onDeleteConversation: (id: string) => void;
  /** タイトル更新コールバック */
  onUpdateTitle: (id: string, title: string) => void;
  /** サイドバー折りたたみトグルコールバック */
  onToggleSidebar: () => void;
  /** モバイル判定 */
  isMobile: boolean;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  isGeneratingTitle,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onUpdateTitle,
  onToggleSidebar,
  isMobile,
}: ChatSidebarProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  /** 編集開始時にフォーカスを設定 */
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  /** タイトル編集を開始する */
  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
    setMenuOpenId(null);
  };

  /** タイトル編集を確定する */
  const handleConfirmEdit = () => {
    if (editingId && editTitle.trim()) {
      onUpdateTitle(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  /** 削除確認を行う */
  const handleDelete = (id: string) => {
    setMenuOpenId(null);
    if (window.confirm("この会話を削除しますか？")) {
      onDeleteConversation(id);
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-100 dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700">
      {/* 上部: 新しいチャットボタン */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          新しいチャット
        </button>
      </div>

      {/* 中央: 会話一覧 */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-2 py-1 mb-1">
          チャット
        </div>
        {conversations.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4">
            会話がありません
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conv) => (
              <li
                key={conv.id}
                data-testid={`conversation-item-${conv.id}`}
                className={`group relative flex items-center rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                  activeConversationId === conv.id
                    ? "bg-zinc-200 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                }`}
                onClick={() => {
                  if (editingId !== conv.id) {
                    onSelectConversation(conv.id);
                  }
                }}
              >
                {editingId === conv.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleConfirmEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmEdit();
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setEditTitle("");
                      }
                    }}
                    className="flex-1 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-500 rounded px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>  
                    {/* タイトル自動生成中のアクティブ会話はスケルトン表示 */}
                    {isGeneratingTitle && activeConversationId === conv.id ? (
                      <span className="flex-1 h-4 rounded-md bg-zinc-300/50 dark:bg-zinc-500/30 animate-pulse" />
                    ) : (
                      <span className="flex-1 truncate">{conv.title}</span>
                    )}
                    {/* 3点メニューボタン */}
                    <button
                      data-testid={`menu-button-${conv.id}`}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-zinc-300 dark:hover:bg-zinc-500 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(
                          menuOpenId === conv.id ? null : conv.id
                        );
                      }}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {/* ドロップダウンメニュー */}
                    {menuOpenId === conv.id && (
                      <div
                        data-testid={`menu-dropdown-${conv.id}`}
                        className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg bg-white dark:bg-zinc-700 shadow-lg border border-zinc-200 dark:border-zinc-600 py-1"
                      >
                        <button
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(conv.id, conv.title);
                          }}
                        >
                          タイトル編集
                        </button>
                        <button
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-600 text-red-600 dark:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(conv.id);
                          }}
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 下部: 折りたたみボタン（デスクトップのみ） */}
      {!isMobile && (
        <div className="p-2 border-t border-zinc-200 dark:border-zinc-700">
          <button
            data-testid="toggle-sidebar-button"
            onClick={onToggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
            折りたたむ
          </button>
        </div>
      )}
    </div>
  );
}
