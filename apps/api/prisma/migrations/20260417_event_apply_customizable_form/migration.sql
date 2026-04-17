-- CreateEnum
CREATE TYPE "form_field_visibility" AS ENUM ('hidden', 'optional', 'required');

-- CreateEnum
CREATE TYPE "application_question_type" AS ENUM ('text', 'textarea', 'radio', 'checkbox', 'select');

-- 既存 NULL 行削除（dev 前提）
DELETE FROM "event_participants" WHERE "ticket_id" IS NULL;

-- AlterTable: ticketId 必須化
ALTER TABLE "event_participants" ALTER COLUMN "ticket_id" SET NOT NULL;

-- AlterTable: 基本属性スナップショット追加
ALTER TABLE "event_participants"
  ADD COLUMN "applicant_email" VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN "applicant_name" VARCHAR(100),
  ADD COLUMN "applicant_name_kana" VARCHAR(100),
  ADD COLUMN "applicant_affiliation" VARCHAR(200),
  ADD COLUMN "applicant_gender" "Gender",
  ADD COLUMN "applicant_age" INTEGER,
  ADD COLUMN "applicant_occupation" VARCHAR(100),
  ADD COLUMN "applicant_nationality" VARCHAR(100);

ALTER TABLE "event_participants" ALTER COLUMN "applicant_email" DROP DEFAULT;

-- CreateTable
CREATE TABLE "event_application_form_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "notify_on_capacity_reached" BOOLEAN NOT NULL DEFAULT false,
    "notify_on_remaining_threshold" INTEGER,
    "completion_message_app" TEXT,
    "completion_message_email" TEXT,
    "ask_name" "form_field_visibility" NOT NULL DEFAULT 'required',
    "ask_name_kana" "form_field_visibility" NOT NULL DEFAULT 'hidden',
    "ask_affiliation" "form_field_visibility" NOT NULL DEFAULT 'hidden',
    "ask_gender" "form_field_visibility" NOT NULL DEFAULT 'hidden',
    "ask_age" "form_field_visibility" NOT NULL DEFAULT 'hidden',
    "ask_occupation" "form_field_visibility" NOT NULL DEFAULT 'hidden',
    "ask_nationality" "form_field_visibility" NOT NULL DEFAULT 'hidden',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_application_form_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_application_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "question_type" "application_question_type" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_application_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participant_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "participant_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_participant_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_application_form_configs_event_id_key" ON "event_application_form_configs"("event_id");

-- CreateIndex
CREATE INDEX "event_application_questions_event_id_sort_order_idx" ON "event_application_questions"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_participant_answers_question_id_idx" ON "event_participant_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_participant_answers_participant_id_question_id_key" ON "event_participant_answers"("participant_id", "question_id");

-- AddForeignKey
ALTER TABLE "event_application_form_configs" ADD CONSTRAINT "event_application_form_configs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_application_questions" ADD CONSTRAINT "event_application_questions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participant_answers" ADD CONSTRAINT "event_participant_answers_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "event_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participant_answers" ADD CONSTRAINT "event_participant_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "event_application_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
