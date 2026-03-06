/**
 * モデル定義の一元管理モジュール
 *
 * 利用可能なAnthropicモデルの定義と型を一元管理する。
 * フロントエンド・バックエンド双方から @/lib/models としてインポート可能。
 */

/** モデル定義の型 */
export interface ModelDefinition {
  /** Anthropicモデル識別子（例: "claude-sonnet-4-20250514"） */
  id: string;
  /** Mastraプロバイダー付きモデル識別子（例: "anthropic/claude-sonnet-4-20250514"） */
  mastraModelId: string;
  /** UI表示用のモデル名（例: "Claude Sonnet 4"） */
  displayName: string;
  /** モデルの簡易説明（例: "バランス型。多くのユースケースで推奨"） */
  description: string;
}

/** 利用可能モデル一覧（定数配列） */
export const AVAILABLE_MODELS: readonly ModelDefinition[] = [
  {
    id: "claude-opus-4-6",
    mastraModelId: "anthropic/claude-opus-4-6",
    displayName: "Claude Opus 4.6",
    description: "最高性能。コーディング・推論に優れる（高コスト）",
  },
  {
    id: "claude-sonnet-4-6",
    mastraModelId: "anthropic/claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    description: "バランス型。多くのユースケースで推奨",
  },
  {
    id: "claude-haiku-4-5-20251001",
    mastraModelId: "anthropic/claude-haiku-4-5-20251001",
    displayName: "Claude Haiku 4.5",
    description: "高速・低コスト。シンプルなタスク向け",
  },
] as const;

/** デフォルトモデルのID */
export const DEFAULT_MODEL_ID: string = "claude-sonnet-4-6";

/** デフォルトモデルのMastra用ID */
export const DEFAULT_MASTRA_MODEL_ID: string = "anthropic/claude-sonnet-4-6";

/**
 * モデルIDから表示名を取得する
 *
 * 指定されたモデルIDが無効またはnullの場合、デフォルトモデルの表示名を返す。
 * @param modelId - モデルID（nullの場合はデフォルトモデル）
 * @returns モデルの表示名
 */
export function getModelDisplayName(modelId: string | null): string {
  const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
  if (model) {
    return model.displayName;
  }
  // デフォルトモデルの表示名を返す
  const defaultModel = AVAILABLE_MODELS.find((m) => m.id === DEFAULT_MODEL_ID);
  return defaultModel?.displayName ?? "Claude Sonnet 4.6";
}

/**
 * モデルIDが有効かどうかを検証する
 *
 * AVAILABLE_MODELSに含まれるモデルIDであればtrueを返す。
 * @param modelId - 検証するモデルID
 * @returns 有効な場合true
 */
export function isValidModelId(modelId: string): boolean {
  return AVAILABLE_MODELS.some((m) => m.id === modelId);
}
