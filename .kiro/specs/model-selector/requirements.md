# Requirements Document

## Introduction

本ドキュメントは、Help Naviアプリケーションにおける「モデルセレクター」機能の要件を定義する。現在、AIエージェントはハードコードされた単一のAnthropicモデル（claude-sonnet-4-20250514）を使用しているが、本機能により、ユーザーが会話開始時に使用するAnthropicモデルを選択できるようにする。これにより、ユースケースに応じた最適なモデルの使い分けが可能となる。

## Requirements

### Requirement 1: モデル一覧の表示

**Objective:** ユーザーとして、利用可能なAnthropicモデルの一覧を確認したい。それにより、各モデルの特徴を把握した上で適切なモデルを選択できる。

#### Acceptance Criteria

1. When ユーザーが新しい会話を開始する画面を表示した時, the Help Navi shall 利用可能なAnthropicモデルの一覧をセレクターUIとして表示する
2. The Help Navi shall 各モデルについてモデル名と簡易的な説明（用途・特徴）を表示する
3. The Help Navi shall デフォルトのモデルを事前選択状態で表示する

### Requirement 2: モデルの選択

**Objective:** ユーザーとして、会話開始前にAnthropicモデルを選択したい。それにより、目的に合ったモデルで会話を行える。

#### Acceptance Criteria

1. When ユーザーがモデルセレクターからモデルを選択した時, the Help Navi shall 選択されたモデルを視覚的にハイライト表示する
2. When ユーザーがモデルを選択し最初のメッセージを送信した時, the Help Navi shall 選択されたモデルを使用してAIエージェントの応答を生成する
3. While 会話にまだメッセージが存在しない状態では, the Help Navi shall モデルセレクターを操作可能な状態で表示する

### Requirement 3: 会話中のモデル固定

**Objective:** ユーザーとして、会話中はモデルが固定されることを理解したい。それにより、一貫した応答品質で会話を継続できる。

#### Acceptance Criteria

1. When ユーザーが会話で最初のメッセージを送信した時, the Help Navi shall モデルセレクターを操作不可の状態にする
2. While 会話にメッセージが存在する状態では, the Help Navi shall 現在使用中のモデル名を表示する
3. When ユーザーが既存の会話をサイドバーから選択した時, the Help Navi shall その会話で使用されているモデル名を表示し、モデルセレクターを操作不可の状態にする

### Requirement 4: モデル情報の永続化

**Objective:** ユーザーとして、会話に紐づくモデル情報が保存されてほしい。それにより、過去の会話を再開した際にも同じモデルで応答が継続される。

#### Acceptance Criteria

1. When 新しい会話でモデルを選択し最初のメッセージを送信した時, the Help Navi shall 選択されたモデル識別子を会話データに保存する
2. When ユーザーが既存の会話を再開した時, the Help Navi shall 保存されたモデル識別子を使用してAIエージェントの応答を生成する
3. If モデル識別子が会話データに存在しない場合（既存の会話データとの互換性）, the Help Navi shall デフォルトのモデルを使用する

### Requirement 5: エラーハンドリング

**Objective:** ユーザーとして、モデル選択に関するエラーが適切に処理されてほしい。それにより、問題発生時にも混乱なくアプリケーションを利用できる。

#### Acceptance Criteria

1. If ユーザーがモデルを選択せずにメッセージを送信した場合, the Help Navi shall デフォルトのモデルを使用して応答を生成する
2. If 選択されたモデルが利用不可能な場合, the Help Navi shall ユーザーにエラーメッセージを表示し、別のモデルの選択を促す
