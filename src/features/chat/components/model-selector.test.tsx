/**
 * ModelSelector コンポーネントのユニットテスト
 *
 * モデル一覧の表示、選択操作、disabled 状態の制御をテストする。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ModelSelector } from "./model-selector";
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from "@/lib/models";

describe("ModelSelector", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    selectedModelId: DEFAULT_MODEL_ID,
    onModelSelect: vi.fn(),
    disabled: false,
  };

  describe("モデル一覧の表示", () => {
    it("利用可能なモデルの表示名が全て表示される", () => {
      render(<ModelSelector {...defaultProps} />);

      for (const model of AVAILABLE_MODELS) {
        expect(screen.getByText(model.displayName)).toBeDefined();
      }
    });

    it("各モデルの説明が表示される", () => {
      render(<ModelSelector {...defaultProps} />);

      for (const model of AVAILABLE_MODELS) {
        expect(screen.getByText(model.description)).toBeDefined();
      }
    });
  });

  describe("選択状態", () => {
    it("デフォルトモデルが事前選択状態で表示される", () => {
      render(<ModelSelector {...defaultProps} />);

      // 選択中のモデルにハイライト（data-selected属性）があること
      const selectedItem = screen.getByTestId(`model-option-${DEFAULT_MODEL_ID}`);
      expect(selectedItem.getAttribute("data-selected")).toBe("true");
    });

    it("モデルを選択すると onModelSelect が呼ばれる", () => {
      const onModelSelect = vi.fn();
      render(<ModelSelector {...defaultProps} onModelSelect={onModelSelect} />);

      const opusOption = screen.getByTestId("model-option-claude-opus-4-20250514");
      fireEvent.click(opusOption);

      expect(onModelSelect).toHaveBeenCalledWith("claude-opus-4-20250514");
    });

    it("選択中のモデルが視覚的にハイライトされる", () => {
      render(
        <ModelSelector
          {...defaultProps}
          selectedModelId="claude-opus-4-20250514"
        />
      );

      const opusOption = screen.getByTestId("model-option-claude-opus-4-20250514");
      expect(opusOption.getAttribute("data-selected")).toBe("true");

      const sonnetOption = screen.getByTestId(`model-option-${DEFAULT_MODEL_ID}`);
      expect(sonnetOption.getAttribute("data-selected")).toBe("false");
    });
  });

  describe("disabled 状態", () => {
    it("disabled 時は選択操作が無効化される", () => {
      const onModelSelect = vi.fn();
      render(
        <ModelSelector
          {...defaultProps}
          disabled={true}
          onModelSelect={onModelSelect}
        />
      );

      const opusOption = screen.getByTestId("model-option-claude-opus-4-20250514");
      fireEvent.click(opusOption);

      expect(onModelSelect).not.toHaveBeenCalled();
    });

    it("disabled 時でも選択中のモデル名は表示される", () => {
      render(<ModelSelector {...defaultProps} disabled={true} />);

      const defaultModel = AVAILABLE_MODELS.find((m) => m.id === DEFAULT_MODEL_ID)!;
      expect(screen.getByText(defaultModel.displayName)).toBeDefined();
    });
  });
});
