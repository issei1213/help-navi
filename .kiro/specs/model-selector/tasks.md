# Implementation Plan

- [ ] 1. データベーススキーマの変更とマイグレーション
  - Conversation テーブルに `modelId`（nullable String）カラムを追加する
  - `prisma migrate dev` でマイグレーションを作成・適用し、Prisma Client を再生成する
  - 既存の会話データは `modelId = null` のまま保持され、アプリケーション側でデフォルトモデルにフォールバックする
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 2. モデル定義の一元管理モジュールを作成する
- [ ] 2.1 (P) モデル定義の定数と型を実装する
  - 利用可能な Anthropic モデル（Opus 4、Sonnet 4、Haiku 3.5）の定義を、モデル ID・Mastra 用モデル ID・表示名・説明を持つ構造で一元管理する
  - デフォルトモデル ID として `claude-sonnet-4-20250514` を定数定義する
  - モデル ID から表示名を取得するヘルパー関数と、モデル ID の有効性を検証するバリデーション関数を実装する
  - フロントエンド・バックエンド双方から `@/lib/models` としてインポート可能な `src/lib/` に配置する
  - _Requirements: 1.1, 1.2, 1.3, 3.2, 4.3, 5.1_
  - _Contracts: models.ts Service Interface_

- [ ] 2.2 (P) モデル定義モジュールのユニットテストを作成する
  - `getModelDisplayName` が有効なモデル ID で正しい表示名を返すこと、null や不正な ID でデフォルト表示名を返すことを検証する
  - `isValidModelId` が有効なモデル ID で `true`、無効な ID で `false` を返すことを検証する
  - `AVAILABLE_MODELS` に期待するモデルが含まれていること、`DEFAULT_MODEL_ID` が有効な ID であることを検証する
  - _Requirements: 1.2, 5.1_

- [ ] 3. エージェントの動的モデル解決を実装する
  - `chat-agent` の `model` プロパティを文字列リテラルから関数形式に変更する
  - 関数内で `requestContext` から `modelId` を取得し、モデル定義モジュールを参照して対応する Mastra 用モデル ID を返す
  - `requestContext` が未定義の場合や、指定されたモデル ID が無効な場合は、デフォルトモデルにフォールバックする
  - タスク 1（スキーマ変更）とタスク 2（モデル定義）の完了が前提
  - _Requirements: 2.2, 4.2, 4.3, 5.1_
  - _Contracts: chat-agent Service Interface_

- [ ] 4. API ルートの変更（RequestContext 構築とモデルバリデーション）
- [ ] 4.1 チャット API に RequestContext 構築とモデルバリデーションを追加する
  - `POST /api/chat` でリクエストボディから `modelId` を取得し、`isValidModelId` でバリデーションする（無効な場合は 400 エラー）
  - `conversationId` がある場合、DB から会話の `modelId` を取得してフォールバック優先順位（`body.modelId` > `conversation.modelId` > `DEFAULT_MODEL_ID`）に従って解決する
  - `RequestContext` インスタンスを構築して `modelId` を設定し、`handleChatStream` の `params` に `requestContext` として渡す
  - 初回メッセージ送信時に会話の `modelId` が未設定の場合は更新する
  - **実装ノート**: `import { RequestContext } from '@mastra/core/di'` でインポートし、`const requestContext = new RequestContext(); requestContext.set('modelId', resolvedModelId);` で構築する。`params` に `{ ...body, requestContext }` としてマージして `handleChatStream` に渡す
  - タスク 1（スキーマ変更）、タスク 2（モデル定義）、タスク 3（エージェント変更）の完了が前提
  - _Requirements: 2.2, 4.1, 4.2, 5.2_
  - _Contracts: POST /api/chat API Contract_

- [ ] 4.2 会話作成 API に modelId 保存を追加する
  - `POST /api/conversations` でリクエストボディから `modelId` を取得し、`isValidModelId` でバリデーションする（無効な場合は 400 エラー）
  - `Conversation.create` に `modelId` を含めて保存する
  - _Requirements: 4.1_
  - _Contracts: POST /api/conversations API Contract_

- [ ] 4.3 会話一覧 API のレスポンスに modelId を含める
  - `GET /api/conversations` の `select` に `modelId: true` を追加し、レスポンスに `modelId` フィールドを含める
  - _Requirements: 3.3_

