/**
 * 環境変数バリデーションモジュール
 *
 * サーバー起動時に必須環境変数の存在を検証し、
 * 未設定の場合はコンソールに警告メッセージを出力する。
 * アプリケーションの起動はブロックしない（警告のみ）。
 */

/** バリデーション結果の型定義 */
export interface EnvValidationResult {
  /** 全必須環境変数が設定されているか */
  readonly isValid: boolean;
  /** 警告メッセージ一覧 */
  readonly warnings: string[];
  /** 未設定の必須環境変数名一覧 */
  readonly missingRequired: string[];
}

/** 必須環境変数の定義 */
const REQUIRED_ENV_VARS = [
  {
    name: "ANTHROPIC_API_KEY",
    description: "Anthropic Claude APIキー",
    category: "Claude API",
  },
  {
    name: "S3_ENDPOINT",
    description: "S3/MinIOエンドポイントURL",
    category: "S3ストレージ",
  },
  {
    name: "S3_ACCESS_KEY_ID",
    description: "S3/MinIOアクセスキー",
    category: "S3ストレージ",
  },
  {
    name: "S3_SECRET_ACCESS_KEY",
    description: "S3/MinIOシークレットキー",
    category: "S3ストレージ",
  },
  {
    name: "S3_BUCKET_NAME",
    description: "S3バケット名",
    category: "S3ストレージ",
  },
  {
    name: "DATABASE_URL",
    description: "PostgreSQLデータベース接続文字列",
    category: "PostgreSQL",
  },
] as const;

/**
 * 全環境変数を検証し、結果を返す
 *
 * @returns バリデーション結果（isValid, warnings, missingRequired）
 */
export function validateEnv(): EnvValidationResult {
  const missingRequired: string[] = [];
  const warnings: string[] = [];

  // 必須環境変数のチェック
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar.name]) {
      missingRequired.push(envVar.name);
    }
  }

  // ANTHROPIC_API_KEY未設定の警告
  if (missingRequired.includes("ANTHROPIC_API_KEY")) {
    warnings.push(
      "[警告] ANTHROPIC_API_KEY が設定されていません。Claude APIを使用するにはAPIキーが必要です。" +
        " .env.local ファイルに ANTHROPIC_API_KEY を設定してください。"
    );
  }

  // S3接続情報未設定の警告
  const missingS3Vars = missingRequired.filter((name) =>
    name.startsWith("S3_")
  );
  if (missingS3Vars.length > 0) {
    warnings.push(
      `[警告] S3接続情報が不足しています（${missingS3Vars.join(", ")}）。` +
        " S3ファイル操作機能は無効化されます。" +
        " MinIOを使用する場合は docker compose up を実行し、.env.local にS3接続情報を設定してください。"
    );
  }

  // DATABASE_URL未設定の警告
  if (missingRequired.includes("DATABASE_URL")) {
    warnings.push(
      "[警告] DATABASE_URL が設定されていません。PostgreSQLデータベース機能は無効化されます。" +
        " Docker Composeを起動し、.env.local にDATABASE_URLを設定してください。"
    );
  }

  return {
    isValid: missingRequired.length === 0,
    warnings,
    missingRequired,
  };
}

/**
 * コンソールに警告メッセージを出力する
 *
 * @param result - validateEnv()の結果
 */
export function logWarnings(result: EnvValidationResult): void {
  for (const warning of result.warnings) {
    console.warn(warning);
  }
}
