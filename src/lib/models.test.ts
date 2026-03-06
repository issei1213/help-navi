/**
 * モデル定義モジュールのユニットテスト
 *
 * models.ts の定数・ヘルパー関数の動作を検証する。
 */
import { describe, it, expect } from "vitest";
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL_ID,
  getModelDisplayName,
  isValidModelId,
  type ModelDefinition,
} from "./models";

describe("models.ts", () => {
  describe("AVAILABLE_MODELS", () => {
    it("利用可能なモデルが1つ以上定義されていること", () => {
      expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
    });

    it("各モデルが必要なフィールドを持つこと", () => {
      for (const model of AVAILABLE_MODELS) {
        expect(model).toHaveProperty("id");
        expect(model).toHaveProperty("mastraModelId");
        expect(model).toHaveProperty("displayName");
        expect(model).toHaveProperty("description");
        expect(typeof model.id).toBe("string");
        expect(typeof model.mastraModelId).toBe("string");
        expect(typeof model.displayName).toBe("string");
        expect(typeof model.description).toBe("string");
      }
    });

    it("mastraModelIdがanthropic/プレフィックス付きであること", () => {
      for (const model of AVAILABLE_MODELS) {
        expect(model.mastraModelId).toMatch(/^anthropic\//);
      }
    });

    it("期待するモデルが含まれていること", () => {
      const modelIds = AVAILABLE_MODELS.map((m) => m.id);
      expect(modelIds).toContain("claude-opus-4-6");
      expect(modelIds).toContain("claude-sonnet-4-6");
      expect(modelIds).toContain("claude-haiku-4-5-20251001");
    });
  });

  describe("DEFAULT_MODEL_ID", () => {
    it("デフォルトモデルIDがclaude-sonnet-4-6であること", () => {
      expect(DEFAULT_MODEL_ID).toBe("claude-sonnet-4-6");
    });

    it("デフォルトモデルIDがAVAILABLE_MODELSに存在すること", () => {
      const modelIds = AVAILABLE_MODELS.map((m) => m.id);
      expect(modelIds).toContain(DEFAULT_MODEL_ID);
    });
  });

  describe("getModelDisplayName", () => {
    it("有効なモデルIDで正しい表示名を返すこと", () => {
      const sonnetModel = AVAILABLE_MODELS.find(
        (m) => m.id === "claude-sonnet-4-6"
      ) as ModelDefinition;
      expect(getModelDisplayName("claude-sonnet-4-6")).toBe(
        sonnetModel.displayName
      );
    });

    it("nullの場合デフォルトモデルの表示名を返すこと", () => {
      const defaultModel = AVAILABLE_MODELS.find(
        (m) => m.id === DEFAULT_MODEL_ID
      ) as ModelDefinition;
      expect(getModelDisplayName(null)).toBe(defaultModel.displayName);
    });

    it("不正なモデルIDの場合デフォルトモデルの表示名を返すこと", () => {
      const defaultModel = AVAILABLE_MODELS.find(
        (m) => m.id === DEFAULT_MODEL_ID
      ) as ModelDefinition;
      expect(getModelDisplayName("invalid-model-id")).toBe(
        defaultModel.displayName
      );
    });
  });

  describe("isValidModelId", () => {
    it("有効なモデルIDでtrueを返すこと", () => {
      expect(isValidModelId("claude-sonnet-4-6")).toBe(true);
      expect(isValidModelId("claude-opus-4-6")).toBe(true);
      expect(isValidModelId("claude-haiku-4-5-20251001")).toBe(true);
    });

    it("無効なモデルIDでfalseを返すこと", () => {
      expect(isValidModelId("invalid-model")).toBe(false);
      expect(isValidModelId("")).toBe(false);
      expect(isValidModelId("gpt-4")).toBe(false);
    });
  });
});
