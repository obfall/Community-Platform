-- AlterTable: Survey に通知管理フィールドを追加
ALTER TABLE "surveys" ADD COLUMN "notified_at" TIMESTAMPTZ;
ALTER TABLE "surveys" ADD COLUMN "reminded_at" TIMESTAMPTZ;
