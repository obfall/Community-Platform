-- BoardTopic に sort_order カラムを追加
ALTER TABLE "board_topics" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- 既存データを createdAt 昇順でカテゴリごとに連番付与
UPDATE "board_topics" AS t SET "sort_order" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "category_id" ORDER BY "created_at" ASC
  ) AS rn
  FROM "board_topics" WHERE "deleted_at" IS NULL
) AS sub WHERE t.id = sub.id;

-- 旧インデックス削除 + 新インデックス作成
DROP INDEX IF EXISTS "board_topics_category_id_is_pinned_created_at_idx";
CREATE INDEX "board_topics_category_id_is_pinned_sort_order_created_at_idx"
  ON "board_topics"("category_id", "is_pinned" DESC, "sort_order", "created_at" DESC);
