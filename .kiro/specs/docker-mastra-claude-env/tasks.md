# Implementation Plan

- [x] 1. Next.js + TypeScript + pnpmプロジェクトの基盤構築
  - `create-next-app@latest`でApp Router + TypeScript + ESLint + Tailwind CSSのプロジェクトを生成する
  - `package.json`に`packageManager`フィールドを定義し、pnpmをプロジェクト標準パッケージマネージャーとして設定する
  - `tsconfig.json`のTypeScriptコンパイラ設定がstrictモードで適切に構成されていることを確認する
  - `pnpm dev`でフロントエンドとバックエンド（API Routes）を含むローカル開発サーバーが起動することを確認する
  - ホットリロード（Next.jsのFast Refresh）がソースコード変更検知で動作することを確認する
  - `pnpm install`で全依存関係がインストール可能であることを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.2, 6.3, 6.5_

- [x] 2. Docker ComposeによるMinIO S3互換ストレージ環境の構築
- [x] 2.1 (P) MinIOサービスのDocker Compose定義
  - `docker-compose.yml`にMinIOサービスを定義し、S3 APIエンドポイント（ポート9000）とWebコンソール（ポート9001）をホストに公開する
  - MinIOのデータ永続化のためDockerボリューム（`minio-data`）を設定する
  - `docker compose up`でMinIOサービスが正常に起動することを確認する
  - `docker compose down`でMinIOサービスが適切に停止することを確認する
  - WebコンソールにブラウザからHTTP経由でアクセスできることを確認する
  - _Requirements: 4.1, 4.2, 4.3, 6.6, 6.7_

- [x] 2.2 (P) デフォルトバケット自動作成の設定
  - MinIO Client（`minio/mc`）を使用するinitコンテナを`docker-compose.yml`に追加する
  - MinIOサービスの起動後にデフォルトバケットを自動作成するentrypointスクリプトを設定する
  - `docker compose up`実行時にデフォルトバケットが自動的に作成されることを確認する
  - _Requirements: 4.8_

- [x] 3. 環境変数管理とセキュリティ設定
- [x] 3.1 (P) 環境変数テンプレートとGitセキュリティ設定
  - `.env.example`ファイルを作成し、全環境変数（Claude APIキー、S3接続情報）の一覧・説明・デフォルト値を記載する
  - サーバー専用変数（`ANTHROPIC_API_KEY`、`S3_*`系）とクライアント公開変数（`NEXT_PUBLIC_`プレフィックス）を区別して設計する
  - MinIO開発環境用のデフォルト値（エンドポイント、アクセスキー、バケット名）を`.env.example`に設定する
  - `.gitignore`に`.env.local`および`.env*.local`パターンを追加し、秘密情報をGit管理から除外する
  - `.env.local`ファイルによる環境変数の設定がNext.jsの規約に従って動作することを確認する
  - _Requirements: 3.1, 3.2, 3.5, 4.4, 5.1, 5.2, 5.3, 5.4_

- [x] 3.2 (P) 環境変数バリデーションと警告機能
  - サーバー起動時に必須環境変数（Claude APIキー、S3接続情報）の存在を検証するバリデーション機能を実装する
  - Claude APIキーが未設定の場合、起動時にAPIキーが必要である旨の警告メッセージをコンソールに出力する
  - S3接続情報が未設定の場合、起動時に接続情報が必要である旨の警告メッセージをコンソールに出力する
  - バリデーション結果はアプリケーション起動をブロックせず、警告のみとする（S3機能のみ無効化）
  - _Requirements: 3.4, 4.7_
  - _Contracts: EnvValidationService_

- [x] 4. Mastraフレームワークの初期化とサーバーサイド統合
  - `@mastra/core`、`@mastra/ai-sdk`、`@ai-sdk/react`、`ai`パッケージをプロジェクトの依存関係に追加する
  - Mastraインスタンスをサーバーサイド専用モジュールとして初期化し、クライアントバンドルへの混入を防止する
  - `next.config.ts`に`serverExternalPackages: ["@mastra/*"]`を設定し、Mastraパッケージをサーバーサイドexternalとして扱う
  - Mastra初期化時に環境変数バリデーション機能を呼び出し、不足変数があれば警告を出力する
  - タスク1のNext.jsプロジェクトが完了していること
  - _Requirements: 2.1, 2.5, 6.2_
  - _Contracts: MastraConfigModule_

- [x] 5. Claude API連携のサンプルエージェント定義
  - AnthropicモデルプロバイダーとしてClaude（`anthropic/claude-sonnet-4-20250514`）を設定したサンプルエージェントを定義する
  - エージェントのシステムプロンプト（instructions）を設定し、基本的な対話能力を持たせる
  - `ANTHROPIC_API_KEY`環境変数によるClaude API認証が正しく機能することを確認する
  - Mastraインスタンスにエージェントを登録し、IDで取得できるようにする
  - タスク4のMastra初期化が完了していること
  - _Requirements: 2.2, 3.3, 3.6_
  - _Contracts: AgentConfig_

