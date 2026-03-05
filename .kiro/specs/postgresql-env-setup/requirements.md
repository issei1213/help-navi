# Requirements Document

## Project Description (Input)
PostgreSQLの環境構築

## Introduction

本ドキュメントは、help-naviプロジェクトにおけるPostgreSQLデータベースの開発環境構築に関する要件を定義する。
既存のDocker Compose構成（MinIO）にPostgreSQLサービスを追加し、アプリケーションからの接続基盤を整備することで、
今後のデータ永続化機能の土台を構築する。

## Requirements

### Requirement 1: Docker ComposeによるPostgreSQLサービス追加

**Objective:** 開発者として、Docker Composeコマンド一つでPostgreSQLが起動する環境が欲しい。既存のMinIOサービスと同様に自動的にセットアップされることで、手動のDB構築作業を不要にしたい。

#### Acceptance Criteria

1. The Docker Compose設定 shall 既存のMinIOサービスと並行してPostgreSQLサービスを定義する
2. When `docker compose up` コマンドが実行された場合, the PostgreSQLサービス shall 自動的に起動し、接続可能な状態になる
3. The PostgreSQLサービス shall データ永続化用のDockerボリュームを使用し、コンテナ再起動後もデータを保持する
4. The PostgreSQLサービス shall ヘルスチェックを定義し、サービスの準備状態を検知可能にする
5. When PostgreSQLサービスが起動完了した場合, the 初期化処理 shall デフォルトのデータベースを自動作成する

### Requirement 2: 環境変数によるPostgreSQL接続設定

**Objective:** 開発者として、環境変数でPostgreSQLの接続情報を管理したい。既存のS3設定と同じパターンで、環境ごとに接続先を切り替えられるようにしたい。

#### Acceptance Criteria

1. The `.env.example` shall PostgreSQL接続に必要な環境変数（`DATABASE_URL`接続文字列、および個別のホスト、ポート、ユーザー名、パスワード、データベース名）のテンプレートを提供する
2. The PostgreSQL環境変数 shall 既存のS3環境変数と同じセクション構成・コメントスタイルに従う
3. The Docker Compose設定 shall `.env.example`に定義されたデフォルト値と整合するPostgreSQL認証情報を使用する
4. The 環境変数設定 shall 開発環境のデフォルト値をテンプレートに含め、コピーするだけで動作する状態を提供する

### Requirement 3: Prisma ORMによるデータベース接続基盤

**Objective:** 開発者として、Prisma ORMを使用してPostgreSQLに型安全に接続するための基盤モジュールが欲しい。既存のインフラストラクチャ層のパターンに従い、再利用可能なPrismaクライアントを提供したい。

#### Acceptance Criteria

1. The プロジェクト shall Prisma ORM（`prisma`および`@prisma/client`）を依存関係として導入する
2. The Prismaスキーマファイル shall `prisma/schema.prisma` に配置され、PostgreSQLをdatasourceプロバイダーとして設定する
3. The Prismaクライアントモジュール shall `src/infrastructure/` 配下に配置され、既存のS3クライアントと同じ構成パターンに従う
4. The Prismaクライアント shall 環境変数`DATABASE_URL`から接続情報を取得し、PostgreSQLへの接続を確立する
5. The Prismaクライアント shall シングルトンパターンを採用し、開発時のホットリロードによる接続プールの枯渇を防止する
6. If データベース接続に失敗した場合, then the Prismaクライアント shall エラーの詳細を含む明確なエラーメッセージを出力する

### Requirement 4: 環境変数バリデーション

**Objective:** 開発者として、PostgreSQL関連の環境変数が未設定の場合に早期に気付きたい。既存の環境変数バリデーションパターンと一貫した方法で検証が行われることを期待する。

#### Acceptance Criteria

1. The 環境変数バリデーション shall PostgreSQL関連の環境変数（ホスト、ポート、ユーザー名、パスワード、データベース名）を検証対象に含める
2. If PostgreSQL関連の環境変数が未設定の場合, then the バリデーション処理 shall コンソールに警告メッセージを出力する（既存のS3バリデーションと同じ警告方式）
3. The バリデーション処理 shall 環境変数の未設定によりアプリケーションの起動をブロックしない
4. The バリデーション定義 shall Zodスキーマを使用して環境変数の型と必須チェックを行う

### Requirement 5: 開発ワークフローとの統合

**Objective:** 開発者として、既存の`pnpm dev`コマンドでPostgreSQLも含めた全サービスが起動してほしい。追加の手動操作なしで開発を開始できる環境を維持したい。

#### Acceptance Criteria

1. When `pnpm dev` コマンドが実行された場合, the 開発環境 shall PostgreSQLを含む全Docker Composeサービスを自動起動する
2. When 開発サーバーが終了した場合, the Docker Compose shall PostgreSQLを含む全サービスを自動停止する
3. The PostgreSQLサービス shall 他のサービス（MinIO、Next.js）と競合しないポートで公開される
4. While Docker Composeが起動中の場合, the PostgreSQLサービス shall MinIOサービスの起動・停止に影響を与えず独立して動作する

### Requirement 6: Prismaマイグレーションの運用

**Objective:** 開発者として、データベーススキーマの変更をマイグレーションファイルとして管理したい。チーム開発においてスキーマ変更の履歴を追跡可能にし、再現可能なデータベース構築を実現したい。

#### Acceptance Criteria

1. The マイグレーションファイル shall `prisma/migrations/` ディレクトリ配下にタイムスタンプ付きで生成・管理される
2. The `package.json` shall マイグレーション操作用のnpmスクリプト（`db:migrate:dev`、`db:migrate:deploy`、`db:generate`、`db:studio`）を定義する
3. When `pnpm db:migrate:dev` コマンドが実行された場合, the Prisma CLI shall スキーマ変更を検出し、新しいマイグレーションファイルを生成・適用する
4. When `pnpm db:migrate:deploy` コマンドが実行された場合, the Prisma CLI shall 未適用のマイグレーションを本番環境に適用する
5. When `pnpm db:generate` コマンドが実行された場合, the Prisma CLI shall 最新のスキーマからPrismaクライアントの型定義を再生成する
6. The マイグレーションファイル shall Gitリポジトリにコミットされ、バージョン管理の対象とする
7. When `pnpm db:studio` コマンドが実行された場合, the Prisma Studio shall ブラウザ上でデータベースのGUI管理画面を提供する
