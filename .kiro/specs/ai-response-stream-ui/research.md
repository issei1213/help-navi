# Research & Design Decisions

## Summary
- **Feature**: `ai-response-stream-ui`
- **Discovery Scope**: Extension（既存チャットUIの拡張）
- **Key Findings**:
  - AI SDK v6（`ai` パッケージ）の `UIMessage.parts` は `tool-${toolName}` 型のパーツでツール呼び出しを表現し、4つの状態（`input-streaming`, `input-available`, `output-available`, `output-error`）を持つ
  - Mastra の `handleChatStream` は AI SDK 互換ストリームを返却するため、ツール呼び出し情報はクライアント側の `useChat` フックを通じて自動的にパーツとして利用可能
  - 現在の `MessageBubble` コンポーネントは `text` タイプのパーツのみ処理しており、ツール呼び出しパーツは無視されている

## Research Log

### AI SDK v6 における UIMessage.parts のツールパーツ構造

- **Context**: 現在のチャットUIがツール呼び出し情報を表示しないため、AI SDK がどのようにツール呼び出しをメッセージに含めるかを調査
- **Sources Consulted**:
  - [AI SDK Core: UIMessage](https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message)
  - [AI SDK UI: Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)
  - [AI SDK UI: Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
- **Findings**:
  - `UIMessage.parts` 配列内のツールパーツは `tool-${toolName}` 型で識別される（例: `tool-webSearch`, `tool-s3ListObjects`）
  - 各ツールパーツは以下の状態を持つ:
    - `input-streaming`: ツール入力がストリーミング中
    - `input-available`: ツール入力が完了
    - `output-available`: ツール実行が正常完了（`part.output` で結果取得可能）
    - `output-error`: ツール実行がエラーで終了（`part.errorText` でエラー情報取得可能）
  - パーツには `toolCallId`, `toolName`, `input`, `output`（状態による）が含まれる
  - 動的ツール（コンパイル時に不明なツール）は `dynamic-tool` 型で表現
- **Implications**:
  - `MessageBubble` で `message.parts` をイテレートし、`text` 以外のツールパーツも処理する必要がある
  - ツール名は `toolName` プロパティから取得可能
  - 状態遷移は AI SDK が自動管理するため、フロントエンドはレンダリングに専念できる

### Mastra handleChatStream とツール呼び出しストリーミング

- **Context**: サーバーサイドの Mastra エージェントがツール呼び出しを行った場合、それがどのようにクライアントに伝達されるかを調査
- **Sources Consulted**:
  - [Mastra: handleChatStream Reference](https://mastra.ai/reference/ai-sdk/handle-chat-stream)
  - [Mastra: AI SDK UI Integration](https://mastra.ai/guides/build-your-ui/ai-sdk-ui)
- **Findings**:
  - `handleChatStream` は AI SDK 互換の `ReadableStream` を返却し、`createUIMessageStreamResponse` でSSE形式に変換される
  - ツール呼び出し情報はストリーム内に自動的に含まれ、クライアント側の `useChat` フックがパーツとして解析する
  - サーバーサイドの変更は不要。既存の API ルート（`/api/chat`）がそのまま利用可能
- **Implications**:
  - バックエンドの変更は不要。フロントエンドのみの変更で対応可能
  - ツール呼び出しの状態管理は AI SDK が担当するため、カスタムの状態管理は不要

### 既存コードベースの分析

- **Context**: 現在のチャットUIコンポーネント構成と拡張ポイントの特定
- **Findings**:
  - `MessageBubble` は `extractTextContent` 関数で `text` パーツのみ抽出し、ツールパーツを無視
  - `MessageList` は `messages.map` で各メッセージを `MessageBubble` にレンダリング
  - `useChatSession` は `useChat` をラップし、`UIMessage` 型のメッセージを返却（ツールパーツは既にデータとして存在するが未使用）
  - 現在のプロジェクトで定義されたツール: `s3ListObjects`, `s3GetObject`, `s3PutObject`, `webSearch`（Anthropicビルトイン）
- **Implications**:
  - `MessageBubble` のレンダリングロジックを拡張し、ツールパーツの検出・表示を追加
  - ツール名のローカライズ表示マッピングが必要（例: `webSearch` -> "Web検索"）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| MessageBubble内直接レンダリング | MessageBubble内でparts配列をイテレートしツールパーツを直接レンダリング | シンプル、変更箇所が少ない | MessageBubbleが肥大化する可能性 | 小規模な拡張には適切 |
| ToolInvocationPart専用コンポーネント分離 | ツール表示を専用コンポーネントに分離し、MessageBubbleから呼び出す | 責務分離、テスト容易性、再利用性 | コンポーネント数が増加 | **選択**: container/presentationalパターンに合致 |

## Design Decisions

### Decision: ツールパーツのレンダリング方式

- **Context**: MessageBubbleがツールパーツをどのように表示するか
- **Alternatives Considered**:
  1. MessageBubble内にインラインでレンダリングロジックを追加
  2. ToolInvocationPart専用コンポーネントを作成し、MessageBubbleから委譲
- **Selected Approach**: 専用コンポーネント `ToolInvocationPart` を作成
- **Rationale**: プロジェクトのcontainer/presentationalパターンに合致し、ツール表示の複雑性（展開/折りたたみ、状態表示）を分離できる
- **Trade-offs**: コンポーネント数は増えるが、保守性とテスト容易性が向上

### Decision: ツール名の表示方式

- **Context**: ツール名をユーザーにどのように表示するか
- **Alternatives Considered**:
  1. API から返却される `toolName` をそのまま表示（例: `s3ListObjects`）
  2. ツール名をローカライズした表示名にマッピング
- **Selected Approach**: ローカライズマッピングを定義し、日本語の表示名で表示。未登録のツール名はそのまま表示
- **Rationale**: プロダクトが日本語UIを前提としており、技術的なツール名では一般ユーザーの理解を阻害する

### Decision: 展開/折りたたみの状態管理

- **Context**: ツール詳細の展開/折りたたみ状態をどのレベルで管理するか
- **Alternatives Considered**:
  1. ToolInvocationPartコンポーネント内のローカルstate
  2. MessageBubble レベルでの集中管理
  3. 上位のContainerコンポーネントでの状態管理
- **Selected Approach**: ToolInvocationPart コンポーネント内のローカル `useState`
- **Rationale**: 展開/折りたたみは各ツールパーツ独立の関心事であり、他のコンポーネントと共有する必要がない。ローカルstateが最もシンプル

## Risks & Mitigations
- **Risk**: Anthropic ビルトインツール（`webSearch`）のパーツ型名がカスタムツールと異なる可能性 — パーツの `toolName` プロパティを使用し、型名に依存しない実装にする
- **Risk**: ツール呼び出しパーツの入力/出力データが大量の場合、展開時にUIが崩れる — 出力データの最大表示文字数を制限し、超過分は省略表示
- **Risk**: ストリーミング中のパーツ追加でレイアウトジャンプが発生する — CSS `min-height` と `transition` で視覚的な安定性を確保

## References
- [AI SDK Core: UIMessage](https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message) — UIMessage型定義とパーツ構造
- [AI SDK UI: Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) — ツール呼び出しUIの実装パターン
- [AI SDK UI: Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) — メッセージパーツのレンダリング方法
- [Mastra: handleChatStream Reference](https://mastra.ai/reference/ai-sdk/handle-chat-stream) — AI SDK互換ストリーミングハンドラ
- [Mastra: AI SDK UI Integration](https://mastra.ai/guides/build-your-ui/ai-sdk-ui) — Mastra + AI SDK UIの統合パターン