- [x] 6. S3ファイル操作ツールの定義
  - AWS SDK（`@aws-sdk/client-s3`）を依存関係に追加し、S3クライアントをMinIOエンドポイント向けに初期化する（`forcePathStyle: true`設定含む）
  - Mastra `createTool()`でファイル一覧取得ツール（`s3-list-objects`）を定義する
  - Mastra `createTool()`でファイル読み取りツール（`s3-get-object`）を定義する
  - Mastra `createTool()`でファイルアップロードツール（`s3-put-object`）を定義する
  - 各ツールのinputSchema/outputSchemaをZodで定義し、型安全なパラメータバリデーションを提供する
  - サンプルエージェントにS3ツール群を注入し、エージェントがS3操作を実行できるようにする
  - タスク4のMastra初期化、タスク5のエージェント定義が完了していること
  - _Requirements: 4.4, 4.5, 4.6_
  - _Contracts: S3Tools, S3ToolService_

- [x] 7. ストリーミングチャットAPIエンドポイントの実装
  - `POST /api/chat`エンドポイントを作成し、メッセージ配列を受け取ってMastra Agentのストリーミング呼び出しを行う
  - `createUIMessageStreamResponse()`を使用してSSE形式のストリーミングレスポンスを返却する
  - リクエストボディのバリデーション（空プロンプトチェック、不正形式の検出）を実装し、不正な場合は400エラーを返す
  - 内部エラー発生時に適切なエラーレスポンス（500）を返却する
  - タスク5のエージェント定義が完了していること
  - _Requirements: 2.3_
  - _Contracts: ChatAPI_

- [x] 8. Server Actionによるエージェント呼び出しの実装
  - `"use server"`ディレクティブ付きの非同期関数としてエージェントの非ストリーミング呼び出しを実装する
  - `agent.generate()`で完全なレスポンスを取得し、型安全な結果オブジェクトとして返却する
  - 入力プロンプトの空文字チェックとエラーハンドリングを実装する
  - タスク5のエージェント定義が完了していること。タスク7と並列実行可能（異なるAPIレイヤーのため）
  - _Requirements: 2.4_
  - _Contracts: AgentActionService_

- [x] 9. チャットUIサンプルの実装
  - `useChat()`フックを使用してストリーミングチャットインターフェースを構築する
  - メッセージの送受信表示（ユーザーとエージェントの区別）を実装する
  - 入力フォームとレスポンス表示エリアを含むチャットレイアウトを作成する
  - `/api/chat`エンドポイントへの接続を設定し、ストリーミングレスポンスがリアルタイムに表示されることを確認する
  - Server Action経由のエージェント呼び出しもUIから利用可能にする
  - タスク7のAPIエンドポイント、タスク8のServer Actionが完了していること
  - _Requirements: 2.6_

- [x] 10. コード品質ツールの設定
  - Prettier 3.xを依存関係に追加し、`.prettierrc`設定ファイルを作成する
  - `eslint-config-prettier`をインストールし、ESLintとPrettierの競合を回避する設定を行う
  - ESLintの設定がNext.jsの推奨ルールに準拠していることを確認する
  - _Requirements: 6.4_

- [x] 11. READMEドキュメントの作成
  - 前提条件（Node.js、pnpm、Docker）を記載する
  - インストール手順（`pnpm install`）を記載する
  - MinIO起動手順（`docker compose up -d`）とWebコンソールアクセス情報を記載する
  - 環境変数設定手順（`.env.example`から`.env.local`へのコピーと編集）を記載する
  - Next.js起動方法（`pnpm dev`）を記載する
  - トラブルシューティング（Docker未起動時、APIキー未設定時の対処法）を記載する
  - _Requirements: 6.1_

- [x] 12. 統合動作確認
  - Docker ComposeでMinIOを起動し、デフォルトバケットが自動作成されていることをWebコンソールで確認する
  - `.env.local`に環境変数を設定し、`pnpm dev`でNext.jsアプリケーションが正常に起動することを確認する
  - チャットUIからメッセージを送信し、Claude APIを通じたエージェントのストリーミング応答が表示されることを確認する
  - S3ファイル関連の質問をエージェントに送信し、S3ツール呼び出し（ファイル一覧取得、アップロード、読み取り）が正常に動作することを確認する
  - Server Action経由のエージェント呼び出しが正常に動作することを確認する
  - 環境変数未設定状態で起動した際に、適切な警告メッセージが表示されることを確認する
  - _Requirements: 1.3, 2.3, 2.4, 2.6, 3.4, 4.2, 4.5, 4.6, 4.7, 4.8, 6.2_