- [ ] 5. フロントエンドのフック変更
- [ ] 5.1 useChatSession に modelId パラメータを追加する
  - フックのパラメータに `modelId` を追加し、`DefaultChatTransport` の `body` オプションに `modelId` を含める
  - `transport` の `useMemo` 依存配列に `modelId` を追加する
  - タスク 4.1（チャット API 変更）の完了が前提
  - _Requirements: 2.2, 4.2_
  - _Contracts: useChatSession Service Interface_

- [ ] 5.2 useConversations に modelId 管理を追加する
  - 会話一覧取得時のレスポンス型に `modelId` を追加する
  - `createConversation` に `modelId` パラメータを追加し、POST ボディに含める
  - `selectConversation` で取得した会話データから `modelId` を返却する
  - タスク 4.2、4.3（会話 API 変更）の完了が前提
  - _Requirements: 3.3, 4.1_
  - _Contracts: useConversations Service Interface_

- [ ] 6. モデルセレクター UI コンポーネントを作成する
  - モデル定義モジュールの `AVAILABLE_MODELS` からモデル一覧を取得し、ドロップダウン形式のセレクター UI をレンダリングする
  - 各モデルについてモデル名と簡易説明を表示し、選択中のモデルを視覚的にハイライトする
  - `disabled` プロパティで操作可否を制御し、無効時は選択操作を防止しつつ現在のモデル名を表示する
  - Tailwind CSS で既存デザインとの一貫性を保ち、モバイル対応のレスポンシブデザインとする
  - タスク 2（モデル定義）の完了が前提。タスク 7 の統合前に単独で実装可能
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 3.1_
  - _Contracts: ModelSelector State (ModelSelectorProps)_

- [ ] 7. ChatContainer にモデル選択状態の管理を統合する
- [ ] 7.1 ChatContainer にモデル選択の state 管理を追加する
  - `selectedModelId` の state をデフォルトモデル ID で初期化する
  - メッセージの有無に基づいて `ModelSelector` の `disabled` を制御する（メッセージが 1 件以上で無効化）
  - 新規会話作成時に `selectedModelId` をデフォルトモデル ID にリセットする
  - 既存会話選択時に `conversation.modelId ?? DEFAULT_MODEL_ID` で `selectedModelId` を設定する
  - `useChatSession` と `useConversations` に `modelId` を伝達する
  - タスク 5（フック変更）とタスク 6（モデルセレクター UI）の完了が前提
  - _Requirements: 1.3, 2.3, 3.1, 3.3, 5.1, 5.2_
  - _Contracts: ChatContainer State_

- [ ] 7.2 WelcomeScreen にモデルセレクターを配置する
  - ウェルカム画面のガイダンステキスト下部にモデルセレクターを配置する
  - `WelcomeScreenProps` に `selectedModelId`、`onModelSelect`、`disabled` を追加する
  - _Requirements: 1.1_

- [ ] 7.3 ChatHeader に使用中モデル名の表示を追加する
  - `ChatHeaderProps` に `modelId` を追加し、`getModelDisplayName` でモデル名を取得して表示する
  - 既存のレイアウト（タイトル中央配置）を維持しつつ、タイトル近傍にモデル名を表示する
  - _Requirements: 3.2, 3.3_

- [ ] 8. エラーハンドリングの統合
  - チャット API から返却される無効モデル ID の 400 エラーをフロントエンドで受け取り、ユーザーに「指定されたモデルは利用できません。別のモデルを選択してください。」というエラーメッセージを表示する
  - モデル未選択時（`modelId` 未指定）にデフォルトモデルで正常に応答が生成されることを確認する
  - _Requirements: 5.1, 5.2_

- [ ] 9. 結合テストの作成
- [ ] 9.1 (P) API ルートの結合テストを作成する
  - `POST /api/chat` に `modelId` 付きリクエストを送信し、正しいモデルが使用されることを検証する
  - `POST /api/chat` に無効な `modelId` を送信し、400 エラーが返却されることを検証する
  - `POST /api/conversations` に `modelId` 付きで会話を作成し、取得時に `modelId` が含まれることを検証する
  - 会話再開時に保存された `modelId` で応答が継続されることを検証する
  - _Requirements: 2.2, 4.1, 4.2, 5.2_

- [ ] 9.2 (P) E2E テストを作成する
  - 新規会話でモデルを選択し、メッセージ送信後にモデルセレクターが無効化されることを検証する
  - 既存会話をサイドバーから選択した際に、保存されたモデル名が ChatHeader に表示されることを検証する
  - モデル未選択時にデフォルトモデルで応答が生成されることを検証する
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.2, 5.1_
