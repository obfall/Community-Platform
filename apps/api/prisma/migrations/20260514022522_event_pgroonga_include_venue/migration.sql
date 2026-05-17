-- events の pgroonga インデックスに venue_name を追加し、検索対象に会場名を含める。

DROP INDEX IF EXISTS idx_events_pgroonga;
CREATE INDEX idx_events_pgroonga
  ON "events" USING pgroonga ((ARRAY[title, tags_text, venue_name]));
