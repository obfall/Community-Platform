-- CreateTable
CREATE TABLE "board_topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "publish_status" "BoardPublishStatus" NOT NULL DEFAULT 'published',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "board_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_topic_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "board_topic_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_topics_category_id_is_pinned_created_at_idx" ON "board_topics"("category_id", "is_pinned" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "board_topics_author_user_id_idx" ON "board_topics"("author_user_id");

-- CreateIndex
CREATE INDEX "board_topic_comments_topic_id_created_at_idx" ON "board_topic_comments"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "board_topic_comments_parent_comment_id_idx" ON "board_topic_comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "board_topic_comments_author_user_id_idx" ON "board_topic_comments"("author_user_id");

-- AddForeignKey
ALTER TABLE "board_topics" ADD CONSTRAINT "board_topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "board_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topics" ADD CONSTRAINT "board_topics_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topic_comments" ADD CONSTRAINT "board_topic_comments_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "board_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topic_comments" ADD CONSTRAINT "board_topic_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topic_comments" ADD CONSTRAINT "board_topic_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "board_topic_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
