-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('text', 'number', 'date', 'select', 'multi_select');

-- CreateTable
CREATE TABLE "member_attributes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "type" "AttributeType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_attribute_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "attribute_id" UUID NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_attributes_slug_key" ON "member_attributes"("slug");

-- CreateIndex
CREATE INDEX "member_attributes_sort_order_idx" ON "member_attributes"("sort_order");

-- CreateIndex
CREATE INDEX "member_attribute_values_attribute_id_idx" ON "member_attribute_values"("attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_attribute_values_user_id_attribute_id_key" ON "member_attribute_values"("user_id", "attribute_id");

-- AddForeignKey
ALTER TABLE "member_attribute_values" ADD CONSTRAINT "member_attribute_values_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_attribute_values" ADD CONSTRAINT "member_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "member_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
