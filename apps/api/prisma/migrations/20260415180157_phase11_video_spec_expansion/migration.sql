-- AlterEnum
ALTER TYPE "VideoViewPermission" ADD VALUE 'role_restricted';

-- DropForeignKey
ALTER TABLE "video_instructors" DROP CONSTRAINT "video_instructors_user_id_fkey";

-- DropIndex
DROP INDEX "video_instructors_video_id_user_id_key";

-- AlterTable: 既存レコードに対して一旦 NULLABLE で追加してから backfill → NOT NULL に変更
ALTER TABLE "video_instructors" ADD COLUMN "affiliation" VARCHAR(200);
ALTER TABLE "video_instructors" ADD COLUMN "name" VARCHAR(100);
ALTER TABLE "video_instructors" ALTER COLUMN "user_id" DROP NOT NULL;

-- 既存の VideoInstructor は userId が non-null のはずなので users.name から backfill
UPDATE "video_instructors" vi
SET "name" = u."name"
FROM "users" u
WHERE vi."user_id" = u."id" AND vi."name" IS NULL;

-- 念のため NULL が残ったら空文字で埋めてから NOT NULL
UPDATE "video_instructors" SET "name" = '' WHERE "name" IS NULL;
ALTER TABLE "video_instructors" ALTER COLUMN "name" SET NOT NULL;

-- AlterTable
ALTER TABLE "videos" ADD COLUMN "allowed_roles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "video_instructors_video_id_sort_order_idx" ON "video_instructors"("video_id", "sort_order");

-- AddForeignKey
ALTER TABLE "video_instructors" ADD CONSTRAINT "video_instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
