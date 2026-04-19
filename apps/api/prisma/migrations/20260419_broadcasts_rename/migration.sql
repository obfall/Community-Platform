-- Broadcasts rename: MailMessage 系を Broadcast 系に統合、チャネル概念を追加

-- 1. Enum types rename
ALTER TYPE "MailTargetType" RENAME TO "BroadcastTargetType";
ALTER TYPE "MailStatus" RENAME TO "BroadcastStatus";
ALTER TYPE "MailRecipientStatus" RENAME TO "BroadcastRecipientStatus";
ALTER TYPE "MailSuppressionReason" RENAME TO "BroadcastSuppressionReason";
ALTER TYPE "MailTemplateCategory" RENAME TO "BroadcastTemplateCategory";

-- 2. New enum types
CREATE TYPE "BroadcastChannel" AS ENUM ('in_app', 'email', 'line');
CREATE TYPE "BroadcastScope" AS ENUM ('global', 'event');

-- 3. Table rename
ALTER TABLE "mail_messages" RENAME TO "broadcasts";
ALTER TABLE "mail_message_recipients" RENAME TO "broadcast_recipients";
ALTER TABLE "mail_message_attachments" RENAME TO "broadcast_attachments";
ALTER TABLE "mail_suppressions" RENAME TO "broadcast_suppressions";
ALTER TABLE "mail_templates" RENAME TO "broadcast_templates";

-- 4. Primary key rename
ALTER INDEX "mail_messages_pkey" RENAME TO "broadcasts_pkey";
ALTER INDEX "mail_message_recipients_pkey" RENAME TO "broadcast_recipients_pkey";
ALTER INDEX "mail_message_attachments_pkey" RENAME TO "broadcast_attachments_pkey";
ALTER INDEX "mail_suppressions_pkey" RENAME TO "broadcast_suppressions_pkey";
ALTER INDEX "mail_templates_pkey" RENAME TO "broadcast_templates_pkey";

-- 5. Column rename (message_id → broadcast_id)
ALTER TABLE "broadcast_recipients" RENAME COLUMN "message_id" TO "broadcast_id";
ALTER TABLE "broadcast_attachments" RENAME COLUMN "message_id" TO "broadcast_id";

-- 6. Index rename
ALTER INDEX "mail_messages_status_created_at_idx" RENAME TO "broadcasts_status_created_at_idx";
ALTER INDEX "mail_message_recipients_message_id_status_idx" RENAME TO "broadcast_recipients_broadcast_id_status_idx";
ALTER INDEX "mail_message_attachments_message_id_sort_order_idx" RENAME TO "broadcast_attachments_broadcast_id_sort_order_idx";
ALTER INDEX "mail_templates_category_sort_order_idx" RENAME TO "broadcast_templates_category_sort_order_idx";
ALTER INDEX "mail_suppressions_email_key" RENAME TO "broadcast_suppressions_email_key";

-- 7. Drop old unique index（constraint ではなく unique index で作成されていた）
DROP INDEX IF EXISTS "mail_message_recipients_message_id_user_id_key";

-- 8. Foreign key constraint rename
ALTER TABLE "broadcasts" RENAME CONSTRAINT "mail_messages_created_by_user_id_fkey" TO "broadcasts_created_by_user_id_fkey";
ALTER TABLE "broadcasts" RENAME CONSTRAINT "mail_messages_template_id_fkey" TO "broadcasts_template_id_fkey";
ALTER TABLE "broadcast_recipients" RENAME CONSTRAINT "mail_message_recipients_message_id_fkey" TO "broadcast_recipients_broadcast_id_fkey";
ALTER TABLE "broadcast_recipients" RENAME CONSTRAINT "mail_message_recipients_user_id_fkey" TO "broadcast_recipients_user_id_fkey";
ALTER TABLE "broadcast_attachments" RENAME CONSTRAINT "mail_message_attachments_message_id_fkey" TO "broadcast_attachments_broadcast_id_fkey";
ALTER TABLE "broadcast_attachments" RENAME CONSTRAINT "mail_message_attachments_file_id_fkey" TO "broadcast_attachments_file_id_fkey";

-- 9. New columns (channels / scope / per-recipient channel)
ALTER TABLE "broadcasts" ADD COLUMN "channels" "BroadcastChannel"[] NOT NULL DEFAULT ARRAY['email']::"BroadcastChannel"[];
ALTER TABLE "broadcasts" ADD COLUMN "scope" "BroadcastScope" NOT NULL DEFAULT 'global';
ALTER TABLE "broadcast_recipients" ADD COLUMN "channel" "BroadcastChannel" NOT NULL DEFAULT 'email';

-- 10. New unique index（broadcast × user × channel の一意性、元の Prisma スタイルに合わせる）
CREATE UNIQUE INDEX "broadcast_recipients_broadcast_id_user_id_channel_key" ON "broadcast_recipients"("broadcast_id", "user_id", "channel");

-- 11. Row Level Security（rename に追従）
--     既存の RLS は table 単位で設定済（enable_rls_all_tables）。
--     テーブル rename でポリシー名も追従するため追加設定は不要。
