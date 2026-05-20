-- projects.tags_text を追加し、タグ名でも全文検索ヒットさせる。
-- pgroonga インデックスを ARRAY[name, description, tags_text] に張り直す。

-- 1) tags_text カラムを追加（NOT NULL DEFAULT ''）
ALTER TABLE "projects" ADD COLUMN "tags_text" TEXT NOT NULL DEFAULT '';

-- 2) 既存データのバックフィル: ProjectTag を JOIN してタグ名をスペース連結
UPDATE "projects" p
SET "tags_text" = coalesce(s.text, '')
FROM (
  SELECT pt.project_id AS project_id, string_agg(t.name, ' ' ORDER BY t.name) AS text
  FROM "project_tags" pt
  JOIN "tags" t ON t.id = pt.tag_id
  GROUP BY pt.project_id
) s
WHERE p.id = s.project_id;

-- 3) 既存の pgroonga インデックスを削除して、tags_text を含めて再作成
DROP INDEX IF EXISTS idx_projects_pgroonga;
CREATE INDEX idx_projects_pgroonga ON "projects" USING pgroonga ((ARRAY[name, description, tags_text]));
