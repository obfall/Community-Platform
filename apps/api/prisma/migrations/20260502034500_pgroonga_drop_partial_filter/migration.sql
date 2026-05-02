-- Phase 11.1 修正: pgroonga partial index の WHERE 句を解除
--
-- partial index 条件 `WHERE deleted_at IS NULL` を含むと、
-- PostgreSQL プランナーが「SELECT id ... WHERE deleted_at IS NULL」のような
-- 通常の SELECT クエリでもこの pgroonga インデックスを Index Scan として
-- 選択することがある。pgroonga は ARRAY[col1, col2, ...] の各要素を別エントリ
-- として格納しているため、Index Scan されると同じ行が複数回返ってしまい、
-- React の key 重複エラーや結果重複の原因になる。
--
-- partial index を非 partial に変更することで、このインデックスは
-- &@~ 演算子使用時のみ使われるようになる。論理削除レコードも含むが、
-- 検索 SQL 側で `AND deleted_at IS NULL` を適用しているので結果は変わらない。

DROP INDEX IF EXISTS idx_events_pgroonga;
CREATE INDEX idx_events_pgroonga ON events USING pgroonga ((ARRAY[title, description]));

DROP INDEX IF EXISTS idx_products_pgroonga;
CREATE INDEX idx_products_pgroonga ON products USING pgroonga ((ARRAY[name, description]));

DROP INDEX IF EXISTS idx_videos_pgroonga;
CREATE INDEX idx_videos_pgroonga ON videos USING pgroonga ((ARRAY[title, description]));

DROP INDEX IF EXISTS idx_projects_pgroonga;
CREATE INDEX idx_projects_pgroonga ON projects USING pgroonga ((ARRAY[name, description]));

DROP INDEX IF EXISTS idx_users_pgroonga;
CREATE INDEX idx_users_pgroonga ON users USING pgroonga (name);

DROP INDEX IF EXISTS idx_board_topics_pgroonga;
CREATE INDEX idx_board_topics_pgroonga ON board_topics USING pgroonga ((ARRAY[title, body]));

DROP INDEX IF EXISTS idx_surveys_pgroonga;
CREATE INDEX idx_surveys_pgroonga ON surveys USING pgroonga ((ARRAY[title, description]));

DROP INDEX IF EXISTS idx_skill_listings_pgroonga;
CREATE INDEX idx_skill_listings_pgroonga ON skill_listings USING pgroonga ((ARRAY[title, description]));

DROP INDEX IF EXISTS idx_albums_pgroonga;
CREATE INDEX idx_albums_pgroonga ON albums USING pgroonga ((ARRAY[title, description]));

DROP INDEX IF EXISTS idx_venues_pgroonga;
CREATE INDEX idx_venues_pgroonga ON venues USING pgroonga ((ARRAY[name, description, address, access_info]));

DROP INDEX IF EXISTS idx_spaces_pgroonga;
CREATE INDEX idx_spaces_pgroonga ON spaces USING pgroonga ((ARRAY[name, description]));

DROP INDEX IF EXISTS idx_contents_pgroonga;
CREATE INDEX idx_contents_pgroonga ON contents USING pgroonga ((ARRAY[name, description]));
