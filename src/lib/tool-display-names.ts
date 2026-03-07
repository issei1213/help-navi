/**
 * ツール表示名ユーティリティ
 *
 * ツールのAPI名を日本語の表示名にマッピングする。
 * 未登録のツール名はそのまま返却する。
 */

/** ツール表示名マッピング */
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  webSearch: "Web検索",
  s3ListObjects: "ファイル一覧取得",
  s3GetObject: "ファイル読み取り",
  s3PutObject: "ファイルアップロード",
};

/**
 * ツール名を表示名に変換する
 *
 * @param toolName - ツールのAPI名
 * @returns 日本語の表示名。未登録の場合はツール名をそのまま返却
 */
export function getToolDisplayName(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] ?? toolName;
}
