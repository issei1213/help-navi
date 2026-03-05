# Research & Design Decisions

---
**Purpose**: チャット画面リデザイン機能のディスカバリーフェーズで得られた調査結果、アーキテクチャ判断、およびその根拠を記録する。
---

## Summary
- **Feature**: `chat-screen-redesign`
- **Discovery Scope**: Extension（既存チャットのリデザイン + 永続化 + コンポーネントリファクタリング）
- **Key Findings**:
  - AI SDK v5/v6 の useChat は transport ベースのアーキテクチャに移行済み。chatId、sendMessage、stop、regenerate が利用可能
  - メッセージ永続化は onFinish コールバック + initialMessages パターンが公式推奨
  - react-markdown v10 + remark-gfm v4 は React 19 / Next.js 16 と互換性あり

## Research Log

### AI SDK useChat API の現状確認
- **Context**: 既存実装が `useChat` + `DefaultChatTransport` を使用。リデザインに必要なAPI（chatId切替、stop、regenerate）の対応状況を確認
- **Sources Consulted**:
  - [AI SDK UI: useChat リファレンス](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
  - [AI SDK UI: Chatbot Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence)
  - [AI SDK UI: Transport](https://ai-sdk.dev/docs/ai-sdk-ui/transport)
- **Findings**:
  - `useChat({ id, transport, initialMessages })` で会話ID指定・初期メッセージロードが可能
  - `sendMessage({ text, files?, metadata? })` でメッセージ送信
  - `stop()` でストリーミング中の生成を中止可能
  - `regenerate({ messageId? })` で最後のアシスタントメッセージまたは指定メッセージを再生成
  - `status` は `'submitted' | 'streaming' | 'ready' | 'error'` の4値
  - `messages` は `UIMessage[]` 型（id, role, parts, metadata を含む）
  - `DefaultChatTransport` のデフォルトエンドポイントは `/api/chat`、chatIdを含めると `/api/chat/{chatId}/stream`
- **Implications**:
  - chatId を動的に切り替えることで会話の切替が実現可能
  - initialMessages にDBからロードしたメッセージを渡すことで履歴復元が可能
  - stop / regenerate はそのままリトライ・停止ボタンに利用可能

### メッセージ永続化パターン
- **Context**: 会話履歴をPostgreSQL/Prismaに永続化するパターンの調査
- **Sources Consulted**:
  - [AI SDK UI: Chatbot Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence)
  - [Prisma + AI SDK + Next.js ガイド](https://www.prisma.io/docs/guides/ai-sdk-nextjs)
- **Findings**:
  - サーバー側の `onFinish` コールバックで完了したメッセージを保存するのが推奨パターン
  - クライアントから `prepareSendMessagesRequest` で最新メッセージのみ送信し、サーバー側でDB保存済みメッセージとマージする方式がある
  - 本プロジェクトでは会話CRUD用の独立APIルートを設け、チャットストリームAPIとは分離する設計が適切
  - メッセージ保存はチャットAPI内で `onFinish` で行い、CRUD操作（一覧取得・削除・タイトル更新）は別APIで提供
- **Implications**:
  - Conversation / Message の2モデルでスキーマ設計
  - チャットAPIルートでストリーミング完了時にメッセージを自動保存
  - 別途 `/api/conversations` REST APIでCRUD操作を提供

### Markdownレンダリング
- **Context**: AIメッセージのMarkdownレンダリング対応ライブラリの調査
- **Sources Consulted**:
  - [react-markdown GitHub](https://github.com/remarkjs/react-markdown)
  - [remark-gfm npm](https://www.npmjs.com/package/remark-gfm)
- **Findings**:
  - react-markdown v10 は React 19 / Next.js 16 と互換性あり
  - remark-gfm v4 でGFM拡張（テーブル、打ち消し線等）をサポート
  - rehype-highlight でコードブロックのシンタックスハイライトが可能
  - react-markdown はReact Hooksに依存しないため幅広いバージョンで動作
- **Implications**:
  - 新規依存として `react-markdown` + `remark-gfm` を追加
  - コードブロックのシンタックスハイライトは将来対応とし、今回は基本的なMarkdownレンダリングのみ

### レスポンシブレイアウト設計
- **Context**: GitHub Copilotチャット画面のデザインリファレンスに基づくレイアウト設計パターン
- **Findings**:
  - Tailwind CSS 4 のユーティリティクラスで `flex` / `grid` ベースの2カラムレイアウトを構築
  - ブレークポイント: `sm:` (640px), `md:` (768px), `lg:` (1024px)
  - モバイル: サイドバーはオーバーレイ表示（fixed + z-index + backdrop）
  - デスクトップ: サイドバーは固定幅（280px程度）、メインエリアは残り幅
  - 折りたたみ状態管理はReact useState + CSS transition で実現
- **Implications**:
  - Tailwind CSS 4 の既存設定のみで対応可能、追加CSSフレームワーク不要
  - モバイルオーバーレイは portal 不要、CSS fixed positioning で十分

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Container/Presentational + Custom Hooks | ロジックをContainer + hooksに集約し、表示はPresentationalに分離 | プロジェクト規約に準拠、テスタビリティ高い | Container肥大化リスク | steering の features パターンに完全一致 |
| Atomic Design | atoms/molecules/organisms/templates で階層化 | 再利用性が高い | プロジェクト規約と不一致、過剰な抽象化 | 不採用 |
| Feature Slice Design | 機能スライスごとに完全分離 | 大規模チーム向け | 単一機能のリデザインには過剰 | 不採用 |

## Design Decisions

### Decision: Container/Presentational パターンの採用
- **Context**: steering の `src/features/` パターンに従い、チャット機能のコンポーネント構成を決定する必要がある
- **Alternatives Considered**:
  1. Atomic Design -- コンポーネントを atoms/molecules/organisms で階層化
  2. Feature Slice Design -- 機能スライスごとに完全自己完結型
  3. Container/Presentational -- ロジックとUIを分離
- **Selected Approach**: Container/Presentational パターン + カスタムフック
- **Rationale**: steering の `structure.md` で明示的に Container/Presentational パターンが推奨されており、プロジェクト一貫性を維持
- **Trade-offs**: 小規模機能には若干冗長だが、保守性と拡張性のメリットが上回る
- **Follow-up**: Container が肥大化した場合はカスタムフックへの分離を徹底する

### Decision: 会話履歴API設計（REST API分離方式）
- **Context**: 会話のCRUD操作をどのように提供するか
- **Alternatives Considered**:
  1. チャットAPIに統合 -- ストリームAPIに CRUD も含める
  2. Server Actions -- Next.js の Server Actions で直接DB操作
  3. REST API分離 -- `/api/conversations` に独立したCRUDエンドポイント
- **Selected Approach**: REST API分離方式
- **Rationale**: 既存の `/api/chat` パターンと一貫性があり、API境界が明確。Server Actions は Mastra 統合との整合性が不明確
- **Trade-offs**: APIルートファイルが増加するが、責務の分離が明確
- **Follow-up**: 将来的にページネーション等が必要になった場合にも対応しやすい

### Decision: タイトル自動生成の方式
- **Context**: 会話タイトルをどのように自動生成するか
- **Alternatives Considered**:
  1. AIによる要約生成 -- 最初のやりとり完了後にAIでタイトル生成
  2. 最初のメッセージの先頭N文字を使用
  3. デフォルトタイトル（「新しいチャット」）+ 手動編集
- **Selected Approach**: 最初のユーザーメッセージの先頭30文字を自動設定 + 手動編集可能
- **Rationale**: シンプルで即座に反映される。AI要約は追加のAPI呼び出しコストとレイテンシが発生する
- **Trade-offs**: AI要約ほど的確なタイトルにはならないが、ユーザーが手動で編集可能
- **Follow-up**: ユーザーフィードバック次第でAI要約方式への切り替えを検討

### Decision: Markdownレンダリングライブラリ
- **Context**: AIメッセージのMarkdownレンダリング手法の選定
- **Alternatives Considered**:
  1. react-markdown + remark-gfm -- 定番の組み合わせ
  2. @next/mdx -- Next.js 公式のMDXサポート
  3. marked + DOMPurify -- パース + サニタイズの組み合わせ
- **Selected Approach**: react-markdown v10 + remark-gfm v4
- **Rationale**: React 19 / Next.js 16 との互換性確認済み。コンポーネントベースで型安全。XSS対策が標準で組み込まれている
- **Trade-offs**: バンドルサイズが若干増加するが、安全性と開発効率のメリットが上回る
- **Follow-up**: コードブロックのシンタックスハイライト（rehype-highlight）は将来的に追加検討

## Risks & Mitigations
- useChat の chatId 動的切替時にメッセージ状態がリセットされない可能性 -- useChat の id prop 変更時の挙動をテストで確認。必要に応じて key prop でコンポーネントをリマウント
- モバイルオーバーレイのスクロール制御 -- body スクロールのロック処理を実装
- メッセージの二重保存（onFinish とCRUD API の競合） -- onFinish での保存を主系統とし、CRUD API は読み取り・削除・更新のみ
- 大量メッセージ時のパフォーマンス -- メッセージ取得に limit を設定し、初期ロードは最新N件に制限

## References
- [AI SDK UI: useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) -- useChat API リファレンス
- [AI SDK UI: Chatbot Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence) -- メッセージ永続化パターン
- [AI SDK UI: Transport](https://ai-sdk.dev/docs/ai-sdk-ui/transport) -- Transport 設定
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) -- Markdown レンダリングライブラリ
- [Prisma + AI SDK + Next.js ガイド](https://www.prisma.io/docs/guides/ai-sdk-nextjs) -- Prisma チャットアプリ実装ガイド
- [Prisma ベストプラクティス](https://www.prisma.io/docs/orm/more/best-practices) -- Prisma スキーマ設計のベストプラクティス
