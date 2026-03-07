/**
 * ツール表示名ユーティリティのテスト
 *
 * 既知・未知のツール名の表示名変換を検証する。
 *
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { getToolDisplayName, TOOL_DISPLAY_NAMES } from "./tool-display-names";

describe("getToolDisplayName", () => {
  it("webSearchを'Web検索'に変換する", () => {
    expect(getToolDisplayName("webSearch")).toBe("Web検索");
  });

  it("s3ListObjectsを'ファイル一覧取得'に変換する", () => {
    expect(getToolDisplayName("s3ListObjects")).toBe("ファイル一覧取得");
  });

  it("s3GetObjectを'ファイル読み取り'に変換する", () => {
    expect(getToolDisplayName("s3GetObject")).toBe("ファイル読み取り");
  });

  it("s3PutObjectを'ファイルアップロード'に変換する", () => {
    expect(getToolDisplayName("s3PutObject")).toBe("ファイルアップロード");
  });

  it("未登録のツール名はそのまま返却する", () => {
    expect(getToolDisplayName("unknownTool")).toBe("unknownTool");
  });

  it("空文字列が渡された場合はそのまま返却する", () => {
    expect(getToolDisplayName("")).toBe("");
  });
});

describe("TOOL_DISPLAY_NAMES", () => {
  it("既知のツール名がすべて定義されている", () => {
    expect(TOOL_DISPLAY_NAMES).toHaveProperty("webSearch");
    expect(TOOL_DISPLAY_NAMES).toHaveProperty("s3ListObjects");
    expect(TOOL_DISPLAY_NAMES).toHaveProperty("s3GetObject");
    expect(TOOL_DISPLAY_NAMES).toHaveProperty("s3PutObject");
  });
});
