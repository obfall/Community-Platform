/*
  Warnings:

  - The values [moderator] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserLibraryType" AS ENUM ('book', 'magazine', 'manga', 'paper', 'document', 'other');

-- CreateEnum
CREATE TYPE "UserLibraryStatus" AS ENUM ('unread', 'reading', 'completed', 'want', 'lending');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('admin', 'owner', 'member', 'visitor');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'member';
COMMIT;

-- CreateTable
CREATE TABLE "user_library_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "UserLibraryType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT,
    "author" VARCHAR(200),
    "published_at" DATE,
    "page_count" INTEGER,
    "impression" TEXT,
    "status" "UserLibraryStatus" NOT NULL DEFAULT 'unread',
    "file_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_library_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_library_items_user_id_created_at_idx" ON "user_library_items"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "user_library_items" ADD CONSTRAINT "user_library_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_library_items" ADD CONSTRAINT "user_library_items_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
