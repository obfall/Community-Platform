# 管理者向け利用履歴画面 実装計画

## 背景

- メニュー定義 `apps/web/lib/navigation.ts:73` に「利用履歴」(`/usage-history`) が admin/owner 向けとして既に登録されているが、ページ本体は未実装。
- 管理者が会員の操作ログ・ログイン履歴を確認し、監査・不正検知・サポート対応に利用する想定。

## 現状調査

### 既存資産（流用可）

| 資産                  | 場所                                                                                     | 扱い                                             |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `ActivityLog` モデル  | `apps/api/prisma/schema.prisma:2062-2076`                                                | スキーマ変更なしで流用                           |
| `LoginHistory` モデル | `apps/api/prisma/schema.prisma:219-232`                                                  | スキーマ変更なしで流用                           |
| メニュー項目          | `apps/web/lib/navigation.ts:73`                                                          | 既に admin/owner 向けに設置済み                  |
| 管理者ページパターン  | `apps/web/app/(dashboard)/settings/members/`                                             | テーブル + フィルタ + ページネーションの参考実装 |
| UI コンポーネント     | `apps/web/components/ui/{table, pagination, tabs, dialog, badge, select, input, button}` | そのまま流用                                     |
| 権限制御              | `apps/api/src/common/guards/roles.guard.ts` + `@Roles()` デコレータ                      | そのまま流用                                     |

### 既存で扱わないもの

- `GET /analytics/activity`（`apps/api/src/analytics/analytics.controller.ts`）: analytics ページが参照中のため、今回は温存し手を付けない。
- 共通 Date Range Picker: 未整備。今回は `<input type="date">` × 2 で代替し、共通コンポーネント化はしない。

### 新規に必要なもの

- バックエンド: `usage-history` モジュール（履歴系を集約）
- フロントエンド: `/usage-history` ページと専用 `_components/`、hooks、API クライアント

## 方針

### 確定事項

- **表示対象**: ActivityLog + LoginHistory を**2タブ構成**で切り替え表示
- **詳細表示**: モーダル（`Dialog` コンポーネント）で metadata などを整形表示
- **日付入力**: HTML native `<input type="date">` を 2 個並べる方式
- **CSV エクスポート**: 今回スコープに含める（監査証跡のダウンロード）
- **API 構成**: 新規 `usage-history` モジュールに集約（feature-based 命名規則に準拠）
- **権限**: admin / owner のみ

## 実装内容

### 1. バックエンド — `apps/api/src/usage-history/`（新規）

```
usage-history/
  usage-history.module.ts
  usage-history.controller.ts
  usage-history.service.ts
  dto/
    list-activity-log.dto.ts
    list-login-history.dto.ts
    export-query.dto.ts
```

#### エンドポイント

| メソッド | パス                             | 用途                                          |
| -------- | -------------------------------- | --------------------------------------------- |
| GET      | `/usage-history/activity`        | ActivityLog 一覧（ページネーション付き JSON） |
| GET      | `/usage-history/activity/export` | ActivityLog CSV ダウンロード                  |
| GET      | `/usage-history/logins`          | LoginHistory 一覧                             |
| GET      | `/usage-history/logins/export`   | LoginHistory CSV ダウンロード                 |

- 全エンドポイントに `JwtAuthGuard` + `@Roles("admin", "owner")`
- user 情報は `include: { user: { select: { id, name, email, avatarUrl } } }` で join
- CSV は `res.setHeader('Content-Type', 'text/csv')` でストリーミング返却（手組み、外部ライブラリ不要）

#### クエリパラメータ

- **共通**: `page`, `pageSize`, `userId?`, `from?`, `to?`, `search?`（user.name / email 部分一致）
- **activity 固有**: `action?`, `resourceType?`
- **logins 固有**: `status?`（SUCCESS / FAILURE）
- **export 系**: 一覧と同じフィルタを受け、上限 10000 件で返却

#### レスポンス形式

```json
{
  "items": [...],
  "total": 1234,
  "page": 1,
  "pageSize": 20
}
```

