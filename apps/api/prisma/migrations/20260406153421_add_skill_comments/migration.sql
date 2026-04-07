-- CreateTable
CREATE TABLE "skill_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "skill_listing_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "skill_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skill_comments_skill_listing_id_created_at_idx" ON "skill_comments"("skill_listing_id", "created_at");

-- AddForeignKey
ALTER TABLE "skill_comments" ADD CONSTRAINT "skill_comments_skill_listing_id_fkey" FOREIGN KEY ("skill_listing_id") REFERENCES "skill_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_comments" ADD CONSTRAINT "skill_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
