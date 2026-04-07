-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('admin_grant', 'rule_grant', 'utilization', 'event_grant', 'expiry', 'admin_adjust');

-- CreateEnum
CREATE TYPE "PointTriggerEvent" AS ENUM ('event_attendance', 'product_purchase', 'daily_login', 'board_post', 'survey_complete', 'video_complete', 'orientation_complete');

-- CreateEnum
CREATE TYPE "SkillFormat" AS ENUM ('online', 'offline', 'both');

-- CreateEnum
CREATE TYPE "SkillListingStatus" AS ENUM ('draft', 'active', 'inactive');

-- CreateEnum
CREATE TYPE "SkillBookingStatus" AS ENUM ('requested', 'approved', 'rejected', 'completed', 'canceled');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('draft', 'active', 'closed');

-- CreateEnum
CREATE TYPE "SurveyTargetType" AS ENUM ('all', 'rank', 'custom');

-- CreateEnum
CREATE TYPE "SurveyQuestionType" AS ENUM ('single_choice', 'multi_choice', 'text', 'rating', 'number');

-- CreateTable
CREATE TABLE "point_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "total_granted" INTEGER NOT NULL DEFAULT 0,
    "total_utilized" INTEGER NOT NULL DEFAULT 0,
    "total_expired" INTEGER NOT NULL DEFAULT 0,
    "available_points" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "point_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "type" "PointTransactionType" NOT NULL,
    "reference_type" VARCHAR(30),
    "reference_id" UUID,
    "description" VARCHAR(200),
    "remaining_points" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ,
    "granted_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "trigger_event" "PointTriggerEvent" NOT NULL,
    "point_amount" INTEGER NOT NULL,
    "expiry_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "point_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "event_id" UUID,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "template_id" UUID,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "SurveyStatus" NOT NULL DEFAULT 'draft',
    "target_type" "SurveyTargetType" NOT NULL DEFAULT 'all',
    "target_filter" JSONB,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "response_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "survey_id" UUID NOT NULL,
    "question_type" "SurveyQuestionType" NOT NULL,
    "question_text" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "min_value" INTEGER,
    "max_value" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "survey_id" UUID NOT NULL,
    "respondent_user_id" UUID,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "response_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_options" JSONB,
    "text_value" TEXT,
    "numeric_value" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_listings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID,
    "provider_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "format" "SkillFormat" NOT NULL DEFAULT 'online',
    "status" "SkillListingStatus" NOT NULL DEFAULT 'active',
    "booking_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "skill_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "skill_listing_id" UUID NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "provider_user_id" UUID NOT NULL,
    "status" "SkillBookingStatus" NOT NULL DEFAULT 'requested',
    "scheduled_at" TIMESTAMPTZ,
    "message" TEXT,
    "completed_at" TIMESTAMPTZ,
    "canceled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "skill_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "point_summaries_user_id_key" ON "point_summaries"("user_id");

-- CreateIndex
CREATE INDEX "point_histories_user_id_created_at_idx" ON "point_histories"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "point_histories_expires_at_idx" ON "point_histories"("expires_at");

-- CreateIndex
CREATE INDEX "point_rules_trigger_event_idx" ON "point_rules"("trigger_event");

-- CreateIndex
CREATE INDEX "surveys_status_idx" ON "surveys"("status");

-- CreateIndex
CREATE INDEX "survey_questions_survey_id_sort_order_idx" ON "survey_questions"("survey_id", "sort_order");

-- CreateIndex
CREATE INDEX "survey_responses_survey_id_idx" ON "survey_responses"("survey_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_survey_id_respondent_user_id_key" ON "survey_responses"("survey_id", "respondent_user_id");

-- CreateIndex
CREATE INDEX "survey_answers_response_id_idx" ON "survey_answers"("response_id");

-- CreateIndex
CREATE INDEX "survey_answers_question_id_idx" ON "survey_answers"("question_id");

-- CreateIndex
CREATE INDEX "skill_listings_status_created_at_idx" ON "skill_listings"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "skill_listings_category_id_idx" ON "skill_listings"("category_id");

-- CreateIndex
CREATE INDEX "skill_listings_provider_user_id_idx" ON "skill_listings"("provider_user_id");

-- CreateIndex
CREATE INDEX "skill_bookings_skill_listing_id_status_idx" ON "skill_bookings"("skill_listing_id", "status");

-- CreateIndex
CREATE INDEX "skill_bookings_requester_user_id_idx" ON "skill_bookings"("requester_user_id");

-- CreateIndex
CREATE INDEX "skill_bookings_provider_user_id_idx" ON "skill_bookings"("provider_user_id");

-- CreateIndex
CREATE INDEX "skill_messages_booking_id_created_at_idx" ON "skill_messages"("booking_id", "created_at");

-- AddForeignKey
ALTER TABLE "point_summaries" ADD CONSTRAINT "point_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "surveys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_respondent_user_id_fkey" FOREIGN KEY ("respondent_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_listings" ADD CONSTRAINT "skill_listings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_listings" ADD CONSTRAINT "skill_listings_provider_user_id_fkey" FOREIGN KEY ("provider_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_bookings" ADD CONSTRAINT "skill_bookings_skill_listing_id_fkey" FOREIGN KEY ("skill_listing_id") REFERENCES "skill_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_bookings" ADD CONSTRAINT "skill_bookings_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_bookings" ADD CONSTRAINT "skill_bookings_provider_user_id_fkey" FOREIGN KEY ("provider_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_messages" ADD CONSTRAINT "skill_messages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "skill_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_messages" ADD CONSTRAINT "skill_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
