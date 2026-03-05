# Technical Design: PostgreSQL環境構築

## Overview

**Purpose**: 本機能は、help-naviプロジェクトの開発環境にPostgreSQLデータベースとPrisma ORMの接続基盤を提供する。

**Users**: 開発者がDocker Composeコマンド一つでPostgreSQLを含む全サービスを起動し、型安全なデータベースアクセスを即座に利用可能にする。

**Impact**: 既存のDocker Compose構成（MinIO）にPostgreSQLサービスを追加し、`src/infrastructure/`にPrismaクライアントモジュールを配置する。既存のサービス・コードへの変更は環境変数バリデーションの拡張に限定される。

### Goals
- Docker ComposeによるPostgreSQLの自動起動・データ永続化・ヘルスチェック環境の構築
- Prisma ORMによる型安全なデータベース接続基盤の提供
- 既存の開発ワークフロー（`pnpm dev`）へのシームレスな統合
- マイグレーション運用基盤の整備

### Non-Goals
- 具体的なデータベーステーブル・モデルの定義（別機能で実施）
- 本番環境向けのデータベース構成（接続プーリング、レプリケーション等）
- 既存の環境変数バリデーション全体のZodリファクタリング
- Prisma 7へのアップグレード（ESM移行と合わせて将来対応）

## Architecture

### Existing Architecture Analysis

現在のプロジェクトは以下の構成を持つ。

- **Docker Compose**: MinIOサービス（S3互換ストレージ）と初期化コンテナで構成
- **インフラストラクチャ層**: `src/infrastructure/s3-client.ts`がS3クライアントを関数ベースで提供
- **環境変数管理**: `.env.example`でテンプレート提供、`src/lib/env-validation.ts`で警告ベースのバリデーション
- **開発ワークフロー**: `pnpm dev`がDocker Compose起動とNext.js devサーバーを並列実行

PostgreSQL/Prisma追加にあたり、これらの既存パターンを踏襲する。

### Architecture Pattern & Boundary Map

```mermaid
graph TB
    subgraph DockerCompose[Docker Compose]
        MinIO[MinIO S3]
        MinioInit[MinIO Init]
        PostgreSQL[PostgreSQL 17]
    end

    subgraph NextApp[Next.js Application]
        subgraph Infra[src/infrastructure]
            S3Client[s3-client.ts]
            PrismaClient[prisma-client.ts]
        end
        subgraph Lib[src/lib]
            EnvValidation[env-validation.ts]
        end
        subgraph PrismaDir[prisma]
            Schema[schema.prisma]
            Migrations[migrations]
        end
    end

    PrismaClient -->|DATABASE_URL| PostgreSQL
    S3Client -->|S3_ENDPOINT| MinIO
    EnvValidation -->|検証| PrismaClient
    EnvValidation -->|検証| S3Client
    PrismaClient -->|スキーマ参照| Schema
```

**Architecture Integration**:
- 選択パターン: 既存インフラストラクチャ層への水平拡張。S3クライアントと同じ`src/infrastructure/`に配置
- ドメイン境界: Prismaクライアントはインフラストラクチャ層の責務として、他の層からインポート可能
- 既存パターン踏襲: Docker Composeサービス定義、環境変数テンプレート、バリデーション警告方式
- 新規コンポーネント: `prisma-client.ts`（シングルトン接続管理）、`prisma/schema.prisma`（スキーマ定義）
- Steering準拠: 一方向依存（infrastructure → lib）、kebab-caseファイル命名、JSDocコメント

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Data / ORM | Prisma 6.19.x (`prisma`, `@prisma/client`) | データベーススキーマ管理・型安全クエリ | Prisma 7はESM必須のためv6採用（`research.md`参照） |
| Data / Storage | PostgreSQL 17 (Docker image: `postgres:17`) | リレーショナルデータベース | LTS版、Docker公式イメージ |
| Infrastructure | Docker Compose v2 | PostgreSQLサービスの定義・管理 | 既存MinIO構成に追加 |
| Validation | 既存の配列ベースバリデーション | PostgreSQL環境変数の必須チェック | 既存S3バリデーションと同一方式 |

