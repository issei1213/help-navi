/**
 * Mastraフレームワーク初期化モジュール（サーバーサイド専用）
 *
 * Mastraインスタンスの一元的な初期化と管理を行う。
 * クライアントバンドルへの混入を防止するため、
 * サーバーサイドでのみ使用すること。
 */
import { Mastra } from "@mastra/core";

import { validateEnv, logWarnings } from "@/lib/env-validation";
import { chatAgent } from "./agents/chat-agent";

// サーバー起動時に環境変数を検証
const envResult = validateEnv();
logWarnings(envResult);

/**
 * Mastraインスタンス
 * エージェントとツールを統合管理する
 */
export const mastra = new Mastra({
  agents: { "chat-agent": chatAgent },
});
