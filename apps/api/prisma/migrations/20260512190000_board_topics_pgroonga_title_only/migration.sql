-- 掲示板トピックの pgroonga 検索対象を title のみに絞り込む
-- 本文 (body) は仕様変更により検索対象から除外。
-- バック側のクエリ `ARRAY[title] &@~ keyword` とインデックス式を一致させてインデックス利用を担保する。

DROP INDEX IF EXISTS idx_board_topics_pgroonga;
CREATE INDEX idx_board_topics_pgroonga ON board_topics USING pgroonga ((ARRAY[title]));