## System Flows

### 開発環境起動フロー

```mermaid
sequenceDiagram
    participant Dev as 開発者
    participant PNPM as pnpm dev
    participant DC as Docker Compose
    participant PG as PostgreSQL
    participant MinIO as MinIO
    participant Next as Next.js

    Dev->>PNPM: pnpm dev
    PNPM->>DC: docker compose up
    DC->>PG: PostgreSQLコンテナ起動
    DC->>MinIO: MinIOコンテナ起動
    PG-->>DC: ヘルスチェック通過
    MinIO-->>DC: ヘルスチェック通過
    PNPM->>Next: next dev
    Next->>Next: 環境変数バリデーション（警告）
    Note over Dev,Next: Ctrl+Cで終了時
    Dev->>PNPM: SIGINT
    PNPM->>DC: docker compose down
    DC->>PG: PostgreSQL停止
    DC->>MinIO: MinIO停止
```

Key Decisions: `docker compose up`で全サービスが並列起動し、`trap`によるSIGINTハンドリングで確実に停止する。既存の`pnpm dev`スクリプトの変更は不要（Docker Composeが新サービスを自動的に含む）。

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1 | Docker Compose PostgreSQLサービス定義 | DockerComposeConfig | - | 開発環境起動フロー |
| 1.2 | docker compose upでの自動起動 | DockerComposeConfig | - | 開発環境起動フロー |
| 1.3 | データ永続化ボリューム | DockerComposeConfig | - | - |
| 1.4 | ヘルスチェック定義 | DockerComposeConfig | - | 開発環境起動フロー |
| 1.5 | デフォルトDB自動作成 | DockerComposeConfig | - | - |
| 2.1 | DATABASE_URL・個別環境変数テンプレート | EnvTemplate | - | - |
| 2.2 | 既存S3と同じセクション構成 | EnvTemplate | - | - |
| 2.3 | Docker Compose設定との整合性 | DockerComposeConfig, EnvTemplate | - | - |
| 2.4 | 開発デフォルト値 | EnvTemplate | - | - |
| 3.1 | Prisma依存関係導入 | PrismaSetup | - | - |
| 3.2 | schema.prisma配置・PostgreSQL設定 | PrismaSchema | - | - |
| 3.3 | Prismaクライアントのインフラ層配置 | PrismaClientModule | PrismaClientService | - |
| 3.4 | DATABASE_URLからの接続確立 | PrismaClientModule, PrismaSchema | PrismaClientService | - |
| 3.5 | シングルトンパターン | PrismaClientModule | PrismaClientService | - |
| 3.6 | 接続エラーメッセージ | PrismaClientModule | PrismaClientService | - |
| 4.1 | PostgreSQL環境変数バリデーション | EnvValidationExtension | EnvValidationService | - |
| 4.2 | 未設定時の警告メッセージ | EnvValidationExtension | EnvValidationService | - |
| 4.3 | 起動非ブロック | EnvValidationExtension | EnvValidationService | - |
| 4.4 | Zodスキーマバリデーション | EnvValidationExtension | EnvValidationService | - |
| 5.1 | pnpm devでの自動起動 | DockerComposeConfig | - | 開発環境起動フロー |
| 5.2 | 終了時の自動停止 | DockerComposeConfig | - | 開発環境起動フロー |
| 5.3 | ポート競合回避 | DockerComposeConfig | - | - |
| 5.4 | サービス独立動作 | DockerComposeConfig | - | - |
| 6.1 | マイグレーションファイル管理 | PrismaSchema, PrismaMigrationScripts | - | - |
| 6.2 | npmスクリプト定義 | PrismaMigrationScripts | - | - |
| 6.3 | db:migrate:devコマンド | PrismaMigrationScripts | - | - |
| 6.4 | db:migrate:deployコマンド | PrismaMigrationScripts | - | - |
| 6.5 | db:generateコマンド | PrismaMigrationScripts | - | - |
| 6.6 | マイグレーションのGit管理 | PrismaSchema | - | - |
| 6.7 | db:studioコマンド | PrismaMigrationScripts | - | - |

