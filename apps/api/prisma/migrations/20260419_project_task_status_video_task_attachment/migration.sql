-- プロジェクトタスクのステータス管理を VideoTaskStatus enum に統一

ALTER TABLE "project_tasks" ADD COLUMN "status" "VideoTaskStatus" NOT NULL DEFAULT 'not_started';

-- 既存の progress 値を status に変換
UPDATE "project_tasks" SET "status" = 'completed' WHERE "progress" = 100;
UPDATE "project_tasks" SET "status" = 'in_progress' WHERE "progress" > 0 AND "progress" < 100;
-- progress = 0 → not_started (DEFAULT で対応済み)

ALTER TABLE "project_tasks" DROP COLUMN "progress";

-- 動画タスク添付ファイルテーブル

CREATE TABLE "video_task_attachments" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "task_id"    UUID         NOT NULL,
  "file_id"    UUID         NOT NULL,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "video_task_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "video_task_attachments_task_id_sort_order_idx" ON "video_task_attachments"("task_id", "sort_order");

ALTER TABLE "video_task_attachments"
  ADD CONSTRAINT "video_task_attachments_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "video_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "video_task_attachments"
  ADD CONSTRAINT "video_task_attachments_file_id_fkey"
  FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "video_task_attachments" ENABLE ROW LEVEL SECURITY;