#### モジュール登録

- `apps/api/src/app.module.ts` の `imports` に `UsageHistoryModule` を追加。

### 2. フロントエンド — `apps/web/`

#### ページ・コンポーネント

```
apps/web/app/(dashboard)/usage-history/
  page.tsx                          ← タブシェル + 権限チェック
  _components/
    usage-history-tabs.tsx          ← Tabs コンポーネント
    activity-log-tab.tsx
    activity-log-table.tsx
    activity-log-filters.tsx
    activity-log-detail-dialog.tsx  ← metadata 詳細モーダル
    login-history-tab.tsx
    login-history-table.tsx
    login-history-filters.tsx
    login-history-detail-dialog.tsx
    date-range-input.tsx            ← <input type="date"> × 2 の小さな共通部品
    export-button.tsx               ← CSV ダウンロードボタン（共通）
```

#### hooks

```
apps/web/hooks/usage-history/
  use-activity-log.ts
  use-login-history.ts
```

#### API クライアント

```
apps/web/lib/api/usage-history.ts
  listActivityLog(params)
  listLoginHistory(params)
  // export は <a href> 直リンクで cookie 認証に依存（既存の auth 方式に合わせる）
```

#### テーブル表示項目

**操作ログタブ**

| 列         | 内容                                            |
| ---------- | ----------------------------------------------- |
| 日時       | createdAt                                       |
| ユーザー   | avatar + name + email                           |
| アクション | action                                          |
| 対象       | resourceType + resourceId                       |
| 詳細       | 「詳細」ボタン → モーダルで metadata を整形表示 |

**ログイン履歴タブ**

| 列       | 内容                                          |
| -------- | --------------------------------------------- |
| 日時     | createdAt                                     |
| ユーザー | avatar + name + email                         |
| 結果     | status（SUCCESS=緑バッジ / FAILURE=赤バッジ） |
| 失敗理由 | failureReason                                 |
| IP       | ipAddress                                     |
| 詳細     | 「詳細」ボタン → モーダルで UA などのフル情報 |

#### フィルタ UI

- 検索（Input、ユーザー名/メール）
- 期間（From / To の `<input type="date">` × 2）
- タブ固有の Select（action / resourceType / status）
- URL クエリと同期（`settings/members/` と同じ `useSearchParams` 方式）

### 3. 権限チェック

- **バックエンド**: `@Roles("admin", "owner")` デコレータ + `RolesGuard` で 403 返却
- **フロントエンド**: `page.tsx` 冒頭で `useAuth()` から role を取得し、admin/owner 以外はリダイレクトまたは 403 表示

## 影響範囲

- **新規作成のみ**。既存機能の挙動変更なし。
- `apps/api/src/app.module.ts` にモジュール追加（1行）のみ他所を触る。
- 共通 UI コンポーネント（`apps/web/components/`）への変更なし。

## 実装ステップ（推奨順）

1. **API**: `UsageHistoryModule` 骨組み + DTO
2. **API**: `/usage-history/activity`（一覧）実装 + Swagger / curl で動作確認
3. **API**: `/usage-history/logins`（一覧）実装
4. **API**: `/usage-history/activity/export` / `/usage-history/logins/export` CSV 実装
5. **Web**: `lib/api/usage-history.ts` + hooks
6. **Web**: `/usage-history/page.tsx` + 操作ログタブ（テーブル → フィルタ → ページネーション → 詳細モーダル → CSV ボタン）
7. **Web**: ログイン履歴タブ
8. **動作確認**: admin/owner でアクセス、member で 403、CSV ダウンロード、各フィルタ

## 受入条件

- admin / owner ロールで `/usage-history` にアクセスし、2タブそれぞれで一覧・フィルタ・ページネーション・詳細モーダル・CSV ダウンロードが動作する
- member / visitor ロールでアクセスすると 403（またはリダイレクト）
- 期間フィルタが ISO date で正しく API に渡り、結果が絞り込まれる
- CSV ファイルが UTF-8 BOM 付き（Excel 互換）でダウンロードされる
