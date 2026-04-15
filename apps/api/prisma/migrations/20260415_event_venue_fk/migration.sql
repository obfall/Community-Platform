-- 1. events.venue_id カラム追加（NULL許容）
ALTER TABLE "events" ADD COLUMN "venue_id" UUID;

-- 2. 既存データを移行：events.venue_name と venues.name が完全一致する場合のみ紐付け
UPDATE "events" e
SET "venue_id" = v.id
FROM "venues" v
WHERE v."deleted_at" IS NULL
  AND e."venue_name" IS NOT NULL
  AND e."venue_name" = v.name;

-- 3. 外部キー制約
ALTER TABLE "events"
  ADD CONSTRAINT "events_venue_id_fkey"
  FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. インデックス
CREATE INDEX "events_venue_id_idx" ON "events"("venue_id");
