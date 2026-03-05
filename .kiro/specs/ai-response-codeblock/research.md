# Research & Design Decisions

## Summary
- **Feature**: `ai-response-codeblock`
- **Discovery Scope**: Extension
- **Key Findings**:
  - Streamdown v2.3.0はストリーミング最適化済みMarkdownレンダリングライブラリであり、未完了Markdown構文の自動補完、コードブロックの組み込みコピーボタン・言語ラベルを提供する
  - `@streamdown/code`プラグインはShikiベースのシンタックスハイライトを提供し、200以上の言語をサポート、デュアルテーマ（ライト/ダーク）対応
  - 既存のMessageBubbleコンポーネントは`<p className="whitespace-pre-wrap">`でプレーンテキスト表示しており、AIメッセージのみMarkdownレンダリングに切り替える変更が必要

## Research Log

### Streamdown ライブラリ調査
- **Context**: AI回答のMarkdownレンダリングライブラリとしてStreamdownが選定済み。APIとプロパティの詳細を調査。
- **Sources Consulted**:
  - [Streamdown公式サイト](https://streamdown.ai/)
  - [GitHub - vercel/streamdown](https://github.com/vercel/streamdown)
  - [Streamdown Docs - Getting Started](https://streamdown.ai/docs/getting-started)
  - [Streamdown Docs - Configuration](https://streamdown.ai/docs/configuration)
  - [Streamdown Docs - Code Blocks](https://streamdown.ai/docs/code-blocks)
  - [Streamdown Docs - Code Plugin](https://streamdown.ai/docs/plugins/code)
- **Findings**:
  - 最新バージョン: v2.3.0（2026年2月19日リリース）
  - 主要Props: `children`, `animated`, `isAnimating`, `plugins`, `shikiTheme`, `className`, `controls`, `mode`
  - `isAnimating`プロパティ: ストリーミング中のコピーボタン無効化を制御
  - `animated`プロパティ: 文字単位のアニメーション表示を有効化（booleanまたはAnimateOptionsオブジェクト）
  - `shikiTheme`プロパティ: デフォルト値は`['github-light', 'github-dark']`（ライト/ダークの配列）
  - `parseIncompleteMarkdown`: デフォルトtrue、未完了Markdownの自動補完処理
  - コードブロックのコピーボタン: ホバー時に表示（モバイルでは常時表示）、`controls={{ code: false }}`で非表示可
  - CSSインポート: `streamdown/styles.css`（animatedプロパティ使用時必須）
  - Tailwind CSS v4対応: `@source "../node_modules/streamdown/dist/*.js";`をglobals.cssに追加
- **Implications**:
  - Streamdownの組み込み機能がRequirement 3（コピーボタン・言語ラベル）をほぼ完全にカバーする
  - `isAnimating`と`useChat`の`status`を連携させることでRequirement 4（ストリーミング中の表示）を実現可能
  - デュアルテーマのデフォルト値がプロジェクトのダークモード要件と合致する

### @streamdown/code プラグイン調査
- **Context**: シンタックスハイライト機能の設定方法を確認。
- **Sources Consulted**:
  - [Streamdown Docs - Code Plugin](https://streamdown.ai/docs/plugins/code)
- **Findings**:
  - `createCodePlugin({ themes: ['github-light', 'github-dark'] })`で設定
  - 200以上の言語をサポート、遅延読み込み
  - デュアルテーマ対応（ライト/ダークモード）
  - Tailwind CSS v4対応: `@source "../node_modules/@streamdown/code/dist/*.js";`も追加必要
- **Implications**:
  - Requirement 2で要求されるTypeScript、JavaScript、Python等の主要言語すべてに対応
  - 遅延読み込みによりバンドルサイズへの影響を最小化

### 既存コードベース分析
- **Context**: 変更対象のコンポーネント構造と依存関係を調査。
- **Sources Consulted**: プロジェクトソースコード
- **Findings**:
  - `MessageBubble`コンポーネント: `message.role`で`isUser`判定済み、テキスト抽出関数`extractTextContent`が存在
  - `MessageList`コンポーネント: `isStreaming`プロパティを`MessageBubble`に伝播していない（現在は`TypingIndicator`のみで使用）
  - `ChatContainer`コンポーネント: `status`を`isStreaming`に変換済み（`status === "streaming" || status === "submitted"`）
  - `MessageActions`コンポーネント: コピー機能を`navigator.clipboard.writeText`で実装済み
  - `globals.css`: Tailwind CSS v4の`@import "tailwindcss"`使用、`@theme inline`でカスタムプロパティ定義
  - ダークモード: `prefers-color-scheme: dark`のメディアクエリ + Tailwindの`dark:`バリアントを併用
- **Implications**:
  - `MessageBubble`に`isStreaming`プロパティを追加し、AIメッセージの場合のみMarkdownRendererに切り替える設計が適切
  - 既存のMessageActionsコピー機能はStreamdownの組み込みコピーボタンと重複するが、メッセージ全体のコピー（MessageActions）とコードブロック単位のコピー（Streamdown）で役割が異なるため共存可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| ラッパーコンポーネント方式 | Streamdownを薄いラッパーコンポーネントで包み、MessageBubbleから条件分岐で呼び出す | 既存構造への変更が最小、テスト容易、関心の分離が明確 | コンポーネント階層が1段増える | 採用 |
| MessageBubble直接統合 | MessageBubble内にStreamdownを直接記述 | コンポーネント数が増えない | MessageBubbleの責務が肥大化、テストが困難 | 不採用 |

## Design Decisions

### Decision: MarkdownRenderer ラッパーコンポーネントの導入
- **Context**: Streamdownコンポーネントの設定（プラグイン、テーマ、アニメーション）を一元管理する必要がある
- **Alternatives Considered**:
  1. MessageBubble内にStreamdownを直接インライン配置
  2. 専用MarkdownRendererコンポーネントとして分離
- **Selected Approach**: `MarkdownRenderer`コンポーネントを`src/features/chat/components/markdown-renderer.tsx`に作成し、Streamdownの設定を集約する
- **Rationale**: 関心の分離原則に従い、Markdown関連の設定・スタイリングを1ファイルに集約。将来的なStreamdownバージョンアップ時の影響範囲を限定できる。プロジェクトのcontainer/presentationalパターンにも合致する
- **Trade-offs**: コンポーネント階層が1段増えるが、テスタビリティと保守性の向上が上回る
- **Follow-up**: Streamdownのバージョンアップ時にプロパティ変更がMarkdownRendererのみに閉じることを確認

### Decision: ストリーミング状態の伝播方式
- **Context**: `isAnimating`プロパティをStreamdownに渡すため、ストリーミング状態をMessageBubbleまで伝播させる必要がある
- **Alternatives Considered**:
  1. MessageListからMessageBubbleにisStreamingをpropsで渡す
  2. React Contextで状態を共有する
- **Selected Approach**: propsによる明示的な伝播（MessageList -> MessageBubble -> MarkdownRenderer）
- **Rationale**: 既存のprops伝播パターンと一貫性がある。2-3層程度の伝播でありContext導入のオーバーヘッドは不要。加えて、最後のAIメッセージのみがストリーミング中であるため、各メッセージに対して適切に制御する必要がある
- **Trade-offs**: Props drilling が発生するが、コンポーネント階層が浅いため許容範囲

### Decision: コードブロックのコピー機能はStreamdown組み込みを利用
- **Context**: Requirement 3でコードブロック単位のコピー機能が要求されている
- **Alternatives Considered**:
  1. Streamdownの組み込みコピーボタンをそのまま利用
  2. カスタムコピーボタンを自作
- **Selected Approach**: Streamdownの組み込みコピーボタンを利用。`controls`プロパティはデフォルト（true）のまま
- **Rationale**: Streamdownの組み込みコピーボタンはホバー時表示、クリップボードコピー、モバイル対応を標準提供しており、要件を完全に満たす。自作する技術的理由がない
- **Trade-offs**: コピー完了時のフィードバック表示がStreamdownのデフォルト動作に依存する

## Risks & Mitigations
- Streamdownのバンドルサイズ影響 -- `@streamdown/code`の遅延読み込みによりコード量を最小化。初期表示への影響はShikiの遅延読み込みで軽減される
- Tailwind CSS v4のユーティリティクラス競合 -- `@source`ディレクティブで明示的にStreamdownのクラスを含める設定を行う
- ダークモード切り替え時のテーマ不整合 -- `shikiTheme`のデュアルテーマ設定がCSS `prefers-color-scheme`と自動連動するため、追加対応は不要

## References
- [Streamdown公式サイト](https://streamdown.ai/) -- ライブラリ概要、デモ
- [GitHub - vercel/streamdown](https://github.com/vercel/streamdown) -- ソースコード、バージョン情報
- [Streamdown Docs - Getting Started](https://streamdown.ai/docs/getting-started) -- セットアップ手順
- [Streamdown Docs - Configuration](https://streamdown.ai/docs/configuration) -- コンポーネントProps一覧
- [Streamdown Docs - Code Blocks](https://streamdown.ai/docs/code-blocks) -- コードブロック機能詳細
- [Streamdown Docs - Code Plugin](https://streamdown.ai/docs/plugins/code) -- @streamdown/codeプラグイン設定
