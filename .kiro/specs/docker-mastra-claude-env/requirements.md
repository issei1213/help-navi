# Requirements Document

## Project Description (Input)
mastraとClaudeAPIを使った環境構築。ファイル管理はS3で行い、開発環境用にDockerのMinIOでS3互換ストレージを構築する。フロントエンドはNext.jsを使用し、Next.jsのバックエンド側（API Routes/Server Actions）でMastra Agentを呼び出す構成とする。Next.jsはローカルで起動し、MinIOはDockerで起動する。パッケージマネージャーはpnpmを使用する。

## Introduction
本ドキュメントは、Next.jsアプリケーション内でMastraフレームワークとClaude APIを活用したAIエージェントを構築するための要件を定義する。Next.jsのサーバーサイド（API Routes/Server Actions）からMastra Agentを直接呼び出す一体型アーキテクチャを採用する。ファイル管理にはS3互換APIを使用し、開発環境ではDocker上のMinIOをローカルS3互換ストレージとして利用する。

## Requirements

### Requirement 1: Next.jsプロジェクトのローカル開発環境
**Objective:** 開発者として、Next.jsベースのフルスタックアプリケーションをローカル環境で起動・開発したい。これにより、フロントエンドとバックエンド（Mastra Agent含む）を単一プロジェクトで管理でき、開発体験がシンプルになる。

#### Acceptance Criteria
1. The プロジェクト shall Next.jsプロジェクトの基本構成(App Router)を提供する
2. The プロジェクト shall TypeScriptベースのNext.jsプロジェクト設定を含める
3. When `pnpm dev`コマンドが実行された時, the プロジェクト shall ローカルの開発サーバーを起動し、フロントエンドとバックエンド(API Routes)の両方を提供する
4. The プロジェクト shall pnpmをパッケージマネージャーとして使用し、package.jsonにpackageManagerフィールドを定義する
5. The プロジェクト shall tsconfig.jsonにTypeScriptコンパイラの適切な設定を含める

### Requirement 2: Mastraフレームワークの統合構成
**Objective:** 開発者として、Next.jsのサーバーサイドからMastra Agentを呼び出せる環境を構築したい。これにより、別途バックエンドサーバーを立てることなく、Next.jsプロジェクト内でAIエージェント機能を実装できる。

#### Acceptance Criteria
1. The プロジェクト shall package.jsonにMastraフレームワークの依存関係を定義する
2. The プロジェクト shall Mastraのエージェント定義ファイルの基本テンプレートを提供する
3. The プロジェクト shall Next.jsのAPI Routes（Route Handlers）からMastra Agentを呼び出すサンプルコードを提供する
4. The プロジェクト shall Next.jsのServer ActionsからMastra Agentを呼び出すサンプルコードを提供する
5. The プロジェクト shall Mastraのインスタンス初期化をサーバーサイド専用モジュールとして分離する
6. The プロジェクト shall フロントエンドからバックエンドAPI経由でエージェントを呼び出すサンプルUIを提供する

### Requirement 3: Claude API連携の設定
**Objective:** 開発者として、Claude APIをMastraエージェントから利用できる環境を構築したい。これにより、Anthropic社のClaude言語モデルを活用したAIエージェントの開発とテストが可能になる。

#### Acceptance Criteria
1. The 開発環境 shall Claude APIキーを環境変数として安全に管理する仕組みを提供する
2. The 開発環境 shall `.env.local`ファイルによる環境変数の設定をサポートする（Next.jsの規約に従う）
3. The Mastra設定 shall MastraのモデルプロバイダーとしてAnthropic(Claude)を設定する
4. If Claude APIキーが未設定の場合, the 開発環境 shall 起動時にAPIキーが必要である旨の警告メッセージを表示する
5. The 開発環境 shall `.env.local`ファイルをGit管理から除外するための`.gitignore`設定を含める
6. The Mastra設定 shall Claude APIを使用するサンプルエージェント定義を提供する

### Requirement 4: S3ファイル管理（MinIO Docker開発環境）
**Objective:** 開発者として、MastraエージェントからS3互換ストレージのファイルにアクセスできる環境を構築したい。開発環境ではDockerのMinIOを使用し、外部クラウドサービスに依存せずにS3互換のファイル操作を開発・テストできる。

#### Acceptance Criteria
1. The 開発環境 shall docker-compose.ymlでMinIOコンテナを定義し、S3互換ストレージをローカルに提供する
2. When `docker compose up`コマンドが実行された時, the Docker環境 shall MinIOサービスを起動し、S3互換エンドポイントを公開する
3. The Docker環境 shall MinIOのWebコンソール（管理画面）をホストマシンからアクセス可能にする
4. The 開発環境 shall S3接続情報（エンドポイントURL、アクセスキー、シークレットキー、バケット名）を環境変数として管理する仕組みを提供する
5. The Mastra設定 shall AWS SDK（`@aws-sdk/client-s3`）を使用したS3ファイル操作用のMastraツール定義を含める
6. The Mastra設定 shall S3の基本操作（ファイル一覧取得、ファイル読み取り、ファイルアップロードなど）をサンプルとして提供する
7. If S3接続情報が未設定の場合, the 開発環境 shall 起動時に接続情報が必要である旨の警告メッセージを表示する
8. The Docker環境 shall MinIO起動時にデフォルトバケットを自動作成する

### Requirement 5: 環境変数と設定管理
**Objective:** 開発者として、APIキーやS3接続情報を安全かつ容易に管理したい。これにより、秘密情報の漏洩リスクを最小化しつつ、設定の変更を簡単に行える。

#### Acceptance Criteria
1. The 開発環境 shall `.env.example`ファイルを提供し、必要な環境変数の一覧とその説明を記載する
2. The 開発環境 shall Next.jsの環境変数規約に従い、サーバー専用変数とクライアント公開変数(`NEXT_PUBLIC_`プレフィックス)を区別する
3. The 開発環境 shall 各環境変数に対してデフォルト値または説明コメントを提供する
4. The 開発環境 shall 秘密情報を含むファイル(`.env.local`など)を`.gitignore`で除外する

### Requirement 6: 開発者体験(DX)の最適化
**Objective:** 開発者として、Next.js（ローカル）+ MinIO（Docker）構成での開発がスムーズに行えるようにしたい。これにより、開発効率が向上し、環境構築にかかる時間を最小限に抑えられる。

#### Acceptance Criteria
1. The 開発環境 shall READMEに環境構築手順（Docker起動、Next.js起動）・トラブルシューティングを記載する
2. When `pnpm dev`コマンドが実行された時, the 開発環境 shall フロントエンドとMastraバックエンドが同時に起動する
3. The 開発環境 shall ソースコードの変更を検知してホットリロードする（Next.jsのFast Refresh）
4. The 開発環境 shall ESLintおよびPrettierの設定を含め、コード品質を維持する
5. The 開発環境 shall `pnpm install`でプロジェクトの全依存関係をインストールできるようにする
6. When `docker compose down`コマンドが実行された時, the Docker環境 shall MinIOサービスを適切に停止する
7. The Docker環境 shall MinIOのデータをDockerボリュームで永続化し、コンテナ再起動時にデータが保持されるようにする
