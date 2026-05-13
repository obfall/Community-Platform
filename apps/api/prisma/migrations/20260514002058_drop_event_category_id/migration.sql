-- Event.categoryId 機能を廃止する。
-- Category モデル自体は他ドメイン（board / user_interest / projects 等）で使われるので残す。
-- events.category_id カラムは常に NULL（seed でも設定されていなかった）なのでデータ損失は無い。

-- 1) FK 制約を drop
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_category_id_fkey";

-- 2) インデックスを drop
DROP INDEX IF EXISTS "events_category_id_idx";

-- 3) カラムを drop
ALTER TABLE "events" DROP COLUMN IF EXISTS "category_id";
