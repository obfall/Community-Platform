-- Phase 2: Refactor BoardTopicComment -> BoardTopicPost + BoardTopicPostComment

-- 1. Rename table board_topic_comments -> board_topic_posts
ALTER TABLE "board_topic_comments" RENAME TO "board_topic_posts";

-- 2. Drop parent_comment_id column and its index from board_topic_posts (posts are flat)
DROP INDEX IF EXISTS "board_topic_comments_parent_comment_id_idx";
ALTER TABLE "board_topic_posts" DROP COLUMN IF EXISTS "parent_comment_id";

-- 3. Add comment_count column to board_topic_posts
ALTER TABLE "board_topic_posts" ADD COLUMN "comment_count" INTEGER NOT NULL DEFAULT 0;

-- 4. Rename comment_count -> post_count in board_topics
ALTER TABLE "board_topics" RENAME COLUMN "comment_count" TO "post_count";

-- 5. Rename indexes on board_topic_posts (from old board_topic_comments naming)
ALTER INDEX IF EXISTS "board_topic_comments_topic_id_created_at_idx"
  RENAME TO "board_topic_posts_topic_id_created_at_idx";
ALTER INDEX IF EXISTS "board_topic_comments_author_user_id_idx"
  RENAME TO "board_topic_posts_author_user_id_idx";
ALTER INDEX IF EXISTS "board_topic_comments_pkey"
  RENAME TO "board_topic_posts_pkey";

-- 6. Create board_topic_post_comments table
CREATE TABLE "board_topic_post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "board_topic_post_comments_pkey" PRIMARY KEY ("id")
);

-- 7. Create indexes for board_topic_post_comments
CREATE INDEX "board_topic_post_comments_post_id_created_at_idx"
  ON "board_topic_post_comments"("post_id", "created_at");
CREATE INDEX "board_topic_post_comments_parent_comment_id_idx"
  ON "board_topic_post_comments"("parent_comment_id");
CREATE INDEX "board_topic_post_comments_author_user_id_idx"
  ON "board_topic_post_comments"("author_user_id");

-- 8. Add foreign keys for board_topic_post_comments
ALTER TABLE "board_topic_post_comments"
  ADD CONSTRAINT "board_topic_post_comments_post_id_fkey"
  FOREIGN KEY ("post_id") REFERENCES "board_topic_posts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "board_topic_post_comments"
  ADD CONSTRAINT "board_topic_post_comments_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "board_topic_post_comments"
  ADD CONSTRAINT "board_topic_post_comments_parent_comment_id_fkey"
  FOREIGN KEY ("parent_comment_id") REFERENCES "board_topic_post_comments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. Update foreign key constraint names on board_topic_posts (renamed from board_topic_comments)
ALTER TABLE "board_topic_posts"
  DROP CONSTRAINT IF EXISTS "board_topic_comments_topic_id_fkey";
ALTER TABLE "board_topic_posts"
  ADD CONSTRAINT "board_topic_posts_topic_id_fkey"
  FOREIGN KEY ("topic_id") REFERENCES "board_topics"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "board_topic_posts"
  DROP CONSTRAINT IF EXISTS "board_topic_comments_author_user_id_fkey";
ALTER TABLE "board_topic_posts"
  ADD CONSTRAINT "board_topic_posts_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 10. Update board_likes target_type from 'topic_comment' to 'topic_post'
UPDATE "board_likes" SET "target_type" = 'topic_post' WHERE "target_type" = 'topic_comment';
