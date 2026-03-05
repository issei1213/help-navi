import { ChatContainer } from "@/features/chat/components/chat-container";

/**
 * メインページ
 *
 * チャット画面を全画面で提供する。
 * ChatContainer（クライアントコンポーネント）を呼び出し、
 * page.tsx 自体はサーバーコンポーネントのまま維持する。
 */
export default function Home() {
  return <ChatContainer />;
}