## Components and Interfaces

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies | Contracts |
|-----------|--------------|--------|--------------|------------------|-----------|
| DockerComposeConfig | Infrastructure | PostgreSQLサービスをDocker Composeに追加 | 1.1-1.5, 2.3, 5.1-5.4 | PostgreSQL 17 (External, P0) | - |
| EnvTemplate | Configuration | PostgreSQL環境変数テンプレート提供 | 2.1-2.4 | - | - |
| PrismaSchema | Data / ORM | Prismaスキーマ定義とdatasource設定 | 3.2, 6.1, 6.6 | Prisma CLI (External, P0) | - |
| PrismaClientModule | Infrastructure | シングルトンPrismaクライアント提供 | 3.1, 3.3-3.6 | @prisma/client (External, P0) | Service |
| EnvValidationExtension | Library | PostgreSQL環境変数を既存配列ベースバリデーションに追加 | 4.1-4.4 | なし（既存方式踏襲） | Service |
| PrismaMigrationScripts | Configuration | マイグレーション操作用npmスクリプト | 6.2-6.5, 6.7 | Prisma CLI (External, P0) | - |

### Infrastructure

#### DockerComposeConfig

| Field | Detail |
|-------|--------|
| Intent | 既存Docker Compose構成にPostgreSQLサービスとデータ永続化を追加する |
| Requirements | 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 5.1, 5.2, 5.3, 5.4 |

**Responsibilities & Constraints**
- PostgreSQL 17サービスの定義（イメージ、ポート、環境変数、ボリューム、ヘルスチェック）
- 既存MinIOサービスとの並列動作・独立性の保証
- `POSTGRES_DB`環境変数によるデフォルトデータベースの自動作成
- ホストポート5432の公開（MinIO 9000/9001、Next.js 3000と競合しない）

**Dependencies**
- External: PostgreSQL 17 Docker公式イメージ (`postgres:17`) — データベースエンジン (P0)

**Implementation Notes**
- Integration: 既存`volumes`セクションに`postgres-data`ボリュームを追加。既存`minio-data`との共存
- Validation: `pg_isready`によるヘルスチェック（`interval: 5s`, `timeout: 5s`, `retries: 5`, `start_period: 10s`）
- Risks: PostgreSQLの初期起動に10秒程度要する場合があり、`start_period`で対応

### Configuration

#### EnvTemplate

| Field | Detail |
|-------|--------|
| Intent | `.env.example`にPostgreSQL接続用環境変数のテンプレートを追加する |
| Requirements | 2.1, 2.2, 2.3, 2.4 |

**Responsibilities & Constraints**
- `DATABASE_URL`接続文字列と個別環境変数（ホスト、ポート、ユーザー名、パスワード、データベース名）の定義
- 既存S3セクションと同じコメントスタイル・セクション区切りの踏襲
- Docker Compose設定のデフォルト認証情報との整合

**Implementation Notes**
- Integration: 既存S3セクションの直後に「PostgreSQLデータベース設定」セクションを追加
- Risks: `.env.local`を既に作成済みの開発者は手動で環境変数を追加する必要がある

#### PrismaMigrationScripts

| Field | Detail |
|-------|--------|
| Intent | `package.json`にPrismaマイグレーション操作用npmスクリプトを定義する |
| Requirements | 6.2, 6.3, 6.4, 6.5, 6.7 |

**Responsibilities & Constraints**
- `db:migrate:dev`: 開発環境でのマイグレーション生成・適用（`prisma migrate dev`）
- `db:migrate:deploy`: 本番環境でのマイグレーション適用（`prisma migrate deploy`）
- `db:generate`: Prismaクライアント型定義の再生成（`prisma generate`）
- `db:studio`: Prisma Studio起動（`prisma studio`）

**Implementation Notes**
- Integration: 既存`scripts`セクションの`format:check`の後に`db:`プレフィックスで追加
- Risks: Prisma CLIは`devDependencies`にインストールされるため、`npx`経由での実行が不要

