# アナリティクス: イベント参加分析の実装

## 背景

- メニューの「アナリティクス」（`/analytics`）を実装する
- マスト要件: **ユーザーがどのくらいイベントに参加しているか**を可視化する
- 加えて運営判断に効く派生指標（分布 / 推移 / 離脱予兆 / イベント別ランキング）を同一画面で提供する

## 現状調査

### 既存資産（枠はある）

| 層               | パス                                          | 状態                                                                                       |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| ページ           | `apps/web/app/(dashboard)/analytics/page.tsx` | サマリーカード + 3タブ（メンバー活動 / エンゲージメント / 推移）実装済み                   |
| hooks            | `apps/web/hooks/analytics/use-analytics.ts`   | `useAnalyticsDashboard` / `useMemberActivity` / `useEngagementRanking`                     |
| API クライアント | `apps/web/lib/api/analytics.ts`               | `/analytics/dashboard` `/analytics/members` `/analytics/engagement` `/analytics/activity`  |
| NestJS           | `apps/api/src/analytics/`                     | コントローラ / サービス実装済み。`@FeatureEnabled("analytics")` + `Roles("admin","owner")` |

### データソースの現状（重要）

Phase 7 で分析用テーブル4つ（`activity_logs` / `engagement_scores` / `analytics_snapshots` / `member_activity_summaries`）が切られているが、**これらを更新するバッチ / cron / seed が一切存在しない**。

- `@nestjs/schedule` 未導入
- `seed.ts` に集計テーブルの投入なし
- `AnalyticsService.logActivity` はあるが、他モジュールから呼ばれている形跡なし（要再確認）

つまり既存の「メンバー活動」「エンゲージメント」「推移」タブは**現状データが空**で、値が表示されない。

### 既存スキーマ（参加データの事実ソース）

`event_participants` (`apps/api/prisma/schema.prisma:1136`)

- `status: applied | confirmed | canceled | attended | no_show`
- `appliedAt` / `canceledAt` / `attendedAt`
- `@@index([userId])` / `@@index([eventId, status])` あり → ユーザー軸・イベント軸で引ける

`events` に `startAt` / `endAt` / `status` / `categoryId` あり。

## 実装方針

### データ取得方式：リアルタイム集計を採用

`event_participants` を直接集計するクエリで構築する。理由：

1. 事前集計バッチを別途設計すると本計画のスコープが爆発する
2. コミュニティ規模なら `event_participants` のレコード数は管理可能なオーダー（数千〜数万想定）で indexed クエリなら十分捌ける
3. 既存のスナップショット系テーブルを使う道は、**別計画**（analytics 全体のバッチ基盤整備）として切り出すべき

パフォーマンス問題が顕在化した時点で `member_activity_summaries` への事前集計に切り替える。

### 「参加」の定義（指標ごとに明記）

| 指標                       | 分子の定義                                                                | 分母の定義           |
| -------------------------- | ------------------------------------------------------------------------- | -------------------- |
| 参加数（メンバー軸）       | `status != canceled` のレコード数                                         | —                    |
| 出席率（イベント軸）       | `status = attended`                                                       | `status != canceled` |
| キャンセル率（イベント軸） | `status = canceled`                                                       | 全応募               |
| リピーター率（イベント軸） | そのイベントより前に他イベントで `status != canceled` を持つユーザー      | `status != canceled` |
| 離脱予兆                   | 過去に `status = attended` 1回以上 かつ 直近3ヶ月 `status = attended` が0 | —                    |

### UI 構成

既存の3タブに **「イベント参加」タブを追加**（デフォルト表示にする）。

```
アナリティクス
├─ サマリーカード（既存 + 追加1枚）
└─ タブ
   ├─ イベント参加（新規・デフォルト）  ← マスト要件の本丸
   ├─ メンバー活動（既存・拡張）
   ├─ エンゲージメント（既存・変更なし）
   └─ 推移（既存・変更なし）
```

#### 新タブ「イベント参加」の中身

4つのセクションを縦積み：

1. **参加数分布ヒストグラム**
   - X軸: 参加回数の層（0回 / 1回 / 2〜4回 / 5〜9回 / 10回以上）
   - Y軸: メンバー人数
   - 分母: `users.status = active` かつ `deletedAt IS NULL`
   - 参加カウント: `event_participants` で `status != canceled`

2. **月次参加者推移（直近12ヶ月）**
   - 折れ線 or 棒: ユニーク参加者数（月内に1回以上出席したユーザー数）
   - 同: 延べ参加数（月内の `attended` レコード数）
   - 月の切り方: `attendedAt` 基準 / `attendedAt` が NULL のものは `event.startAt` をフォールバック

