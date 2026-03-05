/**
 * サンプルエージェント定義
 *
 * Claude APIを使用するサンプルエージェント。
 * S3ファイル操作ツールを統合し、チャットおよびファイル管理機能を提供する。
 */
import { Agent } from "@mastra/core/agent";
import { s3Tools } from "../tools/s3";

/**
 * サンプルエージェント
 * - モデル: Anthropic Claude（ANTHROPIC_API_KEY環境変数で認証）
 * - ツール: S3ファイル操作ツール（ファイル一覧取得、読み取り、アップロード）
 */
export const sampleAgent = new Agent({
  name: "sample-agent",
  instructions:
    "あなたは親切なAIアシスタントです。" +
    "ユーザーの質問に丁寧に日本語で回答してください。" +
    "ファイル管理に関する質問にはS3ストレージツールを使用して対応できます。" +
    "ファイルの一覧取得、読み取り、アップロードが可能です。",
  model: "anthropic/claude-sonnet-4-20250514",
  tools: {
    ...s3Tools,
  },
});
