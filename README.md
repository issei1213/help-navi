# Mastra + Claude AI エージェント開発環境

Next.js + Mastra + Claude API + S3(MinIO) を統合したAIエージェント開発環境です。

## 前提条件

以下のツールがインストールされている必要があります。

- **Node.js** v20以上
- **pnpm** v10以上
- **Docker** / **Docker Compose** v2以上

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.example` を `.env.local` にコピーし、必要な値を設定してください。

```bash
cp .env.example .env.local
```

`.env.local` を編集して、以下の環境変数を設定します。

| 変数名                 | 説明                                                                           | 必須 |
| ---------------------- | ------------------------------------------------------------------------------ | ---- |
| `ANTHROPIC_API_KEY`    | Anthropic Claude APIキー（[コンソール](https://console.anthropic.com/)で取得） | Yes  |
| `S3_ENDPOINT`          | S3/MinIOエンドポイントURL（デフォルト: `http://localhost:9000`）               | Yes  |
| `S3_ACCESS_KEY_ID`     | S3/MinIOアクセスキー（デフォルト: `minioadmin`）                               | Yes  |
| `S3_SECRET_ACCESS_KEY` | S3/MinIOシークレットキー（デフォルト: `minioadmin`）                           | Yes  |
| `S3_BUCKET_NAME`       | S3バケット名（デフォルト: `default-bucket`）                                   | Yes  |
| `S3_REGION`            | S3リージョン（デフォルト: `us-east-1`）                                        | No   |

### 3. MinIO（S3互換ストレージ）の起動

Docker ComposeでMinIOを起動します。デフォルトバケット（`default-bucket`）が自動作成されます。

```bash
docker compose up -d
```

MinIO Webコンソールにブラウザからアクセスできます。

- **URL**: http://localhost:9001
- **ユーザー名**: `minioadmin`
- **パスワード**: `minioadmin`

### 4. Next.jsアプリケーションの起動

```bash
pnpm dev
```

ブラウザで http://localhost:3000 にアクセスしてください。



## 開発コマンド

| コマンド               | 説明                         |
| ---------------------- | ---------------------------- |
| `pnpm dev`             | 開発サーバーを起動           |
| `pnpm build`           | プロダクションビルド         |
| `pnpm start`           | プロダクションサーバーを起動 |
| `pnpm lint`            | ESLintを実行                 |
| `pnpm format`          | Prettierでコードフォーマット |
| `pnpm test`            | テストを実行                 |
| `docker compose up -d` | MinIOを起動                  |
| `docker compose down`  | MinIOを停止                  |

## トラブルシューティング

### Docker/MinIOが起動しない

Docker Desktopが起動しているか確認してください。

```bash
docker compose up -d
docker compose logs minio
```

### ANTHROPIC_API_KEY が未設定の警告が表示される

`.env.local` に有効な Anthropic APIキーを設定してください。

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

APIキーは https://console.anthropic.com/ で取得できます。

### S3接続エラー

MinIOが起動しているか確認してください。

```bash
docker compose ps
```

MinIOが停止している場合は再起動してください。

```bash
docker compose up -d
```

### ポートが使用中

MinIOのデフォルトポート（9000, 9001）が他のアプリケーションで使用されている場合は、`docker-compose.yml` のポート設定を変更してください。

## 技術スタック

- **フロントエンド**: Next.js 16.x / React 19.x / Tailwind CSS 4.x
- **AIフレームワーク**: Mastra 1.8.x / AI SDK
- **AIモデル**: Anthropic Claude (claude-sonnet-4-20250514)
- **ストレージ**: MinIO (Docker) / AWS SDK v3
- **パッケージマネージャー**: pnpm
- **コード品質**: ESLint 9.x / Prettier 3.x
- **テスト**: Vitest
- **言語**: TypeScript 5.x (strict mode)