3. **イベント別ランキング（直近のイベント）**
   - テーブル: イベント名 / 開催日 / 応募数 / 出席数 / 出席率 / キャンセル率 / リピーター率
   - ソート: 開催日 desc、ページネーション 20件
   - 行クリックで `/events/:id` に遷移（既存詳細ページへ）

4. **離脱予兆リスト**
   - テーブル: メンバー名 / 過去総参加回数 / 最終参加日 / 経過日数
   - 条件: 過去に `attended` 1回以上 かつ 直近3ヶ月 `attended` = 0
   - ソート: 経過日数 desc、ページネーション 20件
   - 行クリックで `/members/:id` に遷移

#### 既存「メンバー活動」タブの拡張

- `eventParticipationCount` のヘッダークリックで desc/asc ソート（API に `sortBy` パラメータは既存）
- 行クリックで `/members/:id` に遷移（既存ページへ。参加イベントはそちらのイベントタブで確認可）

ただし「メンバー活動」タブは `member_activity_summaries` を読みに行くので**バッチが無いと空**。そこで本計画では、このタブの API も「リアルタイム集計」に切り替える or サマリーテーブルに fallback 集計を入れるかを選ぶ必要あり。

**方針**: メンバー活動タブの `eventParticipationCount` も `event_participants` を group by で直接集計する実装に差し替える（サマリーテーブルを使わない）。サマリーテーブル全体の運用は別計画。

#### サマリーカードの追加

既存の4枚に加えて1枚追加：

- **直近30日のイベント参加延べ数**（`event_participants` で `attendedAt >= now - 30d` かつ `status = attended` のカウント）

## 影響範囲

### バックエンド（`apps/api/src/analytics/`）

追加エンドポイント：

- `GET /analytics/events/distribution` — 参加数分布
- `GET /analytics/events/monthly-trend` — 月次推移（クエリ: `months=12`）
- `GET /analytics/events/ranking` — イベント別ランキング（ページング）
- `GET /analytics/events/dropout-risk` — 離脱予兆リスト（クエリ: `months=3`、ページング）

変更エンドポイント：

- `GET /analytics/dashboard` — 直近30日参加延べ数を summary に追加
- `GET /analytics/members` — `event_participants` から集計するよう切り替え（サマリーテーブル依存をやめる）

### フロントエンド

- `apps/web/lib/api/analytics.ts` — 4つの関数追加
- `apps/web/lib/api/types.ts` — 4つの型追加
- `apps/web/hooks/analytics/use-analytics.ts` — 4つの hook 追加
- `apps/web/app/(dashboard)/analytics/page.tsx` — 新タブ + サマリーカード追加、タブのデフォルトを「イベント参加」に変更

### UI コンポーネント

既存で使えるもの：

- `@/components/ui/card` / `tabs` / `table` / `badge` / `button` — 全て再利用
- ヒストグラム / 折れ線の描画は **recharts を採用**（要依存追加確認。無ければ `<div>` バーで代替）

### 依存追加の確認

- `recharts`: `apps/web/package.json` を見て存在すれば採用、無ければ CSS の bar chart で代替（shadcn/ui のプリミティブで表現可能）

## PR 分割

スコープが大きいので2つに分ける：

### PR 1 — 新タブ「イベント参加」と新APIの実装

- バックエンド: 4エンドポイント追加
- フロント: 新タブ4セクション + hooks / API クライアント / 型
- タブデフォルトを「イベント参加」に変更

### PR 2 — 既存タブとサマリーカードの改修

- `GET /analytics/dashboard` に参加延べ数を追加、サマリーカード1枚追加
- `GET /analytics/members` をリアルタイム集計に切り替え
- メンバー活動タブにソート・行クリック遷移

## 非スコープ（やらないこと）

- `member_activity_summaries` / `analytics_snapshots` / `engagement_scores` のバッチ集計基盤整備
  - 理由: 本計画はマスト要件（イベント参加の可視化）にフォーカス。バッチ基盤は別計画で設計する
- `events/[id]/stats` の拡張（イベント個別の詳細統計）
  - 理由: `/analytics` ページの範囲外
- `members/[id]` の参加履歴タブ拡張
  - 理由: 既に実装済みで、本計画の追加ビューから同ページに遷移できれば要件を満たす
- 動画視聴 / 掲示板活動の分析
- 属性クロス集計（年代 × 参加率など）

## 未決事項（実装前に確認）

1. ヒストグラムの層別境界（`0 / 1 / 2-4 / 5-9 / 10+` で問題ないか）
2. 離脱予兆の閾値（`3ヶ月` でよいか、UI で可変にするか）
3. 月次推移の期間（`12ヶ月` 固定でよいか）
4. `recharts` 導入の可否（既存 deps に無ければ CSS bar で代替する）
