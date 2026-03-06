/**
 * チャットエージェント定義
 *
 * Claude APIを使用する汎用チャットエージェント。
 * S3ファイル操作ツールを統合し、チャットおよびファイル管理機能を提供する。
 */
import { Agent } from "@mastra/core/agent";
import { s3Tools } from "../tools/s3";
import { webSearchTools } from "../tools/web-search";

/**
 * チャットエージェント
 * - モデル: Anthropic Claude（ANTHROPIC_API_KEY環境変数で認証）
 * - ツール: S3ファイル操作ツール（ファイル一覧取得、読み取り、アップロード）
 */
export const chatAgent = new Agent({
  name: "chat-agent",
  instructions:
    "あなたは親切なAIアシスタントです。" +
    "ユーザーの質問に丁寧に日本語で回答してください。" +
    "必要に応じて利用可能なツールを活用し、ユーザーの要望に対応してください。",
  model: "anthropic/claude-sonnet-4-20250514",
  tools: {
    ...s3Tools,
    ...webSearchTools,
  },
});
