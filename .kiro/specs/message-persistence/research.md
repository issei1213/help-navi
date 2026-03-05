# Research & Design Decisions

---
**Purpose**: メッセージ永続化機能の設計判断を支える調査記録と根拠を記載する。
---

## Summary
- **Feature**: `message-persistence`
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - 既存コードベースにPrismaスキーマ、APIルート、カスタムフック、UIコンポーネントが既に部分実装済み
  - AI応答メッセージの永続化（`saveAssistantMessage`）が定義済みだが、ストリーム完了時のコールバックに未接続
  - `@mastra/ai-sdk` の `handleChatStream` と Vercel AI SDK の `createUIMessageStreamResponse` の統合パターンが確立済み

## Research Log

### Prisma v6.19.x と Next.js 16.x の統合パターン
- **Context**: steering の `database.md` にてPrisma v6系を採用する方針が決定済み。Prisma 7はESM必須のため現行CJS構成と非互換。
- **Sources Consulted**: `database.md` steering文書、既存 `prisma-client.ts` 実装
- **Findings**:
  - globalThisキャッシュによるシングルトンパターンが既に実装済み
  - 開発環境ではHMR時の接続プール枯渇を防止する仕組みが動作中
  - `@prisma/client` v6.19.x のCUID生成（`@default(cuid())`）を主キーに使用
- **Implications**: 既存パターンをそのまま踏襲。新規の技術判断は不要。

### Vercel AI SDK ストリーミングとメッセージ永続化の統合
- **Context**: `saveAssistantMessage` 関数が `route.ts` に定義されているが、`createUIMessageStreamResponse` のストリーム完了コールバックに接続されていない。
- **Sources Consulted**: 既存の `src/app/api/chat/route.ts` 実装
- **Findings**:
  - `handleChatStream` は Mastra Agent のストリーミングを処理し、ReadableStream を返却する
  - `createUIMessageStreamResponse` は SSE形式でストリームをクライアントに送信する
  - AI応答の完全なテキストを取得するには、ストリームの完了を検知する仕組みが必要
  - `@mastra/ai-sdk` の `handleChatStream` が返すストリームは `onFinish` コールバックを直接サポートしていないため、ストリームのラッピングまたは別のアプローチが必要
- **Implications**: AI応答の永続化方式はタスク実装時に具体的なアプローチを検証する必要がある。設計レベルでは「ストリーム完了時にDB保存」というインターフェース契約を定義する。

### 既存UIアーキテクチャとの統合ポイント
- **Context**: Container/Presentationalパターンが既に確立済み。
- **Sources Consulted**: `chat-container.tsx`, `use-conversations.ts`, `use-chat-session.ts`
- **Findings**:
  - `ChatContainer` がContainer層としてフック呼び出しとprops分配を担当
  - `useConversations` が会話CRUD操作とローカルキャッシュを管理
  - `useChatSession` が `@ai-sdk/react` の `useChat` をラップし、`conversationId` をTransport bodyに含める
  - `activeMessages`（DB取得）を `UIMessage` 形式に変換してuseChatに渡すフローが確立済み
- **Implications**: 新規のUI設計判断は不要。既存パターンの文書化と要件トレーサビリティの確認に注力する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン維持 | Next.js API Routes + Prisma ORM + Container/Presentational | 既に実装済み、学習コスト不要 | なし | 採用 |
| サービスレイヤー追加 | features層にサービスクラスを導入 | 関心の分離が向上 | 過剰設計、既存パターンとの乖離 | 却下 |

## Design Decisions

### Decision: APIルートでの直接Prisma呼び出し
- **Context**: APIルートハンドラ内で直接Prismaクライアントを呼び出すか、別途サービスレイヤーを設けるか
- **Alternatives Considered**:
  1. APIルート内で直接Prisma呼び出し（現行方式）
  2. `src/features/chat/services/` にサービスクラスを導入
- **Selected Approach**: APIルート内での直接Prisma呼び出し
- **Rationale**: CRUD操作のみで複雑なビジネスロジックが不要。既存のS3ツール実装も同様にinfrastructure層を直接呼び出すパターンを採用している。
- **Trade-offs**: 単純さを優先し、テスタビリティの一部を犠牲にしている。将来的にビジネスロジックが増えた場合はサービスレイヤーの導入を検討する。
- **Follow-up**: なし

### Decision: 後方互換性を `conversationId` の有無で制御
- **Context**: 既存のチャットAPIを壊さずに永続化機能を追加する方法
- **Alternatives Considered**:
  1. `conversationId` の有無で分岐（オプショナルパラメータ方式）
  2. 別エンドポイント `/api/chat/persistent` を新設
- **Selected Approach**: `conversationId` の有無による分岐
- **Rationale**: 既存のエンドポイントURLを維持でき、フロントエンド側の修正が最小限。`conversationId` が未指定の場合は既存動作を完全に保持する。
- **Trade-offs**: 一つのエンドポイントに2つの動作モードが混在するが、分岐ロジックは単純。
- **Follow-up**: なし

### Decision: タイトル自動生成はメッセージ先頭30文字を使用
- **Context**: AI（LLM）による要約生成か、単純な文字列切り出しか
- **Alternatives Considered**:
  1. ユーザーメッセージの先頭30文字を切り出し
  2. LLMでタイトルを要約生成
- **Selected Approach**: 先頭30文字の切り出し
- **Rationale**: 追加のAPI呼び出しコストが不要。レスポンス遅延なし。要件 3.1 で明示的に先頭30文字と定義されている。
- **Trade-offs**: LLM要約と比較してタイトルの品質は劣るが、即時性とシンプルさを優先。
- **Follow-up**: 将来的にLLM要約方式への移行を検討する余地あり

## Risks & Mitigations
- AI応答の永続化において、ストリーム完了の検知方法が `@mastra/ai-sdk` の実装に依存する -- タスク実装時に具体的なアプローチを検証し、必要に応じて代替手段を採用する
- データベース障害時のストリーミング影響 -- エラーハンドリングで永続化失敗をログ出力のみとし、ストリーミング応答は中断しない設計を採用済み
- 会話一覧の50件制限 -- 現時点では十分だが、ユーザー数増加時にページネーション導入を検討する

## References
- [Prisma v6 Documentation](https://www.prisma.io/docs) -- ORM設定とマイグレーション
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs) -- useChat、ストリーミングUI
- [Mastra Framework Documentation](https://mastra.ai/docs) -- AIエージェント統合
