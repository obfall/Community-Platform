-- events.tags_text を追加し、タグ名でも全文検索ヒットさせる。
-- pgroonga インデックスを ARRAY[title, tags_text] に張り直す（description は対象外）。

-- 1) tags_text カラムを追加（NOT NULL DEFAULT ''）
ALTER TABLE "events" ADD COLUMN "tags_text" TEXT NOT NULL DEFAULT '';

-- 2) 既存データのバックフィル: EventTag を JOIN してタグ名をスペース連結
UPDATE "events" e
SET "tags_text" = coalesce(s.text, '')
FROM (
  SELECT et.event_id AS event_id, string_agg(t.name, ' ' ORDER BY t.name) AS text
  FROM "event_tags" et
  JOIN "tags" t ON t.id = et.tag_id
  GROUP BY et.event_id
) s
WHERE e.id = s.event_id;

-- 3) 既存の pgroonga インデックスを削除して、tags_text を含めて再作成
DROP INDEX IF EXISTS idx_events_pgroonga;
CREATE INDEX idx_events_pgroonga ON "events" USING pgroonga ((ARRAY[title, tags_text]));
