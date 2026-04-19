# アンケート機能リファクタリング — 共通コンポーネント化 + イベント統合 + メンバー導線

## 背景

- 運営者がメンバーに対してアンケート調査を実施し、データを収集するのが目的
- 現状はサイドバーメニュー（admin/owner 限定）からしかアクセスできず、メンバーには導線がない
- イベント用アンケートも実装したいが、UI ロジックが各ページに密結合しており再利用できない
- メンバーの回答導線はメニューからではなく、**ダッシュボード + 通知 + イベントページ** から提供する

## 現状調査

### 現在のファイル構成

```
surveys/page.tsx        — 管理一覧（admin/owner 専用）
surveys/new/page.tsx    — 作成フォーム（260行、ロジック全埋め込み）
surveys/[id]/edit/      — 編集フォーム（300行、new とほぼ同じ構造）
surveys/[id]/respond/   — 回答フォーム（180行、ロジック全埋め込み）
surveys/[id]/results/   — 結果表示（105行、ロジック全埋め込み）
events/[id]/survey/     — プレースホルダー（準備中）
```

### 問題点

1. **new と edit で質問ビルダーのロジックが重複** — 質問追加/削除/選択肢管理が完全コピー
2. **回答フォームがページに密結合** — イベント用で再利用不可
3. **結果表示がページに密結合** — イベント詳細内で表示できない
4. **メンバーへの導線がゼロ** — メニューは admin/owner のみ、通知なし、ダッシュボードに表示なし

### 既存資産

| 資産                         | 場所                      | 再利用                             |
| ---------------------------- | ------------------------- | ---------------------------------- |
| hooks/surveys/use-surveys.ts | 全 CRUD + 回答 + 結果取得 | そのまま使える                     |
| lib/api/surveys.ts           | API クライアント          | eventId パラメータ追加で拡張       |
| lib/api/types.ts             | 型定義                    | SurveyQuery に eventId 追加        |
| DB Survey.eventId            | FK to Event               | 既存（未使用）                     |
| 通知基盤                     | notifications モジュール  | create / createMany で通知生成可能 |

## 実装方針

### Phase 1: 共通コンポーネント抽出

既存ページからロジックを共通コンポーネントに抽出し、ページは薄いラッパーに変える。

#### 新規作成: `components/surveys/`

```
components/surveys/
├── survey-form-builder.tsx     ← 質問ビルダー（new/edit/event で共用）
├── survey-response-form.tsx    ← 回答フォーム（respond/event で共用）
├── survey-results-view.tsx     ← 結果表示（results/event で共用）
└── pending-surveys-widget.tsx  ← ダッシュボード未回答ウィジェット
```

#### `survey-form-builder.tsx`

new/page.tsx と edit/page.tsx から質問ビルダーロジックを抽出。

```tsx
interface SurveyFormBuilderProps {
  initialData?: {
    // edit 時に渡す
    title: string;
    description: string | null;
    questions: QuestionDraft[];
  };
  onSubmit: (data: SurveyFormData) => void;
  isSubmitting: boolean;
  submitLabel: string; // "作成" | "保存"
  backHref: string; // "/surveys" | "/events/{id}"
  backLabel?: string; // ヘッダーのタイトル
}
```

- 質問の追加/削除/並び替え、選択肢管理、バリデーション — 全てこのコンポーネントに集約
- new/page.tsx → `<SurveyFormBuilder onSubmit={...} submitLabel="作成" backHref="/surveys" />`
- edit/page.tsx → `<SurveyFormBuilder initialData={survey} onSubmit={...} submitLabel="保存" backHref="/surveys" />`
- events/[id]/survey/ → `<SurveyFormBuilder onSubmit={...} submitLabel="作成" backHref={`/events/${id}`} />`

#### `survey-response-form.tsx`

respond/page.tsx から回答フォームを抽出。

```tsx
interface SurveyResponseFormProps {
  survey: SurveyDetail;
  onSubmit: (answers: AnswerPayload[]) => void;
  isSubmitting: boolean;
  onBack?: () => void; // 戻るボタンの動作（ページごとに異なる）
  backHref?: string; // onBack がない場合の Link 先
  showProgress?: boolean; // プログレスバー表示
}
```

- 質問の表示、回答状態管理、バリデーション — 全てこのコンポーネントに集約
- respond/page.tsx → `<SurveyResponseForm survey={survey} onSubmit={...} backHref="/dashboard" />`
- イベント内 → `<SurveyResponseForm survey={survey} onSubmit={...} backHref={`/events/${id}`} />`

#### `survey-results-view.tsx`

results/page.tsx から結果表示を抽出。

```tsx
interface SurveyResultsViewProps {
  data: SurveyResults;
  backHref?: string; // 戻り先（省略時は表示しない）
}
```

- results/page.tsx → `<SurveyResultsView data={data} backHref="/surveys" />`
- events/[id]/survey/ の結果タブ → `<SurveyResultsView data={data} />`

#### `pending-surveys-widget.tsx`

```tsx
// ダッシュボードに表示する未回答アンケートカード
// - 未回答の active アンケートを最大3件表示
// - タイトル、質問数、所要時間目安
// - クリックで /surveys/{id}/respond へ遷移
```

