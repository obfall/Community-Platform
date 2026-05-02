-- Phase 11.1: pgroonga インデックス追加（12 ドメイン）
--
-- 検索対象テキストカラムに pgroonga インデックスを作成。
-- 論理削除カラムを持つテーブルは部分インデックス (WHERE deleted_at IS NULL) で
-- 検索対象外レコードをインデックスから除外する。
--
-- 演算子クラスはデフォルトの pgroonga_text_full_text_search_ops_v2 を使用。
-- 検索演算子は &@~（クエリ構文 + 形態素解析）を主に使う。
--
-- 配列カラムを対象にする場合は ARRAY[col1, col2, ...] でラップする。

-- ============================================================
-- 既存検索ありのドメイン（5）
-- ============================================================

-- イベント
CREATE INDEX IF NOT EXISTS idx_events_pgroonga
  ON events
  USING pgroonga ((ARRAY[title, description]))
  WHERE deleted_at IS NULL;

-- 商品
CREATE INDEX IF NOT EXISTS idx_products_pgroonga
  ON products
  USING pgroonga ((ARRAY[name, description]))
  WHERE deleted_at IS NULL;

-- 動画
CREATE INDEX IF NOT EXISTS idx_videos_pgroonga
  ON videos
  USING pgroonga ((ARRAY[title, description]))
  WHERE deleted_at IS NULL;

-- プロジェクト
CREATE INDEX IF NOT EXISTS idx_projects_pgroonga
  ON projects
  USING pgroonga ((ARRAY[name, description]))
  WHERE deleted_at IS NULL;

-- ユーザー（複数テーブル統合検索）
CREATE INDEX IF NOT EXISTS idx_users_pgroonga
  ON users
  USING pgroonga (name)
  WHERE deleted_at IS NULL;

-- user_public_info / user_profiles / user_affiliations は deleted_at 無し
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
-- 新規検索追加するドメイン（7）
-- ============================================================

-- 掲示板
CREATE INDEX IF NOT EXISTS idx_board_topics_pgroonga
  ON board_topics
  USING pgroonga ((ARRAY[title, body]))
  WHERE deleted_at IS NULL;

-- アンケート
CREATE INDEX IF NOT EXISTS idx_surveys_pgroonga
  ON surveys
  USING pgroonga ((ARRAY[title, description]))
  WHERE deleted_at IS NULL;

-- スキル
CREATE INDEX IF NOT EXISTS idx_skill_listings_pgroonga
  ON skill_listings
  USING pgroonga ((ARRAY[title, description]))
  WHERE deleted_at IS NULL;

-- アルバム
CREATE INDEX IF NOT EXISTS idx_albums_pgroonga
  ON albums
  USING pgroonga ((ARRAY[title, description]))
  WHERE deleted_at IS NULL;

-- 会場
CREATE INDEX IF NOT EXISTS idx_venues_pgroonga
  ON venues
  USING pgroonga ((ARRAY[name, description, address, access_info]))
  WHERE deleted_at IS NULL;

-- スペース（venue 配下）
CREATE INDEX IF NOT EXISTS idx_spaces_pgroonga
  ON spaces
  USING pgroonga ((ARRAY[name, description]))
  WHERE deleted_at IS NULL;

-- コンテンツ
CREATE INDEX IF NOT EXISTS idx_contents_pgroonga
  ON contents
  USING pgroonga ((ARRAY[name, description]))
  WHERE deleted_at IS NULL;

-- FAQ（deleted_at 無し）
CREATE INDEX IF NOT EXISTS idx_faq_articles_pgroonga
  ON faq_articles
  USING pgroonga ((ARRAY[title, body]));
