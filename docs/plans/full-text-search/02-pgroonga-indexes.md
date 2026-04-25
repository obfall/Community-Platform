# 02: pgroonga インデックス追加（12 ドメイン）

## 目的

12 ドメインの検索対象フィールドに pgroonga インデックスを追加し、`&@~` 演算子で高速・高品質な日本語全文検索を可能にする。

## インデックス対象フィールド一覧

| ドメイン                 | テーブル            | 主要カラム          | 補助カラム                                |
| ------------------------ | ------------------- | ------------------- | ----------------------------------------- |
| 掲示板トピック           | `board_topics`      | `title`             | `body`                                    |
| 商品                     | `products`          | `name`              | `description`                             |
| イベント                 | `events`            | `title`             | `description`                             |
| 動画                     | `videos`            | `title`             | `description`                             |
| プロジェクト             | `projects`          | `name`              | `description`                             |
| ユーザー（基本）         | `users`             | `name`              | —                                         |
| ユーザー（公開情報）     | `user_public_info`  | `nickname`          | `introduction`, `specialty`, `prefecture` |
| ユーザー（プロフィール） | `user_profiles`     | `bio`               | —                                         |
| ユーザー（所属）         | `user_affiliations` | `organization_name` | `title`, `role_description`               |
| アンケート               | `surveys`           | `title`             | `description`                             |
| スキル                   | `skill_listings`    | `title`             | `description`                             |
| アルバム                 | `albums`            | `title`             | `description`                             |
| 会場                     | `venues`            | `name`              | `description`, `address`, `access_info`   |
| スペース                 | `spaces`            | `name`              | `description`                             |
| コンテンツ               | `contents`          | `name`              | `description`                             |
| FAQ                      | `faq_articles`      | `title`             | `body`                                    |

合計約 16 のインデックス（12 ドメイン、ユーザーは 4 テーブルに分散、会場・スペース別）。

## 演算子クラス

`pgroonga_text_full_text_search_ops_v2`（フル機能、`&@`, `&@~`, `&@*` 全対応）を採用。

## 検索演算子（メイン）

`&@~` を採用 — クエリ構文対応（複数キーワード AND / OR を扱える）。

## 実装ステップ

### ステップ1: マイグレ作成

```bash
cd apps/api
mkdir -p prisma/migrations/20260426000001_pgroonga_indexes
```

`prisma/migrations/20260426000001_pgroonga_indexes/migration.sql`:

```sql
-- pgroonga インデックス追加（Phase 11.1 全文検索対応）
-- 12 ドメインの主要テキストカラムに pgroonga インデックスを作成。
-- 論理削除済みは検索対象外なので部分インデックス（WHERE deleted_at IS NULL）。

-- ============================================================
-- 掲示板
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_board_topics_pgroonga
  ON board_topics
  USING pgroonga ((ARRAY[title, body]))
  WHERE deleted_at IS NULL;

-- ============================================================
-- 商品
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_pgroonga
  ON products
  USING pgroonga ((ARRAY[name, description]))
  WHERE deleted_at IS NULL;

-- ============================================================
-- イベント
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_pgroonga
  ON events
  USING pgroonga ((ARRAY[title, description]))
  WHERE deleted_at IS NULL;

-- ============================================================
-- 動画
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_videos_pgroonga
  ON videos
  USING pgroonga ((ARRAY[title, description]))
  WHERE deleted_at IS NULL;

-- ============================================================
-- プロジェクト
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_pgroonga
  ON projects
  USING pgroonga ((ARRAY[name, description]))
  WHERE deleted_at IS NULL;

-- ============================================================
-- ユーザー（複数テーブル統合検索）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_pgroonga
  ON users
  USING pgroonga (name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_public_info_pgroonga
  ON user_public_info
  USING pgroonga ((ARRAY[nickname, introduction, specialty, prefecture]));

CREATE INDEX IF NOT EXISTS idx_user_profiles_pgroonga
  ON user_profiles
  USING pgroonga (bio);

CREATE INDEX IF NOT EXISTS idx_user_affiliations_pgroonga
  ON user_affiliations
  USING pgroonga ((ARRAY[organization_name, title, role_description]));

-- ============================================================
-- アンケート
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_surveys_pgroonga
  ON surveys
  USING pgroonga ((ARRAY[title, description]))
  WHERE deleted_at IS NULL;

-- ============================================================
-- スキル
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_skill_listings_pgroonga
  ON skill_listings
  USING pgroonga ((ARRAY[title, description]))
  WHERE deleted_at IS NULL;

-- ============================================================
-- アルバム
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_albums_pgroonga
  ON albums
  USING pgroonga ((ARRAY[title, description]))
  WHERE deleted_at IS NULL;

-- ============================================================
-- 会場・スペース
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_venues_pgroonga
  ON venues
  USING pgroonga ((ARRAY[name, description, address, access_info]))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_spaces_pgroonga
  ON spaces
  USING pgroonga ((ARRAY[name, description]))
  WHERE deleted_at IS NULL;

-- ============================================================
-- コンテンツ
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contents_pgroonga
  ON contents
  USING pgroonga ((ARRAY[name, description]))
  WHERE deleted_at IS NULL;

-- ============================================================
-- FAQ
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_faq_articles_pgroonga
  ON faq_articles
  USING pgroonga ((ARRAY[title, body]))
  WHERE is_published = true;
```

