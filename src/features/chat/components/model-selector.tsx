/**
 * ModelSelector コンポーネント
 *
 * 利用可能なAnthropicモデルの一覧を表示し、ユーザーのモデル選択を受け付ける。
 * Presentationalコンポーネントとして状態管理は親に委譲する。
 */
"use client";

import { AVAILABLE_MODELS } from "@/lib/models";

/** ModelSelector のプロパティ */
export interface ModelSelectorProps {
  /** 現在選択中のモデル ID */
  selectedModelId: string;
  /** モデル選択時のコールバック */
  onModelSelect: (modelId: string) => void;
  /** 操作可否（会話開始後は true） */
  disabled: boolean;
}

/**
 * モデルセレクター
 *
 * AVAILABLE_MODELS からモデル一覧をレンダリングし、選択状態をハイライト表示する。
 * disabled 時は選択操作を無効化しつつ、現在のモデル名を表示する。
 */
export function ModelSelector({
  selectedModelId,
  onModelSelect,
  disabled,
}: ModelSelectorProps) {
  return (
    <div
      data-testid="model-selector"
      className="w-full max-w-md mx-auto"
    >
      <div className="flex flex-col gap-2">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = model.id === selectedModelId;
          return (
            <button
              key={model.id}
              data-testid={`model-option-${model.id}`}
              data-selected={isSelected ? "true" : "false"}
              onClick={() => {
                if (!disabled) {
                  onModelSelect(model.id);
                }
              }}
              disabled={disabled}
              className={`
                w-full text-left px-4 py-3 rounded-lg border transition-colors
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }
                ${
                  disabled
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer"
                }
              `}
            >
              <div className="flex items-center gap-2">
                {/* 選択インジケーター */}
                <div
                  className={`
                    w-4 h-4 rounded-full border-2 flex-shrink-0
                    ${
                      isSelected
                        ? "border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400"
                        : "border-zinc-300 dark:border-zinc-600"
                    }
                  `}
                >
                  {isSelected && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {model.displayName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {model.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