### Data / ORM

#### PrismaSchema

| Field | Detail |
|-------|--------|
| Intent | Prismaスキーマファイルを配置しPostgreSQL datasourceを設定する |
| Requirements | 3.2, 6.1, 6.6 |

**Responsibilities & Constraints**
- `prisma/schema.prisma`にdatasource（PostgreSQL）とgeneratorを定義
- `DATABASE_URL`環境変数からの接続情報取得
- マイグレーションファイルの`prisma/migrations/`への出力
- 初期状態ではモデル定義なし（空スキーマ）

**Implementation Notes**
- Integration: プロジェクトルートに`prisma/`ディレクトリを新規作成
- Validation: `prisma validate`でスキーマの構文チェックが可能
- Risks: モデル未定義の状態では`prisma generate`実行時にクライアントは生成されるがモデル型は空となる

#### PrismaClientModule

| Field | Detail |
|-------|--------|
| Intent | シングルトンパターンでPrismaClientを管理し、型安全なDB接続を提供する |
| Requirements | 3.1, 3.3, 3.4, 3.5, 3.6 |

**Responsibilities & Constraints**
- `globalThis`を使用したシングルトンインスタンス管理
- 開発時のホットリロードによる接続プール枯渇の防止
- 接続エラー時の日本語エラーメッセージ出力
- 既存`s3-client.ts`と同じインフラストラクチャ層への配置

**Dependencies**
- External: `@prisma/client` — Prisma ORM クライアントライブラリ (P0)
- External: `prisma` — Prisma CLI（開発時マイグレーション・型生成） (P0)
- Outbound: PrismaSchema — スキーマ定義の参照 (P0)
- Outbound: EnvValidationExtension — DATABASE_URL環境変数の検証 (P1)

**Contracts**: Service [x]

##### Service Interface

```typescript
/** Prismaクライアントのグローバル型拡張 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * シングルトンPrismaClientインスタンス
 *
 * 開発環境ではglobalThisにキャッシュし、
 * ホットリロード時の接続プール枯渇を防止する。
 */
const prisma: PrismaClient;

export { prisma };
```

- Preconditions: `DATABASE_URL`環境変数が設定されていること（未設定時はPrismaClientがデフォルトURLで初期化を試みエラーとなる）
- Postconditions: 単一のPrismaClientインスタンスが生成され、PostgreSQLへの接続プールが確立される
- Invariants: アプリケーションライフサイクル全体で同一インスタンスが再利用される（開発環境）

**Implementation Notes**
- Integration: `src/infrastructure/prisma-client.ts`に配置。他モジュールから`import { prisma } from "@/infrastructure/prisma-client"`でアクセス
- Validation: PrismaClientのログレベルを開発環境で`["query", "error", "warn"]`、本番環境で`["error"]`に設定
- Risks: PrismaClient初期化時にPostgreSQLが未起動の場合、接続エラーが発生する。エラーメッセージに接続先情報と対処方法を含める

### Library

#### EnvValidationExtension

| Field | Detail |
|-------|--------|
| Intent | 既存の配列ベースバリデーションにPostgreSQL関連環境変数を追加する |
| Requirements | 4.1, 4.2, 4.3, 4.4 |

**Responsibilities & Constraints**
- 既存`REQUIRED_ENV_VARS`配列にPostgreSQL環境変数（`DATABASE_URL`）を追加
- 未設定時の日本語警告メッセージ出力（既存S3警告と同じ方式）
- アプリケーション起動をブロックしない
- 既存の`process.env`直接参照方式を踏襲（Zodスキーマは使用しない）

**Dependencies**
- Inbound: PrismaClientModule — バリデーション結果の参照 (P1)

**Contracts**: Service [x]

##### Service Interface

```typescript
/**
 * PostgreSQL環境変数を既存のREQUIRED_ENV_VARS配列に追加
 * 既存のvalidateEnv()が自動的にチェック対象に含める
 */
const REQUIRED_ENV_VARS: { name: string; description: string }[];
// 追加エントリ:
// { name: "DATABASE_URL", description: "PostgreSQLデータベース接続文字列" }
```

