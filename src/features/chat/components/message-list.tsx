/**
 * MessageList コンポーネント
 *
 * メッセージ一覧をスクロール可能なエリアに表示し、自動スクロールを制御する。
 * メッセージが空の場合は WelcomeScreen を表示。
 * ストリーミング中は TypingIndicator を表示する。
 */
import { useRef, useEffect } from "react";
import { MessageBubble } from "./message-bubble";
import { WelcomeScreen } from "./welcome-screen";
import { TypingIndicator } from "./typing-indicator";
import type { ChatUIMessage } from "../hooks/use-chat-session";

/** MessageList のプロパティ */
interface MessageListProps {
  /** メッセージ一覧 */
  messages: ChatUIMessage[];
  /** ストリーミング中かどうか */
  isStreaming: boolean;
  /** コピーコールバック */
  onCopy: (content: string) => void;
  /** リトライコールバック */
  onRegenerate: () => void;
  /** 選択中のモデル ID */
  selectedModelId: string;
  /** モデル選択コールバック */
  onModelSelect: (modelId: string) => void;
  /** モデルセレクター無効化フラグ */
  isModelSelectorDisabled: boolean;
}

export function MessageList({
  messages,
  isStreaming,
  onCopy,
  onRegenerate,
  selectedModelId,
  onModelSelect,
  isModelSelectorDisabled,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** 最後のメッセージのパーツ数（ツールパーツ追加時のスクロール発火用） */
  const lastMessagePartsLength =
    messages.length > 0
      ? messages[messages.length - 1].parts?.length ?? 0
      : 0;

  /** 新しいメッセージ追加時、またはパーツ追加時に自動スクロール */
  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, lastMessagePartsLength]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 overflow-y-auto">
        <WelcomeScreen
          selectedModelId={selectedModelId}
          onModelSelect={onModelSelect}
          disabled={isModelSelectorDisabled}
        />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      <div className="max-w-3xl mx-auto">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isStreaming && index === messages.length - 1}
            onCopy={onCopy}
            onRegenerate={onRegenerate}
          />
        ))}
        {isStreaming &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <TypingIndicator />
          )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
