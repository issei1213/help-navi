# Implementation Plan

- [x] 1. Streamdown APIの検証とパッケージセットアップ
  - pnpmでstreamdown、@streamdown/code、@streamdown/cjkをインストールする
  - 最小構成のStreamdownコンポーネントを一時ファイルで動作確認し、children・animated・isAnimating・plugins・shikiThemeの各propsが期待通り動作することを検証する
  - createCodePluginのテーマ設定（デュアルテーマ配列）が正しくShikiハイライトを適用することを確認する
  - parseIncompleteMarkdownのデフォルト動作（未完了Markdown自動補完）を確認する
  - 検証結果に基づき、後続タスクで使用するAPI呼び出しパターンを確定する
  - _Requirements: 1.1, 1.2, 2.1, 2.3_

- [x] 2. Tailwind CSS v4のStreamdown対応設定
  - globals.cssにStreamdownおよび@streamdown/codeのTailwind `@source`ディレクティブを追加し、ユーティリティクラスが認識されるようにする
  - `streamdown/styles.css`のインポートを追加する（animatedプロパティ使用に必須）
  - ダークモード・ライトモード両方でStreamdownのスタイルが既存デザインと競合しないことを確認する
  - _Requirements: 5.1, 5.2_

- [ ] 3. MarkdownRendererコンポーネントの実装
- [x] 3.1 Streamdownラッパーコンポーネントの作成
  - Streamdownコンポーネントをラップし、codeプラグイン（デュアルテーマ）とcjkプラグインの設定を一元管理するコンポーネントを作成する
  - プラグインインスタンスをモジュールスコープで生成し、レンダリング毎の再生成を防止する
  - contentプロパティを受け取りStreamdownのchildrenに渡す。空文字列の場合は空のレンダリング結果を返す
  - isStreamingプロパティをStreamdownのisAnimatingプロパティにマッピングする
  - コードブロックのコピーボタン・言語ラベル表示はStreamdown組み込み機能に委任する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_
  - _Contracts: MarkdownRendererProps_

- [x] 3.2 (P) エラーバウンダリによるグレースフルデグレードの実装
  - MarkdownRendererをReactエラーバウンダリで包み、Streamdownレンダリングエラー発生時にプレーンテキスト表示へフォールバックする仕組みを実装する
  - エラー発生時は既存の`<p className="whitespace-pre-wrap">`と同等のプレーンテキスト表示を行う
  - コンソールにエラーログを出力し、デバッグ可能にする
  - _Requirements: 1.1_

- [ ] 4. MessageListとMessageBubbleのisStreaming伝播
- [x] 4.1 MessageListからMessageBubbleへのisStreaming伝播
  - MessageListのmessages.map内で、最後のメッセージかつisStreamingがtrueの場合にのみisStreaming=trueをMessageBubbleに渡すロジックを追加する
  - TypingIndicatorの表示制御は、ストリーミング中かつ最後のメッセージがユーザーメッセージの場合（AI応答待ち）にのみ表示するよう調整する。AIメッセージがストリーミング中の場合はMarkdownRendererが表示を担うためTypingIndicatorは非表示にする
  - _Requirements: 4.1_
  - _Contracts: MessageListProps_

- [x] 4.2 MessageBubbleのAI/ユーザー表示分岐
  - MessageBubbleにisStreamingプロパティを追加する
  - AIメッセージ（role === "assistant"）の場合、既存のプレーンテキスト表示をMarkdownRendererに置き換え、contentとisStreamingを渡す
  - ユーザーメッセージ（role === "user"）の場合は既存のプレーンテキスト表示を維持する
  - 既存のMessageActionsコンポーネント（メッセージ全体コピー・再生成）は変更なく維持する
  - _Requirements: 1.5, 4.1, 4.2, 4.3_
  - _Contracts: MessageBubbleProps, MarkdownRendererProps_

- [x] 5. スタイル・レイアウト整合性の調整
  - MarkdownRendererのレンダリング結果が既存のメッセージバブルデザイン（背景色、角丸、余白）と一貫するようスタイルを調整する
  - コードブロック内の長いコード行に対して水平スクロール（overflow-x: auto）を適用し、レイアウト幅を超えないようにする
  - モバイルビューポートでコードブロックが適切にリサイズされ、コピーボタンが操作可能であることを確認する
  - ダークモード・ライトモードの切り替え時にシンタックスハイライトテーマとコードブロック背景色が適切なコントラストで表示されることを確認する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6. ユニットテスト・統合テストの実装
- [x] 6.1 MarkdownRendererのユニットテスト
  - MarkdownRendererがStreamdownコンポーネントに正しいprops（children、isAnimating、plugins）を渡してレンダリングされることを検証する
  - isStreamingがtrueの場合にisAnimating=trueがStreamdownに渡されることを検証する
  - contentが空文字列の場合に空のレンダリング結果が返されることを検証する
  - エラーバウンダリがレンダリングエラー時にプレーンテキストへフォールバックすることを検証する
  - _Requirements: 1.1, 1.2, 4.1_

- [x] 6.2 (P) MessageBubbleの表示分岐テスト
  - role === "assistant"時にMarkdownRendererが使用されることを検証する
  - role === "user"時にプレーンテキスト表示が維持されることを検証する
  - isStreamingプロパティがMarkdownRendererに正しく伝播されることを検証する
  - _Requirements: 1.5, 4.1_

- [x] 6.3 (P) MessageListのisStreaming伝播テスト
  - 最後のメッセージのみにisStreaming=trueが渡されることを検証する
  - ストリーミング中にAIメッセージが存在する場合、TypingIndicatorが非表示になることを検証する
  - _Requirements: 4.1_

- [x]* 6.4 (P) Markdownレンダリング受け入れ基準の検証テスト
  - フェンスドコードブロック、インラインコード、見出し、リスト、太字、リンクの各Markdown要素が正しくレンダリングされることを検証する
  - 言語指定ありコードブロックにシンタックスハイライトが適用されることを検証する
  - 言語指定なしコードブロックがハイライトなしで表示されることを検証する
  - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2_
