/**
 * MessageBubble コンポーネント
 *
 * 個別メッセージをユーザー/AI別のスタイルで表示する。
 * ユーザーメッセージは右寄せダーク背景バブル。
 * AIメッセージは左寄せアバター付きで表示する。
 * ホバー時に MessageActions を表示する。
 */
import type { UIMessage } from "@ai-sdk/react";
import { MessageActions } from "./message-actions";
import { MarkdownRenderer } from "./markdown-renderer";

/** MessageBubble のプロパティ */
interface MessageBubbleProps {
  /** メッセージデータ */
  message: UIMessage;
  /** ストリーミング中かどうか */
  isStreaming?: boolean;
  /** コピーコールバック */
  onCopy: (content: string) => void;
  /** リトライコールバック */
  onRegenerate: () => void;
}

/** メッセージからテキスト内容を抽出する */
function extractTextContent(message: UIMessage): string {
  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join("") || ""
  );
}

export function MessageBubble({
  message,
  isStreaming = false,
  onCopy,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const textContent = extractTextContent(message);

  return (
    <div
      data-testid={`message-bubble-${message.id}`}
      data-is-streaming={String(isStreaming)}
      className={`group flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      {/* AIアバター */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">
          AI
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "" : "flex-1 max-w-2xl"}`}>
        {/* メッセージバブル */}
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? "bg-zinc-800 dark:bg-zinc-700 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm">{textContent}</p>
          ) : (
            <MarkdownRenderer content={textContent} isStreaming={isStreaming} />
          )}
        </div>

        {/* AIメッセージのアクションボタン */}
        {!isUser && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
            <MessageActions
              content={textContent}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
