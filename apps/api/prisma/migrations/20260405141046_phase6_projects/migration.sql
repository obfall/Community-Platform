-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectPublishStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "ProjectMemberStatus" AS ENUM ('active', 'withdrawn', 'removed');

-- CreateEnum
CREATE TYPE "ProjectBoardPublishStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "cover_image_url" VARCHAR(500),
    "category_id" UUID,
    "event_id" UUID,
    "start_date" DATE,
    "end_date" DATE,
    "status" "ProjectStatus" NOT NULL DEFAULT 'not_started',
    "publish_status" "ProjectPublishStatus" NOT NULL DEFAULT 'draft',
    "invite_token" VARCHAR(100) NOT NULL,
    "invite_link_enabled" BOOLEAN NOT NULL DEFAULT false,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "activity_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'member',
    "status" "ProjectMemberStatus" NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ,
    "removed_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "last_reply_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_thread_replies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_thread_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_thread_reply_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reply_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_thread_reply_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_thread_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "thread_id" UUID,
    "reply_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_thread_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tags" (
    "project_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tags_pkey" PRIMARY KEY ("project_id","tag_id")
);

-- CreateTable
CREATE TABLE "project_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL DEFAULT 'file',
    "name" VARCHAR(200),
    "parent_folder_id" UUID,
    "file_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "requested_date" DATE,
    "due_date" DATE,
    "notify_assignee" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_assignees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_task_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "category_id" UUID,
    "author_user_id" UUID NOT NULL,
    "language" VARCHAR(20) DEFAULT 'ja',
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "publish_status" "ProjectBoardPublishStatus" NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_board_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_post_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_board_post_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_board_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_type" VARCHAR(30) NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_board_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_invite_token_key" ON "projects"("invite_token");

-- CreateIndex
CREATE INDEX "projects_publish_status_status_idx" ON "projects"("publish_status", "status");

-- CreateIndex
CREATE INDEX "projects_created_by_user_id_idx" ON "projects"("created_by_user_id");

-- CreateIndex
CREATE INDEX "projects_event_id_idx" ON "projects"("event_id");

-- CreateIndex
CREATE INDEX "projects_category_id_idx" ON "projects"("category_id");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "project_threads_project_id_is_pinned_last_reply_at_idx" ON "project_threads"("project_id", "is_pinned" DESC, "last_reply_at" DESC);

-- CreateIndex
CREATE INDEX "project_thread_replies_thread_id_created_at_idx" ON "project_thread_replies"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "project_thread_reply_attachments_reply_id_sort_order_idx" ON "project_thread_reply_attachments"("reply_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_thread_likes_thread_id_idx" ON "project_thread_likes"("thread_id");

-- CreateIndex
CREATE INDEX "project_thread_likes_reply_id_idx" ON "project_thread_likes"("reply_id");

-- CreateIndex
CREATE INDEX "project_tags_tag_id_idx" ON "project_tags"("tag_id");

-- CreateIndex
CREATE INDEX "project_files_project_id_parent_folder_id_sort_order_idx" ON "project_files"("project_id", "parent_folder_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_tasks_project_id_sort_order_idx" ON "project_tasks"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_task_assignees_user_id_idx" ON "project_task_assignees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_task_assignees_task_id_user_id_key" ON "project_task_assignees"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "project_task_attachments_task_id_sort_order_idx" ON "project_task_attachments"("task_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_board_posts_project_id_publish_status_is_pinned_sor_idx" ON "project_board_posts"("project_id", "publish_status", "is_pinned" DESC, "sort_order", "created_at" DESC);

-- CreateIndex
CREATE INDEX "project_board_posts_author_user_id_idx" ON "project_board_posts"("author_user_id");

-- CreateIndex
CREATE INDEX "project_board_post_attachments_post_id_sort_order_idx" ON "project_board_post_attachments"("post_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_board_comments_post_id_created_at_idx" ON "project_board_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "project_board_comments_parent_comment_id_idx" ON "project_board_comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "project_board_comments_author_user_id_idx" ON "project_board_comments"("author_user_id");

-- CreateIndex
CREATE INDEX "project_board_likes_target_type_target_id_idx" ON "project_board_likes"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_board_likes_user_id_target_type_target_id_key" ON "project_board_likes"("user_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_threads" ADD CONSTRAINT "project_threads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_threads" ADD CONSTRAINT "project_threads_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_replies" ADD CONSTRAINT "project_thread_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "project_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_replies" ADD CONSTRAINT "project_thread_replies_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_reply_attachments" ADD CONSTRAINT "project_thread_reply_attachments_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "project_thread_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_reply_attachments" ADD CONSTRAINT "project_thread_reply_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_likes" ADD CONSTRAINT "project_thread_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_likes" ADD CONSTRAINT "project_thread_likes_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "project_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_likes" ADD CONSTRAINT "project_thread_likes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "project_thread_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "project_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_assignees" ADD CONSTRAINT "project_task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_assignees" ADD CONSTRAINT "project_task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_attachments" ADD CONSTRAINT "project_task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_attachments" ADD CONSTRAINT "project_task_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_posts" ADD CONSTRAINT "project_board_posts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_posts" ADD CONSTRAINT "project_board_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_posts" ADD CONSTRAINT "project_board_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_post_attachments" ADD CONSTRAINT "project_board_post_attachments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "project_board_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_post_attachments" ADD CONSTRAINT "project_board_post_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_comments" ADD CONSTRAINT "project_board_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "project_board_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_comments" ADD CONSTRAINT "project_board_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_comments" ADD CONSTRAINT "project_board_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "project_board_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_likes" ADD CONSTRAINT "project_board_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
