# Research & Design Decisions

---
**Purpose**: Next.js + Mastra + Claude API + S3/MinIO統合環境の技術設計を裏付けるディスカバリー調査結果を記録する。

**Usage**:
- ディスカバリーフェーズでの調査活動と成果を記録
- `design.md`には詳細すぎるデザイン決定のトレードオフを文書化
- 将来の監査や再利用のための参照とエビデンスを提供
---

## Summary
- **Feature**: `docker-mastra-claude-env`
- **Discovery Scope**: New Feature（グリーンフィールド）
- **Key Findings**:
  - Mastra v1.6.0はNext.jsとの直接統合（Direct Integration）をサポートし、`npx mastra@latest init`で初期化可能
  - Anthropic/Claudeモデルは`anthropic/claude-sonnet-4-20250514`のようなモデル文字列と`ANTHROPIC_API_KEY`環境変数で設定
  - S3互換ストレージにはMinIO（Docker）を使用し、AWS SDK（`@aws-sdk/client-s3`）でアクセス。Mastraの`createTool()`でカスタムツールとして定義

## Research Log

### Mastra + Next.js統合アプローチ
- **Context**: Mastraフレームワークの公式Next.js統合方法の調査
- **Sources Consulted**:
  - [Mastra公式ブログ: Next.js統合ガイド](https://mastra.ai/blog/nextjs-integration-guide)
  - [Mastra公式ドキュメント: Getting Started with Next.js](https://mastra.ai/guides/getting-started/next-js)
  - [Mastra公式ドキュメント: Agent Overview](https://mastra.ai/docs/agents/overview)
- **Findings**:
  - 2つの統合アプローチが存在: (1) Direct Integration（一体型）、(2) Separate Backend（分離型）
  - Direct Integrationは`npx mastra@latest init`でNext.jsプロジェクト内にMastraを初期化
  - `src/mastra/`ディレクトリが生成され、`index.ts`（設定）、`agents/`（エージェント定義）、`tools/`（ツール定義）を含む
  - `next.config.ts`に`serverExternalPackages: ["@mastra/*"]`の追加が必要
  - `@mastra/ai-sdk`、`@ai-sdk/react`、`ai`パッケージが追加で必要
  - Server ActionsからMastra Agentを直接呼び出すことが推奨される（`"use server"`ディレクティブ使用）
  - API Routes（Route Handlers）からのストリーミングレスポンスには`createUIMessageStreamResponse()`を使用
- **Implications**: Direct Integration方式を採用し、Next.jsのサーバーサイドから直接エージェントを呼び出す構成が要件に合致

### Anthropic/Claude APIのMastra統合
- **Context**: Claude APIをMastraエージェントのモデルプロバイダーとして使用する方法
- **Sources Consulted**:
  - [Mastra公式ドキュメント: Anthropic Models](https://mastra.ai/models/providers/anthropic)
  - [Mastra公式ドキュメント: Models Overview](https://mastra.ai/models)
- **Findings**:
  - モデル指定は`"anthropic/claude-sonnet-4-20250514"`形式の文字列
  - 環境変数`ANTHROPIC_API_KEY`が自動検出される
  - APIキー未設定時はランタイムエラーが発生し、設定すべき変数名が明示される
  - 利用可能モデル: `claude-opus-4-1`、`claude-sonnet-4-20250514`、`claude-3-5-haiku-20241022`等
- **Implications**: Mastraのモデルルーティング機能を使い、環境変数ベースでClaude APIを設定

### S3互換ストレージ（MinIO + AWS SDK）
- **Context**: MastraエージェントからS3互換ストレージにアクセスする方法の調査
- **Sources Consulted**:
  - [MinIO公式ドキュメント](https://min.io/docs/minio/container/index.html)
  - [MinIO Docker Hub](https://hub.docker.com/r/minio/minio)
  - [AWS SDK v3 S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/)
  - [Mastra公式ドキュメント: createTool Reference](https://mastra.ai/reference/tools/create-tool)
- **Findings**:
  - MinIOはS3互換のオブジェクトストレージで、Docker Imageが公式提供
  - ポート9000がS3 APIエンドポイント、9001がWebコンソール
  - AWS SDK v3（`@aws-sdk/client-s3`）でMinIOに接続可能。`endpoint`と`forcePathStyle: true`の設定が必要
  - `S3Client`の初期化: `{ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true }`
  - 主要コマンド: `ListObjectsV2Command`、`GetObjectCommand`、`PutObjectCommand`、`DeleteObjectCommand`
  - MinIO Client（`minio/mc`）でバケット作成等の管理操作が可能。Docker Compose initコンテナで初期化に使用可能
  - Mastra `createTool()`でZodスキーマベースのカスタムツールとして定義可能
- **Implications**: Docker上のMinIOをS3互換ストレージとして使用し、AWS SDKで接続。Mastraの`createTool()`でS3操作ツールを定義

### Mastra createTool API
- **Context**: カスタムツールの定義方法
- **Sources Consulted**:
  - [Mastra公式ドキュメント: createTool Reference](https://mastra.ai/reference/tools/create-tool)
- **Findings**:
  - `createTool()`関数でZodスキーマベースのツールを定義
  - パラメータ: `id`、`description`、`inputSchema`（Zod）、`outputSchema`（Zod）、`execute`関数
  - `execute`関数は`{ context, runtimeContext, tracingContext, abortSignal }`を受け取る
- **Implications**: S3操作ツールをcreateToolで定義し、エージェントに注入する

### Next.js App Router のAPI Routes / Server Actions
- **Context**: Next.jsのサーバーサイドからのエージェント呼び出しパターン
- **Sources Consulted**:
  - [Next.js公式ドキュメント: Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- **Findings**:
  - Server Actions: コンポーネントからの直接呼び出し、型安全性が高い
  - Route Handlers: ストリーミングレスポンス対応、外部API向け
  - セキュリティ: `NEXT_PUBLIC_`プレフィックスなしの環境変数はサーバーのみで利用可能
- **Implications**: ストリーミングチャットにはRoute Handler、単発のエージェント呼び出しにはServer Actionsを使い分ける

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Direct Integration | Mastraをnext.jsプロジェクト内に直接統合 | デプロイが簡単、単一プロジェクト管理、開発が高速 | スケーリングが複雑 | 要件に合致 |
| Separate Backend | Mastraを独立サーバーとして起動 | 独立スケーリング | 開発環境の複雑化 | 不採用 |

## Design Decisions

### Decision: Direct Integration方式の採用
- **Context**: 要件1は`pnpm dev`で全てが起動することを求めている
- **Selected Approach**: Direct Integration
- **Rationale**: 単一プロセスで管理できるDirect Integrationが適切
- **Trade-offs**: スケーラビリティを犠牲にして開発の簡便さを優先

### Decision: MinIO + AWS SDKによるS3互換ストレージ
- **Context**: 要件4でファイル管理をS3で行い、開発環境にDockerのMinIOを使用することが求められている
- **Alternatives Considered**:
  1. MinIO（Docker） + AWS SDK — ローカルS3互換ストレージ
  2. LocalStack — AWSサービスエミュレーター
  3. 実AWS S3への直接接続
- **Selected Approach**: MinIO（Docker）+ AWS SDK（`@aws-sdk/client-s3`）
- **Rationale**: MinIOはS3 API完全互換であり、AWS SDKでそのまま接続可能。本番環境（AWS S3）への移行時にエンドポイントURLの変更のみで対応できる。LocalStackと比較してシンプルで軽量。Docker Imageが公式提供されており信頼性が高い
- **Trade-offs**: Docker必須だが、MinIOは軽量で起動が速い。WebコンソールでGUI管理も可能
- **Follow-up**: 本番環境移行時のIAMポリシー設定手順をドキュメントに記載する必要あり

### Decision: Next.js 16（最新安定版）の採用
- **Context**: フロントエンドフレームワークのバージョン選定
- **Selected Approach**: Next.js 16.1.x（2026年2月時点の最新安定版: 16.1.6）
- **Rationale**: Turbopackが安定化済み。Mastra公式ドキュメントもNext.js最新版との統合を推奨
- **Follow-up**: `create-next-app@latest`で初期化すれば自動的に最新版が選択される

## Risks & Mitigations
- **Risk 1**: Docker未インストール環境でのMinIO起動不可 — READMEに前提条件として記載し、インストール手順へのリンクを提供
- **Risk 2**: MinIOコンテナ未起動時のS3接続エラー — エラーメッセージに`docker compose up`の実行を案内
- **Risk 3**: Next.js + Mastraのバンドル問題 — `serverExternalPackages: ["@mastra/*"]`で明示的にexternalize
- **Risk 4**: 環境変数の漏洩リスク — `.env.local`を`.gitignore`に追加

## References
- [Mastra公式ドキュメント](https://mastra.ai/docs) — フレームワーク全体のリファレンス
- [Mastra Next.js統合ブログ](https://mastra.ai/blog/nextjs-integration-guide) — 2つの統合アプローチの比較
- [Mastra createTool Reference](https://mastra.ai/reference/tools/create-tool) — ツール定義APIリファレンス
- [Mastra Anthropic Models](https://mastra.ai/models/providers/anthropic) — Anthropicモデルプロバイダー設定
- [MinIO公式ドキュメント](https://min.io/docs/minio/container/index.html) — MinIO Docker構成
- [AWS SDK v3 S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/) — S3クライアントリファレンス
- [Next.js 16 Blog](https://nextjs.org/blog/next-16) — Next.js 16リリース情報
- [npm: @mastra/core](https://www.npmjs.com/package/@mastra/core) — Mastraコアパッケージ（v1.6.0）
