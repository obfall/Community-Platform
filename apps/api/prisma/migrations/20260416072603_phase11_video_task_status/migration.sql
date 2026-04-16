-- CreateEnum
CREATE TYPE "VideoTaskStatus" AS ENUM ('not_started', 'in_progress', 'completed');

-- AlterTable: 既存行には status=completed / updated_at=NOW() をセット
ALTER TABLE "video_task_completions"
  ADD COLUMN "status" "VideoTaskStatus" NOT NULL DEFAULT 'completed',
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ALTER COLUMN "completed_at" DROP NOT NULL,
  ALTER COLUMN "completed_at" DROP DEFAULT;
