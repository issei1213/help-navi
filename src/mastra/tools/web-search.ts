/**
 * Web検索ツール定義
 *
 * Anthropicのビルトインweb_searchツールを利用して、
 * リアルタイムのWeb情報検索をMastraエージェントのツールとして提供する。
 */
import { anthropic } from "@ai-sdk/anthropic";

/**
 * Anthropic Web検索ツール
 * Claude APIのビルトインWeb検索機能を使用してリアルタイムの情報を取得する
 */
export const webSearchTools = {
  webSearch: anthropic.tools.webSearch_20250305(),
};
