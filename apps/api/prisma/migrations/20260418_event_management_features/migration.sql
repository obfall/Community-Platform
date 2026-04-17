-- EventParticipant: チェックイン用の出席日時カラムを追加
ALTER TABLE "event_participants" ADD COLUMN "attended_at" TIMESTAMPTZ;

-- EventApplicationFormConfig: リマインダー設定カラムを追加
ALTER TABLE "event_application_form_configs" ADD COLUMN "reminder_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_application_form_configs" ADD COLUMN "reminder_hours_before" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "event_application_form_configs" ADD COLUMN "reminder_message" TEXT;
