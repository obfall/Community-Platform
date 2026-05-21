-- 掲示板（メイン/イベント/プロジェクト）の publishStatus 機能を廃止する。
-- 下書き機能を撤廃するため、draft トピックは soft delete してから publish_status カラムを drop する。
-- これにより、作者の意図しない公開を防ぎつつ、必要に応じてデータ復元も可能にする。
-- PublishStatus enum 自体は他テーブル（contents / albums / shop / venues / videos 等）で利用しているため残す。

-- 1) draft 状態のトピックを soft delete（作者が意図して非公開にしていたものを誤って公開しないため）
UPDATE "board_topics"
SET "deleted_at" = NOW()
WHERE "publish_status" = 'draft' AND "deleted_at" IS NULL;

UPDATE "event_board_topics"
SET "deleted_at" = NOW()
WHERE "publish_status" = 'draft' AND "deleted_at" IS NULL;

UPDATE "project_board_topics"
SET "deleted_at" = NOW()
WHERE "publish_status" = 'draft' AND "deleted_at" IS NULL;

-- 2) publish_status カラムを drop
ALTER TABLE "board_topics" DROP COLUMN IF EXISTS "publish_status";
ALTER TABLE "event_board_topics" DROP COLUMN IF EXISTS "publish_status";
ALTER TABLE "project_board_topics" DROP COLUMN IF EXISTS "publish_status";
