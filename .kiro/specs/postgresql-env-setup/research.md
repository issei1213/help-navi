# Research & Design Decisions

---
**Purpose**: PostgreSQL環境構築に関するディスカバリーフェーズの調査結果と設計判断を記録する。
**Usage**: design.mdで参照される背景情報と詳細な技術調査の記録。
---

## Summary
- **Feature**: `postgresql-env-setup`
- **Discovery Scope**: Extension（既存Docker Compose + インフラストラクチャ構成へのPostgreSQL/Prisma追加）
- **Key Findings**:
  - Prisma 7はESM必須・Driver Adapter必須の破壊的変更を含み、Next.js 16のTurbopackとの互換性問題が報告されている。安定性を優先しPrisma 6系（6.19.x）を採用する
  - 既存の`env-validation.ts`はZodを使用しておらず配列ベースの独自実装だが、要件4.4でZodスキーマの使用が求められている。既存パターンにZodバリデーションを追加する形で拡張する
  - PostgreSQL Docker Composeでは`pg_isready`によるヘルスチェックと`start_period`設定がベストプラクティスとして確立されている

## Research Log

### Prismaバージョン選定（v6 vs v7）
- **Context**: 要件3でPrisma ORMの導入が求められている。Prisma 7が2026年初頭にリリースされたが、プロジェクトとの互換性を検証する必要がある
- **Sources Consulted**:
  - [Prisma 7 Release Announcement](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
  - [Prisma v7 Migration on Next.js 16 - Turbopack Fix Guide](https://www.buildwithmatija.com/blog/migrate-prisma-v7-nextjs-16-turbopack-fix)
  - [Prisma Upgrade Guide v7](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions)
  - [Prisma 6.19.0 Release](https://www.prisma.io/blog/announcing-prisma-6-19-0)
- **Findings**:
  - Prisma 7はESM必須（`"type": "module"`がpackage.jsonに必要）だが、現プロジェクトはCJS前提で構成されている
  - Prisma 7はDriver Adapter必須（`@prisma/adapter-pg` + `pg`パッケージが追加で必要）
  - Next.js 16のTurbopackとPrisma 7の`prisma-client`プロバイダーにパス解決の互換性問題が報告されている
  - Prisma 6.19.xは従来の`prisma-client-js`プロバイダーでPostgreSQLに直接接続可能であり、安定して動作する
  - Prisma 6系でも`DATABASE_URL`環境変数による接続文字列設定が標準パターン
- **Implications**: Prisma 6.19.x採用により、ESM移行やDriver Adapter導入の複雑さを回避し、既存プロジェクト構成との整合性を維持する。Prisma 7への移行は将来のESM対応時に別タスクとして実施する

### Prisma Clientシングルトンパターン
- **Context**: 要件3.5でシングルトンパターンによるホットリロード時の接続プール枯渇防止が求められている
- **Sources Consulted**:
  - [Prisma Next.js Troubleshooting Guide](https://www.prisma.io/docs/orm/more/troubleshooting/nextjs)
  - [Optimizing Connection Pools with PrismaClient Singleton Pattern](https://dev.to/_877737de2d34ff8c6265/optimizing-connection-pools-with-prismaclient-singleton-pattern-in-nextjs-3emf)
  - [Database connections - Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)
- **Findings**:
  - `globalThis`を使用してPrismaClientインスタンスをグローバルに保持するパターンが公式推奨
  - 開発環境（`NODE_ENV !== "production"`）でのみグローバルキャッシュを使用し、本番環境では通常のインスタンス化を行う
  - ロギング設定は開発環境でのみ`query`レベルを有効にすることで、デバッグ効率とパフォーマンスのバランスを取る
- **Implications**: 既存の`s3-client.ts`は関数呼び出しごとにクライアントを生成するパターンだが、Prismaではシングルトンが必須。`src/infrastructure/prisma-client.ts`で公式推奨パターンを採用する

### PostgreSQL Docker Composeヘルスチェック
- **Context**: 要件1.4でヘルスチェック定義が求められている
- **Sources Consulted**:
  - [Docker Compose Health Checks Guide](https://last9.io/blog/docker-compose-health-checks/)
  - [Docker Compose Service Dependencies with Healthchecks](https://eastondev.com/blog/en/posts/dev/20251217-docker-compose-healthcheck/)
  - [PostgreSQL Docker healthcheck discussion](https://www.postgresql.org/message-id/CAFOeHx1wpqRLcs8jSDar-Em3F3ogSetV8sJPZnDMEehc_3XWuQ@mail.gmail.com)
- **Findings**:
  - `pg_isready -U <user>`が標準的なヘルスチェックコマンド
  - `start_period`を設定することで初期化中のヘルスチェック失敗をカウントしない
  - `interval: 5s`, `timeout: 5s`, `retries: 5`, `start_period: 10s`が推奨設定
  - `depends_on`で`condition: service_healthy`を使用することで、依存サービスの起動順序を制御可能
- **Implications**: MinIOの既存ヘルスチェックパターンと整合する設定で、PostgreSQLのヘルスチェックを追加する

### 環境変数バリデーションの拡張方針
- **Context**: 要件4でZodスキーマによる環境変数バリデーションが求められているが、既存の`env-validation.ts`はZodを使用していない
- **Sources Consulted**: 既存コードベース分析（`src/lib/env-validation.ts`）
- **Findings**:
  - 既存実装は`REQUIRED_ENV_VARS`配列による独自チェック方式
  - Zodは`zod@^4.3.6`として既にプロジェクト依存関係に含まれている
  - 既存の警告方式（起動ブロックなし）は要件4.3と一致
  - 既存のS3バリデーションロジックを壊さずにPostgreSQL変数を追加する必要がある
- **Implications**: 既存の`REQUIRED_ENV_VARS`配列にPostgreSQL変数を追加しつつ、Zodスキーマによるバリデーション関数を新規追加する。既存コードとの後方互換性を維持する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン踏襲 | S3クライアントと同じインフラストラクチャ層配置 | 一貫性、学習コスト低 | Prismaの特性（シングルトン、マイグレーション）に対応が必要 | 採用 |
| 独立モジュール化 | `src/database/`として独立ディレクトリ | 明確な分離 | steering構造に反する | 不採用 |

## Design Decisions

### Decision: Prisma 6.19.x の採用（v7ではなく）
- **Context**: Prisma 7はESM必須・Driver Adapter必須の破壊的変更を含む
- **Alternatives Considered**:
  1. Prisma 7 + `prisma-client`プロバイダー — 最新だがESM移行とTurbopack互換性問題あり
  2. Prisma 7 + `prisma-client-js`プロバイダー — ワークアラウンドだが公式非推奨の方向
  3. Prisma 6.19.x — 安定した従来パターンで既存構成と完全互換
- **Selected Approach**: Prisma 6.19.x を採用
- **Rationale**: 現プロジェクトはCJS前提（`"type": "module"`未設定）であり、ESM移行はPostgreSQL環境構築とは独立した大規模変更となる。Prisma 6.19.xは`prisma-client-js`プロバイダーで安定動作し、`node_modules/@prisma/client`からの標準インポートが可能
- **Trade-offs**: 最新機能（Rust-free client、Driver Adapter最適化）は利用不可だが、基本的なORM機能は完全にカバーされる
- **Follow-up**: プロジェクト全体のESM移行時にPrisma 7への段階的アップグレードを検討

### Decision: 環境変数バリデーションのZod拡張
- **Context**: 要件4.4でZodスキーマによるバリデーションが求められているが、既存実装はZodを使用していない
- **Alternatives Considered**:
  1. 既存実装を完全にZodベースにリファクタリング — 理想的だがスコープ超過
  2. PostgreSQL変数のみZodスキーマで検証し、既存ロジックと共存 — 段階的移行が可能
- **Selected Approach**: PostgreSQL変数用のZodスキーマを新規定義し、既存の`REQUIRED_ENV_VARS`配列にもPostgreSQL変数を追加する二重構成
- **Rationale**: 既存のS3バリデーションとの後方互換性を維持しつつ、要件のZodスキーマ要件を満たす。将来的に既存変数もZodへ移行する布石となる
- **Trade-offs**: 一時的に二重のバリデーション方式が共存するが、動作に影響はない
- **Follow-up**: 将来タスクとして既存環境変数バリデーション全体のZod移行を検討

### Decision: PostgreSQL公開ポートの選定
- **Context**: 要件5.3で他サービスとポート競合しない設定が必要。MinIOは9000/9001を使用中
- **Selected Approach**: PostgreSQL標準ポート5432をホスト側にそのままマッピング（`5432:5432`）
- **Rationale**: PostgreSQL標準ポートは他の開発サービス（MinIO 9000/9001、Next.js 3000）と競合しない。標準ポートの使用により、外部ツール（pgAdmin、DBeaver、Prisma Studio等）からの接続が直感的になる

## Risks & Mitigations
- **接続プール枯渇リスク** — Prisma公式推奨のシングルトンパターンを`globalThis`で実装し、ホットリロード時の多重インスタンス生成を防止
- **Docker Compose起動順序** — `depends_on`と`condition: service_healthy`でPostgreSQLの準備完了を保証
- **Prisma 6 EOLリスク** — Prisma 7の安定化後に移行計画を策定。6.19.xは長期サポート対象
- **初期マイグレーション未作成** — 環境構築フェーズではスキーマは空の初期状態。モデル定義は別機能で実施

## References
- [Prisma ORM with PostgreSQL Quickstart](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/postgresql) — 公式セットアップガイド
- [Prisma Next.js Troubleshooting](https://www.prisma.io/docs/orm/more/troubleshooting/nextjs) — Next.js統合のベストプラクティス
- [Docker Compose Health Checks](https://last9.io/blog/docker-compose-health-checks/) — ヘルスチェック設定ガイド
- [Prisma Database Connections](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections) — 接続プール管理
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions) — v7破壊的変更の詳細
