-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('cloudflare_stream', 'r2_hls');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('uploading', 'processing', 'ready', 'error');

-- CreateEnum
CREATE TYPE "VideoViewPermission" AS ENUM ('all', 'rank_restricted');

-- CreateEnum
CREATE TYPE "VideoPublishStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "video_series" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "video_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID,
    "series_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "video_provider" "VideoProvider" NOT NULL,
    "video_external_id" VARCHAR(200) NOT NULL,
    "playback_url" VARCHAR(500),
    "stream_status" "StreamStatus" NOT NULL DEFAULT 'uploading',
    "thumbnail_url" VARCHAR(500),
    "duration_seconds" INTEGER,
    "view_permission" "VideoViewPermission" NOT NULL DEFAULT 'all',
    "required_rank_id" UUID,
    "available_until" TIMESTAMPTZ,
    "password_hash" VARCHAR(255),
    "publish_status" "VideoPublishStatus" NOT NULL DEFAULT 'draft',
    "watch_order" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_instructors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_instructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_watch_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "watched_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_seconds" INTEGER NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "last_position_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ,
    "last_watched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "video_watch_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "video_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_task_completions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "resource_type" VARCHAR(30),
    "resource_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "login_frequency_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "post_frequency_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "event_participation_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "video_watch_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "engagement_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "snapshot_date" DATE NOT NULL,
    "total_members" INTEGER NOT NULL DEFAULT 0,
    "active_members" INTEGER NOT NULL DEFAULT 0,
    "new_members" INTEGER NOT NULL DEFAULT 0,
    "withdrawn_members" INTEGER NOT NULL DEFAULT 0,
    "total_posts" INTEGER NOT NULL DEFAULT 0,
    "total_comments" INTEGER NOT NULL DEFAULT 0,
    "total_events" INTEGER NOT NULL DEFAULT 0,
    "total_event_participants" INTEGER NOT NULL DEFAULT 0,
    "total_video_views" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_activity_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "last_login_at" TIMESTAMPTZ,
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "event_participation_count" INTEGER NOT NULL DEFAULT 0,
    "last_event_participated_at" TIMESTAMPTZ,
    "video_watch_count" INTEGER NOT NULL DEFAULT 0,
    "chat_message_count" INTEGER NOT NULL DEFAULT 0,
    "project_count" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_activity_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_series_sort_order_idx" ON "video_series"("sort_order");

-- CreateIndex
CREATE INDEX "videos_publish_status_sort_order_idx" ON "videos"("publish_status", "sort_order");

-- CreateIndex
CREATE INDEX "videos_category_id_idx" ON "videos"("category_id");

-- CreateIndex
CREATE INDEX "videos_series_id_idx" ON "videos"("series_id");

-- CreateIndex
CREATE INDEX "videos_series_id_watch_order_idx" ON "videos"("series_id", "watch_order");

-- CreateIndex
CREATE INDEX "video_instructors_user_id_idx" ON "video_instructors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_instructors_video_id_user_id_key" ON "video_instructors"("video_id", "user_id");

-- CreateIndex
CREATE INDEX "video_attachments_video_id_sort_order_idx" ON "video_attachments"("video_id", "sort_order");

-- CreateIndex
CREATE INDEX "video_watch_progress_user_id_idx" ON "video_watch_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_watch_progress_video_id_user_id_key" ON "video_watch_progress"("video_id", "user_id");

-- CreateIndex
CREATE INDEX "video_tasks_video_id_sort_order_idx" ON "video_tasks"("video_id", "sort_order");

-- CreateIndex
CREATE INDEX "video_task_completions_user_id_idx" ON "video_task_completions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_task_completions_video_task_id_user_id_key" ON "video_task_completions"("video_task_id", "user_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_action_created_at_idx" ON "activity_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "engagement_scores_user_id_key" ON "engagement_scores"("user_id");

-- CreateIndex
CREATE INDEX "engagement_scores_score_idx" ON "engagement_scores"("score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_snapshot_date_key" ON "analytics_snapshots"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "member_activity_summaries_user_id_key" ON "member_activity_summaries"("user_id");

-- CreateIndex
CREATE INDEX "member_activity_summaries_event_participation_count_idx" ON "member_activity_summaries"("event_participation_count" DESC);

-- CreateIndex
CREATE INDEX "member_activity_summaries_last_login_at_idx" ON "member_activity_summaries"("last_login_at" DESC);

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "video_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_required_rank_id_fkey" FOREIGN KEY ("required_rank_id") REFERENCES "member_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_instructors" ADD CONSTRAINT "video_instructors_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_instructors" ADD CONSTRAINT "video_instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_attachments" ADD CONSTRAINT "video_attachments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_attachments" ADD CONSTRAINT "video_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_watch_progress" ADD CONSTRAINT "video_watch_progress_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_watch_progress" ADD CONSTRAINT "video_watch_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_tasks" ADD CONSTRAINT "video_tasks_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_task_completions" ADD CONSTRAINT "video_task_completions_video_task_id_fkey" FOREIGN KEY ("video_task_id") REFERENCES "video_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_task_completions" ADD CONSTRAINT "video_task_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_scores" ADD CONSTRAINT "engagement_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_activity_summaries" ADD CONSTRAINT "member_activity_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
