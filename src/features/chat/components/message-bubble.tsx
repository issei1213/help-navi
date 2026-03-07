/**
 * MessageBubble コンポーネント
 *
 * 個別メッセージをユーザー/AI別のスタイルで表示する。
 * ユーザーメッセージは右寄せダーク背景バブル。
 * AIメッセージは左寄せアバター付きで表示する。
 * ホバー時に MessageActions を表示する。
 * AIメッセージのpartsにツール呼び出しパーツが含まれる場合は
 * ToolInvocationPartコンポーネントに委譲して表示する。
 */
import { isToolUIPart, isTextUIPart, getToolName } from "ai";
import { MessageActions } from "./message-actions";
import { MarkdownRenderer } from "./markdown-renderer";
import { ToolInvocationPart } from "./tool-invocation-part";
import type { ChatUIMessage } from "../hooks/use-chat-session";

/** MessageBubble のプロパティ */
interface MessageBubbleProps {
  /** メッセージデータ */
  message: ChatUIMessage;
  /** ストリーミング中かどうか */
  isStreaming?: boolean;
  /** コピーコールバック */
  onCopy: (content: string) => void;
  /** リトライコールバック */
  onRegenerate: () => void;
}

/** メッセージからテキスト内容を抽出する（コピー・アクション用） */
function extractTextContent(message: ChatUIMessage): string {
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
            /* AIメッセージ: parts配列を順序通りにイテレートし、
               テキストとツールパーツを分岐レンダリングする */
            <div>
              {message.parts?.map((part, index) => {
                if (isTextUIPart(part)) {
                  return (
                    <MarkdownRenderer
                      key={`text-${index}`}
                      content={part.text}
                      isStreaming={isStreaming}
                    />
                  );
                }

                if (isToolUIPart(part)) {
                  const toolName = getToolName(part);
                  return (
                    <ToolInvocationPart
                      key={`tool-${part.toolCallId}`}
                      toolCallId={part.toolCallId}
                      toolName={toolName}
                      state={part.state as "input-streaming" | "input-available" | "output-available" | "output-error"}
                      input={(part.input as Record<string, unknown>) ?? {}}
                      output={"output" in part ? part.output : undefined}
                      errorText={"errorText" in part ? (part.errorText as string) : undefined}
                    />
                  );
                }

                // その他のパーツタイプは無視（reasoning, source等）
                return null;
              })}
            </div>
          )}
        </div>

        {/* AIメッセージのアクションボタンとトークン使用量 */}
        {!isUser && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-3">
            <MessageActions
              content={textContent}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
            />
            {message.metadata?.usage && (
              <span
                data-testid="token-usage"
                className="text-xs text-zinc-400 dark:text-zinc-500"
              >
                {message.metadata.usage.inputTokens.toLocaleString()} in / {message.metadata.usage.outputTokens.toLocaleString()} out ({message.metadata.usage.totalTokens.toLocaleString()} total)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
