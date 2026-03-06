# Research & Design Decisions

## Summary
- **Feature**: model-selector
- **Discovery Scope**: Extension（既存チャットシステムへのモデル選択機能追加）
- **Key Findings**:
  - Mastra Agent の `model` プロパティは関数形式をサポートし、`requestContext` から動的にモデルを解決できる
  - `handleChatStream` の `params` オブジェクトに `requestContext` を含めることで、API ルートからエージェントへモデル情報を伝達可能
  - Conversation テーブルに `modelId` カラム（nullable String + デフォルト値）を追加するだけでスキーマ変更は最小限

## Research Log

### Mastra requestContext によるモデル動的選択
- **Context**: 現在の `chat-agent.ts` はモデルが文字列リテラルでハードコードされている。ユーザー選択に基づく動的切替が必要。
- **Sources Consulted**:
  - [Using Agents | Mastra Docs](https://mastra.ai/docs/agents/overview)
  - [Request Context | Mastra Docs](https://mastra.ai/docs/server/request-context)
  - [handleChatStream Reference](https://mastra.ai/reference/ai-sdk/handle-chat-stream)
- **Findings**:
  - Agent の `model` プロパティは `({ requestContext }) => string` 形式の関数を受け付ける
  - `requestContext.get('model-id')` でリクエスト固有の値を取得可能
  - `handleChatStream` の `params` に `requestContext` を渡せる（`RequestContext` インスタンスとして）
  - `RequestContext` は `@mastra/core/request-context` からインポート
  - `new RequestContext()` → `requestContext.set(key, value)` で構築
- **Implications**:
  - API ルートでリクエストボディから `modelId` を抽出し、`RequestContext` に設定して `handleChatStream` に渡す
  - Agent 側は `model` を関数に変更し、`requestContext` から `modelId` を取得。未指定時はデフォルトモデルにフォールバック

### handleChatStream のパラメータ構造
- **Context**: フロントエンドからモデル選択情報をバックエンドに伝達する方法の調査
- **Sources Consulted**:
  - [handleChatStream Reference](https://mastra.ai/reference/ai-sdk/handle-chat-stream)
- **Findings**:
  - `handleChatStream({ mastra, agentId, params })` の `params` は `ChatStreamHandlerParams` 型
  - `params` には `messages`, `resumeData`, `runId`, `requestContext` を含められる
  - 現在のコードは `params: body` でリクエストボディ全体を渡しているため、ボディに `requestContext` を含めるか、API ルートで `RequestContext` インスタンスを構築して `params` にマージする方式が有効
  - サーバーサイドで `RequestContext` を構築する方式が型安全性と制御の観点で優れている
- **Implications**:
  - API ルートで `body.modelId` を取得 → `RequestContext` 構築 → `params` に `requestContext` として渡す
  - フロントエンドは `body` に `modelId` を含めるだけで良い（`DefaultChatTransport` の `body` オプション経由）

### 利用可能な Anthropic モデル一覧
- **Context**: ユーザーに表示するモデル一覧の確定
- **Sources Consulted**:
  - [Models overview - Claude API Docs](https://platform.claude.com/docs/en/about-claude/models/overview)
  - [Anthropic Claude Models | Lorka AI](https://www.lorka.ai/ai-models/anthropic)
- **Findings**:
  - 現在利用可能な主要モデル:
    - `claude-opus-4-20250514`: 最高性能、コーディング・推論に優れる（高コスト）
    - `claude-sonnet-4-20250514`: バランス型、多くのユースケースで推奨（中コスト）
    - `claude-haiku-3-5-20241022`: 高速・低コスト、シンプルなタスク向け
  - Mastra での指定形式: `anthropic/{model-id}`
- **Implications**:
  - モデル定義は定数ファイルで集中管理し、表示名・説明・モデルIDを含む
  - デフォルトモデルは現在と同じ `claude-sonnet-4-20250514` を維持

### フロントエンド Container/Presentational パターンとの統合
- **Context**: 既存の UI アーキテクチャにモデルセレクター UI を統合する方法
- **Sources Consulted**: プロジェクト内コード分析
- **Findings**:
  - `ChatContainer` がロジック集約のコンテナコンポーネント
  - `useChatSession` が `DefaultChatTransport` を使用し、`body` オプションで追加データを送信
  - `useConversations` が会話の CRUD 操作を管理
  - `WelcomeScreen` が新規会話時の画面で、モデルセレクターの表示場所として適切
  - `ChatHeader` が会話ヘッダーで、選択済みモデル名の表示場所として適切
- **Implications**:
  - モデル選択状態は `ChatContainer` で管理
  - `useChatSession` の `body` に `modelId` を追加
  - 新規コンポーネント `ModelSelector` を `src/features/chat/components/` に追加
  - `WelcomeScreen` にモデルセレクターを統合

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| requestContext + 定数定義 | Mastra requestContext でモデルを動的解決、モデル定義は定数で集中管理 | 公式パターン準拠、既存コード変更最小 | requestContext の型安全性が Map ベース | 採用 |
| Agent インスタンス複数生成 | モデルごとに Agent インスタンスを作成 | 型安全性が高い | モデル追加時にコード変更必要、スケーラビリティ低 | 却下 |
| ミドルウェア方式 | Mastra サーバーミドルウェアで requestContext を設定 | 関心事の分離 | Next.js API Routes では Mastra ミドルウェアが直接使えない | 却下 |

## Design Decisions

### Decision: requestContext による動的モデル解決
- **Context**: ユーザーが選択したモデルをエージェント実行時に動的に切り替える必要がある
- **Alternatives Considered**:
  1. Agent インスタンスをモデルごとに作成し、agentId で切り替え
  2. Agent の `model` プロパティを関数形式に変更し、requestContext から解決
  3. エージェント呼び出し時に `model` オプションを直接オーバーライド
- **Selected Approach**: Option 2 - requestContext による動的モデル解決
- **Rationale**: Mastra 公式ドキュメントで推奨されるパターン。既存の Agent 定義を最小限の変更で対応可能。モデル追加時にコード変更不要。
- **Trade-offs**: requestContext の Map ベースの型安全性は文字列キーに依存するが、サーバーサイドでの構築に限定されるためリスクは低い
- **Follow-up**: requestContext のキー名を定数化して typo を防止

### Decision: モデル定義の集中管理
- **Context**: フロントエンド（UI 表示）とバックエンド（モデル解決・バリデーション）の双方でモデル情報を参照する必要がある
- **Alternatives Considered**:
  1. フロントエンドとバックエンドで個別に定義
  2. 共有定数ファイルで一元管理
  3. API エンドポイントでモデル一覧を動的に提供
- **Selected Approach**: Option 2 - `src/lib/models.ts` で定数として一元管理
- **Rationale**: モデル一覧は静的データであり、API を経由する必要がない。`src/lib/` はフロントエンド・バックエンド双方からインポート可能。型安全性も確保できる。
- **Trade-offs**: モデル追加時はコード変更+デプロイが必要だが、Anthropic モデルの追加頻度を考慮すると許容範囲
- **Follow-up**: なし

### Decision: Conversation テーブルへの modelId カラム追加
- **Context**: 会話に紐づくモデル情報を永続化し、既存会話の再開時に同じモデルで応答を継続する必要がある
- **Alternatives Considered**:
  1. Conversation テーブルに nullable String カラムを追加
  2. 別テーブル（ConversationSettings）を作成
  3. Message テーブルにモデル情報を持たせる
- **Selected Approach**: Option 1 - Conversation に `modelId` nullable String カラムを追加
- **Rationale**: 最もシンプルで、既存データとの後方互換性を維持（null = デフォルトモデル）。別テーブルは過剰設計。メッセージ単位のモデル管理は要件外（会話中はモデル固定）。
- **Trade-offs**: 会話中のモデル変更には対応できないが、現在の要件ではモデルは会話開始時に固定されるため問題なし
- **Follow-up**: マイグレーション時の既存データ確認

## Risks & Mitigations
- `RequestContext` のインポートパスが Mastra バージョンにより異なる可能性 → 実装時に `@mastra/core` のエクスポートを確認
- モデル一覧のハードコードにより、新モデルリリース時に更新が必要 → 定数ファイルの更新は容易で、将来的に API ベースの動的取得に移行可能
- 既存会話データの `modelId` が null → デフォルトモデルへのフォールバックで後方互換性を維持

## References
- [Using Agents | Mastra Docs](https://mastra.ai/docs/agents/overview) - Agent の model プロパティの関数形式
- [Request Context | Mastra Docs](https://mastra.ai/docs/server/request-context) - RequestContext の構築と利用
- [handleChatStream Reference](https://mastra.ai/reference/ai-sdk/handle-chat-stream) - handleChatStream のパラメータ仕様
- [Models overview - Claude API Docs](https://platform.claude.com/docs/en/about-claude/models/overview) - Anthropic モデル一覧
