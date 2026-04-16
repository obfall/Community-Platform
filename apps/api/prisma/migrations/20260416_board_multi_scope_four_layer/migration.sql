-- DropForeignKey
ALTER TABLE "board_comments" DROP CONSTRAINT "board_comments_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "board_comments" DROP CONSTRAINT "board_comments_parent_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "board_comments" DROP CONSTRAINT "board_comments_post_id_fkey";

-- DropForeignKey
ALTER TABLE "board_post_attachments" DROP CONSTRAINT "board_post_attachments_file_id_fkey";

-- DropForeignKey
ALTER TABLE "board_post_attachments" DROP CONSTRAINT "board_post_attachments_post_id_fkey";

-- DropForeignKey
ALTER TABLE "board_post_tags" DROP CONSTRAINT "board_post_tags_post_id_fkey";

-- DropForeignKey
ALTER TABLE "board_post_tags" DROP CONSTRAINT "board_post_tags_tag_id_fkey";

-- DropForeignKey
ALTER TABLE "board_posts" DROP CONSTRAINT "board_posts_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "board_posts" DROP CONSTRAINT "board_posts_category_id_fkey";

-- DropForeignKey
ALTER TABLE "board_posts" DROP CONSTRAINT "board_posts_required_rank_id_fkey";

-- DropForeignKey
ALTER TABLE "event_board_comments" DROP CONSTRAINT "event_board_comments_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "event_board_comments" DROP CONSTRAINT "event_board_comments_post_id_fkey";

-- DropForeignKey
ALTER TABLE "event_board_posts" DROP CONSTRAINT "event_board_posts_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "event_board_posts" DROP CONSTRAINT "event_board_posts_event_id_fkey";

-- DropForeignKey
ALTER TABLE "project_board_comments" DROP CONSTRAINT "project_board_comments_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "project_board_comments" DROP CONSTRAINT "project_board_comments_parent_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "project_board_comments" DROP CONSTRAINT "project_board_comments_post_id_fkey";

-- DropForeignKey
ALTER TABLE "project_board_post_attachments" DROP CONSTRAINT "project_board_post_attachments_file_id_fkey";

-- DropForeignKey
ALTER TABLE "project_board_post_attachments" DROP CONSTRAINT "project_board_post_attachments_post_id_fkey";

-- DropForeignKey
ALTER TABLE "project_board_posts" DROP CONSTRAINT "project_board_posts_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "project_board_posts" DROP CONSTRAINT "project_board_posts_category_id_fkey";

-- DropForeignKey
ALTER TABLE "project_board_posts" DROP CONSTRAINT "project_board_posts_project_id_fkey";

-- DropTable
DROP TABLE "board_comments";

-- DropTable
DROP TABLE "board_post_attachments";

-- DropTable
DROP TABLE "board_post_tags";

-- DropTable
DROP TABLE "board_posts";

-- DropTable
DROP TABLE "event_board_comments";

-- DropTable
DROP TABLE "event_board_posts";

-- DropTable
DROP TABLE "project_board_comments";

-- DropTable
DROP TABLE "project_board_post_attachments";

-- DropTable
DROP TABLE "project_board_posts";

-- DropEnum
DROP TYPE "BoardViewPermission";

-- CreateTable
CREATE TABLE "event_board_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "allow_topic_creation" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "event_board_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_board_topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'published',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "event_board_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_board_topic_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "event_board_topic_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_board_topic_post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "event_board_topic_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_board_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_type" VARCHAR(30) NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_board_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "allow_topic_creation" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_board_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'published',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_board_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_topic_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_board_topic_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_topic_post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_board_topic_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_board_categories_event_id_sort_order_idx" ON "event_board_categories"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_board_topics_event_id_category_id_is_pinned_sort_orde_idx" ON "event_board_topics"("event_id", "category_id", "is_pinned" DESC, "sort_order", "created_at" DESC);

-- CreateIndex
CREATE INDEX "event_board_topics_author_user_id_idx" ON "event_board_topics"("author_user_id");

-- CreateIndex
CREATE INDEX "event_board_topic_posts_topic_id_created_at_idx" ON "event_board_topic_posts"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "event_board_topic_posts_author_user_id_idx" ON "event_board_topic_posts"("author_user_id");

-- CreateIndex
CREATE INDEX "event_board_topic_post_comments_post_id_created_at_idx" ON "event_board_topic_post_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "event_board_topic_post_comments_parent_comment_id_idx" ON "event_board_topic_post_comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "event_board_topic_post_comments_author_user_id_idx" ON "event_board_topic_post_comments"("author_user_id");

-- CreateIndex
CREATE INDEX "event_board_likes_target_type_target_id_idx" ON "event_board_likes"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_board_likes_user_id_target_type_target_id_key" ON "event_board_likes"("user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "project_board_categories_project_id_sort_order_idx" ON "project_board_categories"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_board_topics_project_id_category_id_is_pinned_sort__idx" ON "project_board_topics"("project_id", "category_id", "is_pinned" DESC, "sort_order", "created_at" DESC);

-- CreateIndex
CREATE INDEX "project_board_topics_author_user_id_idx" ON "project_board_topics"("author_user_id");

-- CreateIndex
CREATE INDEX "project_board_topic_posts_topic_id_created_at_idx" ON "project_board_topic_posts"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "project_board_topic_posts_author_user_id_idx" ON "project_board_topic_posts"("author_user_id");

-- CreateIndex
CREATE INDEX "project_board_topic_post_comments_post_id_created_at_idx" ON "project_board_topic_post_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "project_board_topic_post_comments_parent_comment_id_idx" ON "project_board_topic_post_comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "project_board_topic_post_comments_author_user_id_idx" ON "project_board_topic_post_comments"("author_user_id");

-- AddForeignKey
ALTER TABLE "event_board_categories" ADD CONSTRAINT "event_board_categories_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_categories" ADD CONSTRAINT "event_board_categories_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topics" ADD CONSTRAINT "event_board_topics_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topics" ADD CONSTRAINT "event_board_topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "event_board_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topics" ADD CONSTRAINT "event_board_topics_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topic_posts" ADD CONSTRAINT "event_board_topic_posts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "event_board_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topic_posts" ADD CONSTRAINT "event_board_topic_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topic_post_comments" ADD CONSTRAINT "event_board_topic_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "event_board_topic_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topic_post_comments" ADD CONSTRAINT "event_board_topic_post_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topic_post_comments" ADD CONSTRAINT "event_board_topic_post_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "event_board_topic_post_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_likes" ADD CONSTRAINT "event_board_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_categories" ADD CONSTRAINT "project_board_categories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_categories" ADD CONSTRAINT "project_board_categories_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topics" ADD CONSTRAINT "project_board_topics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topics" ADD CONSTRAINT "project_board_topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "project_board_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topics" ADD CONSTRAINT "project_board_topics_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topic_posts" ADD CONSTRAINT "project_board_topic_posts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "project_board_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topic_posts" ADD CONSTRAINT "project_board_topic_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topic_post_comments" ADD CONSTRAINT "project_board_topic_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "project_board_topic_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topic_post_comments" ADD CONSTRAINT "project_board_topic_post_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topic_post_comments" ADD CONSTRAINT "project_board_topic_post_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "project_board_topic_post_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security on new tables
-- NestJS API は直接接続で動作するため RLS をバイパスする。
-- anon key 経由の直接アクセスはポリシー未定義 = deny all で拒否される。
ALTER TABLE "event_board_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_board_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_board_topic_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_board_topic_post_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_board_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_board_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_board_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_board_topic_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_board_topic_post_comments" ENABLE ROW LEVEL SECURITY;
