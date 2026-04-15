-- 1. space_types カラムを追加
ALTER TABLE "spaces" ADD COLUMN "space_types" TEXT[] NOT NULL DEFAULT '{}';

-- 2. 既存の space_type 値を space_types 配列に移行
UPDATE "spaces" SET "space_types" = ARRAY["space_type"::TEXT] WHERE "space_type" IS NOT NULL;

-- 3. 旧カラムを削除
ALTER TABLE "spaces" DROP COLUMN "space_type";

-- 4. SpaceType enum を削除
DROP TYPE IF EXISTS "SpaceType";
