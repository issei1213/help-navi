/**
 * チャットエージェント定義
 *
 * Claude APIを使用する汎用チャットエージェント。
 * S3ファイル操作ツールを統合し、チャットおよびファイル管理機能を提供する。
 * requestContextから動的にモデルを解決する。
 */
import { Agent } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import { s3Tools } from "../tools/s3";
import { webSearchTools } from "../tools/web-search";
import {
  AVAILABLE_MODELS,
  DEFAULT_MASTRA_MODEL_ID,
} from "@/lib/models";

/**
 * チャットエージェント
 * - モデル: requestContextから動的に解決（デフォルト: Claude Sonnet 4）
 * - ツール: S3ファイル操作ツール（ファイル一覧取得、読み取り、アップロード）、Web検索ツール
 */
export const chatAgent = new Agent({
  name: "chat-agent",
  instructions:
    "あなたは親切なAIアシスタントです。" +
    "ユーザーの質問に丁寧に日本語で回答してください。" +
    "必要に応じて利用可能なツールを活用し、ユーザーの要望に対応してください。",
  model: ({ requestContext }): MastraModelConfig => {
    // requestContextからモデルIDを取得
    const modelId = requestContext?.get("modelId") as string | undefined;
    // モデル定義を検索し、見つからない場合はデフォルトモデルにフォールバック
    const definition = AVAILABLE_MODELS.find((m) => m.id === modelId);
    return (definition?.mastraModelId ?? DEFAULT_MASTRA_MODEL_ID) as MastraModelConfig;
  },
  tools: {
    ...s3Tools,
    ...webSearchTools,
  },
});