- Preconditions: なし（環境変数が未設定でも正常に動作する）
- Postconditions: 未設定変数がある場合は既存の警告フローで警告メッセージが出力される
- Invariants: バリデーション処理はprocess.exitを呼び出さない

**Implementation Notes**
- Integration: `src/lib/env-validation.ts`の`REQUIRED_ENV_VARS`配列にPostgreSQL変数を追加するのみ。既存の`validateEnv()`ロジックを変更しない
- 方針: 既存S3バリデーションと完全に同じ方式に統一。Zodスキーマは使用せず、将来のリファクタリング時に全体をまとめて移行する
- Risks: 最小限の変更のため、既存バリデーションへの影響リスクは低い

## Data Models

### Domain Model

本フェーズでは具体的なドメインモデル（テーブル定義）は作成しない。Prismaスキーマは空の初期状態（datasource + generatorのみ）で配置される。

### Logical Data Model

**Prismaスキーマ初期構成**:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- generator: `prisma-client-js`プロバイダーで`node_modules/@prisma/client`に出力（Prisma 6.19.x標準）
- datasource: PostgreSQLプロバイダー、`DATABASE_URL`環境変数から接続文字列を取得

### Physical Data Model

PostgreSQLコンテナの初期設定。

| 設定項目 | 値 | 説明 |
|---------|-----|------|
| PostgreSQLバージョン | 17 | Docker公式イメージ `postgres:17` |
| デフォルトDB | `helpnavi` | `POSTGRES_DB`環境変数で自動作成 |
| デフォルトユーザー | `helpnavi` | `POSTGRES_USER`環境変数 |
| デフォルトパスワード | `helpnavi` | `POSTGRES_PASSWORD`環境変数 |
| ホストポート | 5432 | PostgreSQL標準ポート |
| データボリューム | `postgres-data` | Dockerボリュームによる永続化 |

**DATABASE_URL構成**:
```
postgresql://helpnavi:helpnavi@localhost:5432/helpnavi
```

## Error Handling

### Error Strategy

PostgreSQL接続に関するエラーは、既存プロジェクトの警告ベースアプローチに従い、アプリケーション起動をブロックしない。

### Error Categories and Responses

**環境変数未設定** (警告):
- PostgreSQL環境変数が未設定の場合、コンソール警告を出力
- アプリケーションはDB機能なしで起動を継続
- 既存S3バリデーションと同じ警告パターンを踏襲

**データベース接続失敗** (ランタイムエラー):
- PrismaClientが接続確立に失敗した場合、日本語エラーメッセージを出力
- エラーメッセージに接続先情報（ホスト、ポート）と対処方法（Docker Compose起動確認、環境変数確認）を含める
- 個別のDB操作実行時にエラーが伝播し、呼び出し元で適切にハンドリングされる

### Monitoring

- PrismaClientのログレベル設定により、開発環境ではクエリログを有効化
- 接続エラーは`console.error`で即時出力

## Testing Strategy

### Unit Tests
- `validateEnv()`: PostgreSQL環境変数追加後の全設定/一部未設定/全未設定の各パターンでの警告出力
- Prismaクライアントモジュール: シングルトンインスタンスの一意性検証

### Integration Tests
- Docker Compose起動後のPostgreSQL接続テスト（`prisma db execute`）
- Prismaクライアント経由でのクエリ実行テスト（SELECT 1）
- マイグレーションスクリプトの実行テスト（`pnpm db:migrate:dev`）

### E2E Tests (対象外)
- 本フェーズではUI変更がないため、E2Eテストは不要

## Security Considerations

- Docker Compose内のPostgreSQL認証情報は開発環境専用のデフォルト値を使用。本番環境では別途セキュアな認証情報管理が必要
- `DATABASE_URL`はサーバー側環境変数として管理し、`NEXT_PUBLIC_`プレフィックスを付与しない（クライアントに公開しない）
- `.env.local`は`.gitignore`に含まれ、認証情報がリポジトリにコミットされない
