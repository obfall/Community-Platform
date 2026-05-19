-- Video.categoryId 機能を廃止する。
-- Category モデル自体は他ドメイン（projects / skill_listings / products / albums / user_interests 等）で使われるので残す。
-- 動画カテゴリは scope='video' で運用されていたため、対応する Category 行も削除する。

-- 1) FK 制約を drop
ALTER TABLE "videos" DROP CONSTRAINT IF EXISTS "videos_category_id_fkey";

-- 2) インデックスを drop
DROP INDEX IF EXISTS "videos_category_id_idx";

-- 3) カラムを drop
ALTER TABLE "videos" DROP COLUMN IF EXISTS "category_id";

-- 4) 動画カテゴリの Category 行を削除（他 scope は残す）
DELETE FROM "categories" WHERE "scope" = 'video';
