-- 1. venue_types カラムを追加（既存データを移行するため一時的にデフォルト無し）
ALTER TABLE "venues" ADD COLUMN "venue_types" TEXT[] NOT NULL DEFAULT '{}';

-- 2. 既存の venue_type 値を venue_types 配列に移行
UPDATE "venues" SET "venue_types" = ARRAY["venue_type"::TEXT] WHERE "venue_type" IS NOT NULL;

-- 3. 旧カラムを削除
ALTER TABLE "venues" DROP COLUMN "venue_type";

-- 4. 旧インデックスを削除（存在する場合）
DROP INDEX IF EXISTS "venues_publish_status_venue_type_idx";

-- 5. 新インデックス
CREATE INDEX "venues_publish_status_idx" ON "venues"("publish_status");

-- 6. VenueType enum を削除
DROP TYPE IF EXISTS "VenueType";