### ステップ2: 動作確認

```sql
-- インデックス一覧
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE '%pgroonga%';

-- 検索クエリの実行計画確認
EXPLAIN ANALYZE
SELECT id, title FROM board_topics
WHERE ARRAY[title, body] &@~ 'デモ イベント'
  AND deleted_at IS NULL
LIMIT 10;
-- → "Index Scan using idx_board_topics_pgroonga" が見えれば OK
```

### ステップ3: 関連度スコアの取得

```sql
SELECT
  id,
  title,
  pgroonga_score(tableoid, ctid) AS score
FROM board_topics
WHERE ARRAY[title, body] &@~ 'デモ イベント'
  AND deleted_at IS NULL
ORDER BY score DESC
LIMIT 10;
```

### ステップ4: ハイライトの基本

```sql
SELECT
  id,
  pgroonga_highlight_html(
    title,
    pgroonga_query_extract_keywords('デモ イベント')
  ) AS title_highlighted,
  pgroonga_highlight_html(
    substr(body, 1, 200),  -- 先頭 200 文字をスニペット化
    pgroonga_query_extract_keywords('デモ イベント')
  ) AS snippet_highlighted
FROM board_topics
WHERE ARRAY[title, body] &@~ 'デモ イベント';
-- title_highlighted: <mark>デモ</mark>用<mark>イベント</mark>のお知らせ
-- snippet_highlighted: <mark>デモ</mark>用の<mark>イベント</mark>を開催...
```

### ステップ5: ユーザー検索の特殊事情

ユーザーは複数テーブルにまたがる（`users` / `user_public_info` / `user_profiles` / `user_affiliations`）。検索時は次のいずれか:

#### パターン A: テーブル別 OR 検索（推奨）

```sql
SELECT u.id, u.name
FROM users u
LEFT JOIN user_public_info upi ON upi.user_id = u.id
LEFT JOIN user_profiles up ON up.user_id = u.id
LEFT JOIN user_affiliations ua ON ua.user_id = u.id
WHERE u.deleted_at IS NULL
  AND u.status = 'active'
  AND upi.public_status = 'public'
  AND (
    u.name &@~ 'たろう' OR
    ARRAY[upi.nickname, upi.introduction, upi.specialty, upi.prefecture] &@~ 'たろう' OR
    up.bio &@~ 'たろう' OR
    ARRAY[ua.organization_name, ua.title, ua.role_description] &@~ 'たろう'
  )
ORDER BY GREATEST(
  pgroonga_score(u.tableoid, u.ctid),
  pgroonga_score(upi.tableoid, upi.ctid),
  -- ...
) DESC;
```

各サブテーブルのスコアを `GREATEST` でユーザー単位の最大スコアにする。

### ステップ6: パフォーマンステスト

シードデータで速度測定:

```sql
\timing on
SELECT COUNT(*) FROM board_topics WHERE ARRAY[title, body] &@~ 'テスト';
```

各ドメインで 100ms 以内に収まれば OK。

### ステップ7: インデックスメンテナンス

- 通常運用: INSERT / UPDATE / DELETE 時に自動更新（pgroonga が処理）
- 定期メンテ: `REINDEX INDEX CONCURRENTLY idx_xxx_pgroonga;` を年に 1〜2 回
- 物理サイズ: pgroonga インデックスは元データの 1〜2 倍、Supabase 容量を圧迫しないよう注視

## 確定事項（2026-04-25）

- ✅ 12 ドメイン全部にインデックス追加（Q2: C 確定）
- ✅ 部分インデックス（`WHERE deleted_at IS NULL` / `is_published = true`）採用
- ✅ `&@~` 演算子をメイン使用
- ✅ 関連度スコア（`pgroonga_score`）でデフォルトソート（Q5）
- ✅ ハイライトは `pgroonga_highlight_html` で生成（Q6）
- ✅ 掲示板はトピックのみ（Topic.title + body）、Post / Comment は対象外（Q10）
- ✅ ユーザー検索は name / nickname / bio / introduction / specialty / prefecture / 所属 全対象（Q11）

## 残確認事項

なし（全項目確定）

## 成果物

- `apps/api/prisma/migrations/{timestamp}_pgroonga_indexes/migration.sql`
- 動作確認用 SQL（任意で `docs/sql-snippets/search-debug.sql` 等にまとめる）
