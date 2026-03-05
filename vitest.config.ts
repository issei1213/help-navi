import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // テスト環境の設定
    environment: "node",
    // テストファイルのパターン
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "__tests__/**/*.test.ts"],
    // カバレッジ設定
    coverage: {
      provider: "v8",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
