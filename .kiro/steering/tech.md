# 技術スタック

## アーキテクチャ

Next.js App Routerベースのフルスタック構成。
フロントエンドはReact 19 + Tailwind CSS 4、バックエンドはNext.js API Routes。
AIエージェント管理にMastraフレームワークを採用し、サーバーサイド専用モジュールとして動作する。

## コア技術

- **言語**: TypeScript 5.x (strict mode)
- **フレームワーク**: Next.js 16.x (App Router)
- **UIライブラリ**: React 19.x
- **ランタイム**: Node.js 20+

## 主要ライブラリ

| ライブラリ | 役割 |
|-----------|------|
| `@mastra/core` | AIエージェント定義・管理フレームワーク |
| `@mastra/ai-sdk` | Mastra + AI SDK統合（ストリーミング処理） |
| `ai` / `@ai-sdk/react` | Vercel AI SDK v6（useChat、ストリーミングUI、messageMetadataSchema） |
| `@aws-sdk/client-s3` | S3/MinIOファイル操作 |
| `@prisma/client` v6.19.x | PostgreSQL ORM（型安全なDBアクセス） |
| `zod` / `zod/v4` | スキーマバリデーション（ツール入出力定義、AI SDK v6メタデータスキーマ） |
| `streamdown` / `@streamdown/code` / `@streamdown/cjk` | AI応答のMarkdownレンダリング（ストリーミング対応） |
| `tailwindcss` v4 | ユーティリティファーストCSS |

## 開発標準

### 型安全性
- TypeScript strict mode有効
- `"strict": true` を tsconfig.json で設定
- Zodによるランタイムバリデーション（ツール入出力定義）
- AI SDK v6の `messageMetadataSchema` には `zod/v4` を使用（AI SDK v6の要件）
- 環境変数バリデーションは配列ベース方式（`REQUIRED_ENV_VARS`）に統一（Zodは不使用）

### コード品質
- **ESLint 9.x**: next/core-web-vitals + next/typescript + eslint-config-prettier
- **Prettier 3.x**: セミコロンあり、ダブルクォート、末尾カンマes5、printWidth 80

### テスト
- **Vitest**: テスト環境はNode.js
- テストパターン: `src/**/*.test.ts`, `src/**/*.test.tsx`, `__tests__/**/*.test.ts`
- パスエイリアス `@/` をVitestでも設定済み

### コーディング規約
- コメントは日本語で記述
- JSDocスタイルのモジュール・関数ドキュメント
- エラーメッセージは日本語

## 開発環境

### 必須ツール
- Node.js v20+
- pnpm v10+
- Docker / Docker Compose v2+

### 主要コマンド
```bash
# 開発: Docker Compose起動（MinIO + PostgreSQL） + Next.js devサーバー
pnpm dev

# ビルド
pnpm build

# テスト
pnpm test

# Lint
pnpm lint

# フォーマット
pnpm format

# データベース操作
pnpm db:migrate:dev    # 開発用マイグレーション
pnpm db:migrate:deploy # 本番用マイグレーション適用
pnpm db:generate       # Prisma Client再生成
pnpm db:studio         # GUIデータブラウザ
```

## 主要な技術的判断

- **Mastraをサーバーサイド専用として分離**: `serverExternalPackages` で設定し、クライアントバンドルへの混入を防止
- **環境変数バリデーションは警告方式**: 起動ブロックせず、未設定時はコンソール警告のみ
- **MinIO + PostgreSQLをDocker Composeで管理**: MinIOは初期化コンテナでバケット自動作成、PostgreSQLはヘルスチェック付きで起動
- **Prisma v6系の採用**: Prisma 7はESM必須のため、現行CJS構成との互換性を考慮しv6.19.xを選択
- **AIモデルの動的選択**: Mastraの `requestContext` パターンを使用し、エージェントの `model` プロパティを関数形式で定義。会話ごとにユーザーが選択したモデルを動的に解決する（デフォルト: Claude Sonnet 4.6）。利用可能モデルは `src/lib/models.ts` で一元管理
- **Streamdownの採用**: AI応答のMarkdownレンダリングに[Streamdown](https://streamdown.ai/)を選択。Vercel製のreact-markdown代替で、ストリーミング最適化（不完全なMarkdownの自動補完）、Shikiベースのシンタックスハイライト、コピーボタン・言語ラベル・デュアルテーマをビルトインで提供。CJK対応パッケージ（`@streamdown/cjk`）を併用
- **ストリーミングメタデータパターン**: Mastraの `toAISdkStream` + AI SDKの `createUIMessageStream` を組み合わせ、`messageMetadata` コールバックでストリーム変換時にカスタムメタデータ（トークン使用量等）を注入。クライアント側では `useChat` のジェネリック型パラメータと `messageMetadataSchema`（zod/v4）で型安全にメタデータを受信する

---
_created_at: 2026-03-04_
_updated_at: 2026-03-07 - ストリーミングメタデータパターン（toAISdkStream + messageMetadataSchema）とzod/v4使用を追記_