### Phase 2: イベント用アンケート統合

events/[id]/survey/page.tsx を実装。管理者はイベントに紐づくアンケートを管理できる。

#### ページ構成

```
events/[id]/survey/page.tsx          ← イベントアンケート管理（一覧 + 作成導線）
events/[id]/survey/new/page.tsx      ← 新規作成（SurveyFormBuilder を使用）
events/[id]/survey/[surveyId]/
  ├── edit/page.tsx                  ← 編集（SurveyFormBuilder を使用）
  ├── respond/page.tsx               ← 回答（SurveyResponseForm を使用）
  └── results/page.tsx               ← 結果（SurveyResultsView を使用）
```

#### API 拡張

- `GET /surveys?eventId={id}` — イベントに紐づくアンケートをフィルタ
- `POST /surveys` body に `eventId` を追加 — イベント紐づけで作成
- hooks/surveys/use-surveys.ts — `SurveyQuery` に `eventId` を追加

### Phase 3: メンバー回答導線

#### 3-1. ダッシュボードウィジェット（P0）

```
dashboard/page.tsx
  └─ <PendingSurveysWidget />
       「未回答のアンケートが2件あります」
       ├─ 満足度調査（5問・約2分）  → /surveys/{id}/respond
       └─ 〇〇イベント感想（3問）   → /events/{eventId}/survey/{surveyId}/respond
```

- 新規 API: `GET /surveys/pending` — 自分が未回答の active アンケート一覧
- 汎用 / イベント紐づき両方を統一的に返す
- イベント紐づきの場合は `eventId` + イベント名も返す（リンク先の出し分けに使用）

#### 3-2. 通知（P1）

- アンケートのステータスを `draft → active` に変更した時点で通知を発行
- `notifications.createMany()` で対象メンバー全員に一括通知
- `referenceType: "survey"`, `referenceId: surveyId`
- 通知クリック → `/surveys/{id}/respond` or `/events/{eventId}/survey/{surveyId}/respond`

#### 3-3. 回答完了ページ改善（P1）

- 回答送信後に「回答ありがとうございました」確認画面を表示（現在は即リダイレクト）
- ダッシュボードへの戻りリンク

### Phase 4: サイドバーメニュー変更

- `navigation.ts` の `survey` エントリ — `roles: ["admin", "owner"]` のまま維持
- メンバーはメニューからアンケートにアクセスしない（ダッシュボード + 通知 + イベント経由のみ）

## コンポーネントの流れ図

```
┌─────────────────────────────────────────────────┐
│              共通コンポーネント層                  │
│                                                   │
│  SurveyFormBuilder   SurveyResponseForm   SurveyResultsView  │
│  (作成/編集)          (回答)                (結果表示)         │
└──────┬───────────────┬──────────────────┬────────┘
       │               │                  │
  ┌────▼────┐    ┌─────▼─────┐     ┌─────▼──────┐
  │ 汎用     │    │ 汎用      │     │ 汎用       │
  │ /surveys │    │ /surveys  │     │ /surveys   │
  │ /new     │    │ /{id}     │     │ /{id}      │
  │ /{id}    │    │ /respond  │     │ /results   │
  │ /edit    │    │           │     │            │
  └──────────┘    └───────────┘     └────────────┘
  ┌────▼────┐    ┌─────▼─────┐     ┌─────▼──────┐
  │ イベント │    │ イベント  │     │ イベント   │
  │ /events  │    │ /events   │     │ /events    │
  │ /{id}    │    │ /{id}     │     │ /{id}      │
  │ /survey  │    │ /survey   │     │ /survey    │
  │ /new     │    │ /{sId}    │     │ /{sId}     │
  │          │    │ /respond  │     │ /results   │
  └──────────┘    └───────────┘     └────────────┘

┌─────────────────────────────────────────────────┐
│              メンバー導線                          │
│                                                   │
│  ダッシュボード ──→ PendingSurveysWidget           │
│       │                  │                        │
│       │           未回答リスト → respond ページ     │
│       │                                           │
│  通知ベル ──→ 「新しいアンケートが届きました」      │
│       │           → respond ページ                 │
│       │                                           │
│  イベント詳細 ──→ アンケートタブ                    │
│                   → respond ページ                 │
└─────────────────────────────────────────────────┘
```

## 実装順序

| 順序 | 施策                                        | 影響範囲                        | 備考                   |
| ---- | ------------------------------------------- | ------------------------------- | ---------------------- |
| 1    | `SurveyFormBuilder` 抽出                    | new, edit                       | 既存動作の維持を最優先 |
| 2    | `SurveyResponseForm` 抽出                   | respond                         | 同上                   |
| 3    | `SurveyResultsView` 抽出                    | results                         | 同上                   |
| 4    | API に `eventId` フィルタ追加               | backend surveys                 |                        |
| 5    | イベントアンケートページ群                  | events/[id]/survey/             | 共通コンポーネント利用 |
| 6    | `GET /surveys/pending` API 追加             | backend surveys                 |                        |
| 7    | `PendingSurveysWidget` + ダッシュボード統合 | dashboard                       |                        |
| 8    | 通知発行（ステータス変更時）                | backend surveys + notifications |                        |
| 9    | 回答完了画面の改善                          | respond                         |                        |
