-- プロジェクトの公開状態（publishStatus）機能を廃止する。
-- publish_status カラムと複合インデックスを削除し、status 単独のインデックスを作成する。
-- PublishStatus enum 自体は他テーブル（board_topics 等）で利用しているため残す。

-- 1) 複合インデックスを drop
DROP INDEX IF EXISTS "projects_publish_status_status_idx";

-- 2) カラムを drop
ALTER TABLE "projects" DROP COLUMN IF EXISTS "publish_status";

-- 3) status 単独のインデックスを作成
CREATE INDEX "projects_status_idx" ON "projects"("status");
