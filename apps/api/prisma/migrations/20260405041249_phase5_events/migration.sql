-- CreateEnum
CREATE TYPE "EventLocationType" AS ENUM ('venue', 'online', 'hybrid');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'recruiting', 'closed', 'canceled', 'ended');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('applied', 'confirmed', 'canceled', 'attended', 'no_show');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'canceled');

-- CreateEnum
CREATE TYPE "EventResultStatus" AS ENUM ('draft', 'completed');

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "location_type" "EventLocationType" NOT NULL DEFAULT 'venue',
    "venue_name" VARCHAR(300),
    "venue_address" VARCHAR(500),
    "online_url" VARCHAR(500),
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "registration_deadline_at" TIMESTAMPTZ,
    "ticket_sale_start_at" TIMESTAMPTZ,
    "allow_multi_ticket_purchase" BOOLEAN NOT NULL DEFAULT false,
    "accepted_payment_methods" JSONB,
    "planning_role" VARCHAR(30) NOT NULL DEFAULT '主催',
    "event_type" VARCHAR(30),
    "category_id" UUID,
    "access_info" TEXT,
    "participation_method" TEXT,
    "contact_info" TEXT,
    "cancellation_policy" TEXT,
    "language" VARCHAR(20) DEFAULT 'ja',
    "is_attendee_visible" BOOLEAN NOT NULL DEFAULT false,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "cover_image_url" VARCHAR(500),
    "created_by_user_id" UUID NOT NULL,
    "required_rank_id" UUID,
    "participant_count" INTEGER NOT NULL DEFAULT 0,
    "is_calendar_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "ticket_name" VARCHAR(100) NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'JPY',
    "capacity" INTEGER,
    "purchase_limit" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ticket_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'applied',
    "payment_status" "PaymentStatus",
    "payment_method" VARCHAR(30),
    "discount_code_id" UUID,
    "applied_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_speakers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "title" VARCHAR(100),
    "role" VARCHAR(30) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "organization_name" VARCHAR(200) NOT NULL,
    "role" VARCHAR(30) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_tags" (
    "event_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "event_tags_pkey" PRIMARY KEY ("event_id","tag_id")
);

-- CreateTable
CREATE TABLE "event_board_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "event_board_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_board_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "event_board_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL DEFAULT 'file',
    "name" VARCHAR(200),
    "parent_folder_id" UUID,
    "file_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "attendance_count" INTEGER NOT NULL DEFAULT 0,
    "attendance_rate" DECIMAL(5,2),
    "achievement_notes" TEXT,
    "summary" TEXT,
    "improvement_notes" TEXT,
    "status" "EventResultStatus" NOT NULL DEFAULT 'draft',
    "publish_status" "PublicStatus" NOT NULL DEFAULT 'private',
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_result_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_result_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_result_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_discount_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "discounted_price" INTEGER NOT NULL,
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_status_start_at_idx" ON "events"("status", "start_at");

-- CreateIndex
CREATE INDEX "events_start_at_idx" ON "events"("start_at");

-- CreateIndex
CREATE INDEX "events_created_by_user_id_idx" ON "events"("created_by_user_id");

-- CreateIndex
CREATE INDEX "events_category_id_idx" ON "events"("category_id");

-- CreateIndex
CREATE INDEX "event_tickets_event_id_sort_order_idx" ON "event_tickets"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_participants_user_id_idx" ON "event_participants"("user_id");

-- CreateIndex
CREATE INDEX "event_participants_event_id_status_idx" ON "event_participants"("event_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_event_id_user_id_ticket_id_key" ON "event_participants"("event_id", "user_id", "ticket_id");

-- CreateIndex
CREATE INDEX "event_speakers_event_id_sort_order_idx" ON "event_speakers"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_organizations_event_id_sort_order_idx" ON "event_organizations"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_tags_tag_id_idx" ON "event_tags"("tag_id");

-- CreateIndex
CREATE INDEX "event_board_posts_event_id_created_at_idx" ON "event_board_posts"("event_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "event_board_comments_post_id_created_at_idx" ON "event_board_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "event_files_event_id_parent_folder_id_sort_order_idx" ON "event_files"("event_id", "parent_folder_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "event_results_event_id_key" ON "event_results"("event_id");

-- CreateIndex
CREATE INDEX "event_results_publish_status_idx" ON "event_results"("publish_status");

-- CreateIndex
CREATE INDEX "event_result_attachments_event_result_id_sort_order_idx" ON "event_result_attachments"("event_result_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_discount_codes_code_idx" ON "event_discount_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "event_discount_codes_ticket_id_code_key" ON "event_discount_codes"("ticket_id", "code");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_required_rank_id_fkey" FOREIGN KEY ("required_rank_id") REFERENCES "member_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tickets" ADD CONSTRAINT "event_tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "event_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "event_discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_speakers" ADD CONSTRAINT "event_speakers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_speakers" ADD CONSTRAINT "event_speakers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_organizations" ADD CONSTRAINT "event_organizations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_posts" ADD CONSTRAINT "event_board_posts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_posts" ADD CONSTRAINT "event_board_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_comments" ADD CONSTRAINT "event_board_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "event_board_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_comments" ADD CONSTRAINT "event_board_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_files" ADD CONSTRAINT "event_files_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_files" ADD CONSTRAINT "event_files_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "event_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_files" ADD CONSTRAINT "event_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_files" ADD CONSTRAINT "event_files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_results" ADD CONSTRAINT "event_results_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_results" ADD CONSTRAINT "event_results_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_result_attachments" ADD CONSTRAINT "event_result_attachments_event_result_id_fkey" FOREIGN KEY ("event_result_id") REFERENCES "event_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_result_attachments" ADD CONSTRAINT "event_result_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_discount_codes" ADD CONSTRAINT "event_discount_codes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "event_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
