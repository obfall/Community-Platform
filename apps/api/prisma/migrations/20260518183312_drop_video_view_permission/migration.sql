-- 動画の閲覧可能範囲（viewPermission）機能を廃止する。
-- 関連カラム（view_permission / allowed_roles / required_rank_id）と
-- VideoViewPermission enum を削除する。

-- 1) FK 制約を drop
ALTER TABLE "videos" DROP CONSTRAINT IF EXISTS "videos_required_rank_id_fkey";

-- 2) カラムを drop
ALTER TABLE "videos" DROP COLUMN IF EXISTS "view_permission";
ALTER TABLE "videos" DROP COLUMN IF EXISTS "allowed_roles";
ALTER TABLE "videos" DROP COLUMN IF EXISTS "required_rank_id";

-- 3) enum を drop
DROP TYPE IF EXISTS "VideoViewPermission";
