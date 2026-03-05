/**
 * generateTitle関数のユニットテスト
 *
 * LLMを使用して会話タイトルを生成する関数のテスト。
 * Mastraエージェントをモックし、以下のケースを検証する:
 * - 正常系: LLMが30文字以内のタイトルを返却する
 * - 30文字超過: レスポンスが30文字を超える場合に切り詰める
 * - 空レスポンス: LLMが空文字を返却した場合のフォールバック
 * - エラー: LLM呼び出し失敗時のフォールバック
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// mastraモジュールをモック
vi.mock("@/mastra", () => {
  const mockGenerate = vi.fn();
  const mockAgent = {
    generate: mockGenerate,
  };
  return {
    mastra: {
      getAgent: vi.fn(() => mockAgent),
    },
    __mockGenerate: mockGenerate,
    __mockAgent: mockAgent,
  };
});

/** タイトル最大文字数 */
const TITLE_MAX_LENGTH = 30;

describe("generateTitle", () => {
  let generateTitle: (userMessage: string) => Promise<string>;
  let mockGenerate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // モックの参照を取得
    const mastraMock = await import("@/mastra");
    mockGenerate = (
      mastraMock as unknown as { __mockGenerate: ReturnType<typeof vi.fn> }
    ).__mockGenerate;

    // テスト対象の関数をインポート
    const module = await import("./generate-title");
    generateTitle = module.generateTitle;
  });

  it("LLMが返却したタイトルをトリムして返却する", async () => {
    mockGenerate.mockResolvedValue({
      text: "  プロジェクトの進捗について  ",
    });

    const result = await generateTitle("今日のプロジェクトの進捗を教えてください");

    expect(result).toBe("プロジェクトの進捗について");
  });

  it("LLMの返却値が30文字を超える場合、30文字に切り詰める", async () => {
    // 40文字のタイトルを返却するモック
    const longTitle = "あ".repeat(40);
    mockGenerate.mockResolvedValue({ text: longTitle });

    const result = await generateTitle("テスト用メッセージ");

    expect(result.length).toBeLessThanOrEqual(TITLE_MAX_LENGTH);
    expect(result).toBe("あ".repeat(TITLE_MAX_LENGTH));
  });

  it("LLMが空文字を返却した場合、ユーザーメッセージの先頭30文字をフォールバックとして返却する", async () => {
    mockGenerate.mockResolvedValue({ text: "" });

    const userMessage = "これはテスト用の長いユーザーメッセージです。30文字を超える内容を含んでいます。";
    const result = await generateTitle(userMessage);

    expect(result).toBe(userMessage.substring(0, TITLE_MAX_LENGTH));
  });

  it("LLMがスペースのみを返却した場合、フォールバックを適用する", async () => {
    mockGenerate.mockResolvedValue({ text: "   " });

    const userMessage = "テスト用メッセージ";
    const result = await generateTitle(userMessage);

    expect(result).toBe(userMessage.substring(0, TITLE_MAX_LENGTH));
  });

  it("LLM呼び出しが失敗した場合、ユーザーメッセージの先頭30文字をフォールバックとして返却する", async () => {
    mockGenerate.mockRejectedValue(new Error("API接続エラー"));

    const userMessage = "エラーテスト用のメッセージです";
    const result = await generateTitle(userMessage);

    expect(result).toBe(userMessage.substring(0, TITLE_MAX_LENGTH));
  });

  it("LLM呼び出し失敗時にエラーをコンソールに記録する", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGenerate.mockRejectedValue(new Error("API接続エラー"));

    await generateTitle("テストメッセージ");

    expect(consoleSpy).toHaveBeenCalledWith(
      "LLMタイトル生成エラー:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("Mastraエージェントのgenerate関数に適切なプロンプトを渡す", async () => {
    mockGenerate.mockResolvedValue({ text: "テストタイトル" });

    const userMessage = "今日の天気はどうですか？";
    await generateTitle(userMessage);

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    // generate関数に渡されたメッセージ配列の内容を検証
    const callArgs = mockGenerate.mock.calls[0][0];
    expect(callArgs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining(userMessage),
        }),
      ])
    );
    // プロンプトに30文字以内の指示が含まれていることを検証
    const promptContent = callArgs[0].content;
    expect(promptContent).toContain("30文字以内");
  });

  it("sample-agentを使用してタイトルを生成する", async () => {
    mockGenerate.mockResolvedValue({ text: "テストタイトル" });
    const mastraMock = await import("@/mastra");

    await generateTitle("テストメッセージ");

    expect(mastraMock.mastra.getAgent).toHaveBeenCalledWith("sample-agent");
  });

  it("ユーザーメッセージが30文字以下の場合、フォールバック時にそのまま返却する", async () => {
    mockGenerate.mockRejectedValue(new Error("失敗"));

    const shortMessage = "短いメッセージ";
    const result = await generateTitle(shortMessage);

    expect(result).toBe(shortMessage);
  });
});
