-- ============================================================
-- Community Platform 統合 baseline
--
-- このマイグレーションは元々 30 個に分かれていたマイグレ履歴を
-- デプロイ前に squash した単一 baseline。
-- - Phase 1-10 の全テーブル定義 (3,184 行の DDL)
-- - pgroonga 拡張 + 15 個の全文検索インデックス
-- - 全 public テーブルへの ENABLE ROW LEVEL SECURITY
--
-- 統合元マイグレ一覧:
--   00_baseline + 28 個の追加マイグレ (詳細は git history を参照)
-- ============================================================

-- Phase 11.1: pgroonga 拡張を有効化
-- pgroonga = Groonga ベースの PostgreSQL 拡張。日本語形態素解析（MeCab）と
-- 関連度スコア・ハイライトに対応した全文検索を提供する。
CREATE EXTENSION IF NOT EXISTS pgroonga;

COMMENT ON EXTENSION pgroonga IS
  'Groonga based PostgreSQL extension for full-text search (Phase 11.1)';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'owner', 'member', 'visitor');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'withdrawn');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('google', 'apple');

-- CreateEnum
CREATE TYPE "LoginStatus" AS ENUM ('success', 'failure');

-- CreateEnum
CREATE TYPE "FeatureCategory" AS ENUM ('common', 'optional');

-- CreateEnum
CREATE TYPE "SettingValueType" AS ENUM ('string', 'integer', 'boolean', 'json');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('avatar', 'image', 'video', 'document', 'general');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "LanguageProficiency" AS ENUM ('beginner', 'intermediate', 'advanced', 'native');

-- CreateEnum
CREATE TYPE "PublicStatus" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('draft', 'published', 'unpublished');

-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('dm', 'group');

-- CreateEnum
CREATE TYPE "ChatRoomMemberRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('text', 'image', 'file');

-- CreateEnum
CREATE TYPE "BroadcastTargetType" AS ENUM ('all', 'rank', 'custom', 'event');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "BroadcastRecipientStatus" AS ENUM ('pending', 'sent', 'delivered', 'bounced', 'opened', 'clicked', 'failed');

-- CreateEnum
CREATE TYPE "BroadcastSuppressionReason" AS ENUM ('unsubscribe', 'bounce', 'complaint', 'manual');

-- CreateEnum
CREATE TYPE "BroadcastTemplateCategory" AS ENUM ('event', 'general');

-- CreateEnum
CREATE TYPE "BroadcastChannel" AS ENUM ('in_app', 'email', 'line');

-- CreateEnum
CREATE TYPE "BroadcastScope" AS ENUM ('global', 'event');

-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('text', 'number', 'date', 'select', 'multi_select');

-- CreateEnum
CREATE TYPE "EventLocationType" AS ENUM ('venue', 'online', 'hybrid');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'recruiting', 'closed', 'canceled', 'ended');

-- CreateEnum
CREATE TYPE "EventOrganizationRole" AS ENUM ('organizer', 'co_organizer', 'cooperation', 'sponsor', 'support');

-- CreateEnum
CREATE TYPE "EventSpeakerRole" AS ENUM ('speaker', 'co_speaker', 'guest', 'moderator', 'panelist');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('applied', 'canceled', 'attended', 'no_show');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'canceled');

-- CreateEnum
CREATE TYPE "form_field_visibility" AS ENUM ('hidden', 'optional', 'required');

-- CreateEnum
CREATE TYPE "application_question_type" AS ENUM ('text', 'textarea', 'radio', 'checkbox', 'select');

-- CreateEnum
CREATE TYPE "EventResultStatus" AS ENUM ('draft', 'completed');

-- CreateEnum
CREATE TYPE "event_execution_status" AS ENUM ('as_planned', 'modified', 'partially_held', 'postponed', 'canceled');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "ProjectMemberStatus" AS ENUM ('active', 'withdrawn', 'removed');

-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('cloudflare_stream', 'r2_hls');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('uploading', 'processing', 'ready', 'error');

-- CreateEnum
CREATE TYPE "VideoTaskStatus" AS ENUM ('not_started', 'in_progress', 'completed');

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

-- CreateEnum
CREATE TYPE "ProductSaleStatus" AS ENUM ('on_sale', 'sold_out');

-- CreateEnum
CREATE TYPE "ProductSellerType" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('in_progress', 'in_negotiation', 'completed', 'canceled');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'confirmed', 'canceled');

-- CreateEnum
CREATE TYPE "ScheduleSourceType" AS ENUM ('event', 'project_task', 'skill_booking');

-- CreateEnum
CREATE TYPE "ScheduleVisibility" AS ENUM ('private', 'public');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('board_post', 'board_comment', 'chat_message', 'product', 'skill_listing', 'user');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('spam', 'inappropriate', 'harassment', 'copyright', 'misinformation', 'other');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('content_hide', 'content_delete', 'user_warn', 'user_suspend', 'user_ban', 'report_dismiss');

-- CreateEnum
CREATE TYPE "BannedWordMatchType" AS ENUM ('exact', 'partial', 'regex');

-- CreateEnum
CREATE TYPE "BannedWordAction" AS ENUM ('flag', 'block', 'replace');

-- CreateEnum
CREATE TYPE "UserLibraryType" AS ENUM ('book', 'magazine', 'manga', 'paper', 'document', 'other');

-- CreateEnum
CREATE TYPE "UserLibraryStatus" AS ENUM ('unread', 'reading', 'completed', 'want', 'lending');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "rank_id" UUID,
    "available_points" INTEGER NOT NULL DEFAULT 0,
    "email_verified_at" TIMESTAMPTZ,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "joined_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "user_agent" TEXT,
    "status" "LoginStatus" NOT NULL,
    "failure_reason" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "device_info" VARCHAR(255),
    "ip_address" INET,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feature_key" VARCHAR(50) NOT NULL,
    "feature_name" VARCHAR(100) NOT NULL,
    "category" "FeatureCategory" NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "enabled_at" TIMESTAMPTZ,
    "disabled_at" TIMESTAMPTZ,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "feature_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_ranks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feature_key" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "allowed_roles" JSONB NOT NULL DEFAULT '["owner","admin"]',
    "required_rank_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "permission_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "value_type" "SettingValueType" NOT NULL DEFAULT 'string',
    "description" TEXT,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "scope" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon_url" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "allow_post_creation" BOOLEAN NOT NULL DEFAULT true,
    "required_rank_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "uploaded_by_user_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "storage_bucket" VARCHAR(100) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "file_category" "FileCategory" NOT NULL DEFAULT 'general',
    "image_width" INTEGER,
    "image_height" INTEGER,
    "thumbnail_storage_key" VARCHAR(500),
    "checksum_sha256" VARCHAR(64),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "public_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "avatar_url" VARCHAR(500),
    "phone" VARCHAR(20),
    "birthday" DATE,
    "member_card_barcode" VARCHAR(100),
    "name_kana" VARCHAR(100),
    "gender" "Gender",
    "occupation" VARCHAR(100),
    "country_of_origin" VARCHAR(100),
    "header_image_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_languages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "language_code" VARCHAR(10) NOT NULL,
    "proficiency" "LanguageProficiency",
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_affiliations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "organization_name" VARCHAR(200) NOT NULL,
    "title" VARCHAR(100),
    "role_description" VARCHAR(200),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_public_info" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "nickname" VARCHAR(100),
    "nickname_kana" VARCHAR(100),
    "specialty" VARCHAR(200),
    "prefecture" VARCHAR(50),
    "city" VARCHAR(100),
    "foreign_country" VARCHAR(100),
    "foreign_city" VARCHAR(100),
    "introduction" TEXT,
    "event_role" VARCHAR(50),
    "public_status" "PublicStatus" NOT NULL DEFAULT 'private',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_public_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "reference_type" VARCHAR(30),
    "reference_id" UUID,
    "actor_user_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "notification_type" VARCHAR(30) NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "line_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "allow_topic_creation" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "board_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "board_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_topic_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "board_topic_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_topic_post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "board_topic_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ChatRoomType" NOT NULL DEFAULT 'dm',
    "name" VARCHAR(100),
    "description" TEXT,
    "icon_url" VARCHAR(500),
    "created_by_user_id" UUID,
    "max_members" INTEGER,
    "last_message_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_room_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chat_room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ChatRoomMemberRole" NOT NULL DEFAULT 'member',
    "last_read_at" TIMESTAMPTZ,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chat_room_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "message_type" "ChatMessageType" NOT NULL DEFAULT 'text',
    "body" TEXT,
    "file_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject" VARCHAR(200) NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "scope" "BroadcastScope" NOT NULL DEFAULT 'global',
    "channels" "BroadcastChannel"[] DEFAULT ARRAY['email']::"BroadcastChannel"[],
    "target_type" "BroadcastTargetType" NOT NULL,
    "target_filter" JSONB,
    "template_id" UUID,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "line_sent_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "broadcast_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "BroadcastChannel" NOT NULL DEFAULT 'email',
    "email" VARCHAR(255) NOT NULL,
    "status" "BroadcastRecipientStatus" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMPTZ,
    "opened_at" TIMESTAMPTZ,
    "clicked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "broadcast_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcast_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_suppressions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "reason" "BroadcastSuppressionReason" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcast_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "category" "BroadcastTemplateCategory" NOT NULL,
    "subject_template" VARCHAR(200) NOT NULL,
    "body_html_template" TEXT NOT NULL,
    "body_text_template" TEXT,
    "available_variables" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "broadcast_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_attributes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "type" "AttributeType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_self_editable" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "location_type" "EventLocationType" NOT NULL DEFAULT 'venue',
    "venue_id" UUID,
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
    "event_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
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
    "tags_text" TEXT NOT NULL DEFAULT '',
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
    "ticket_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'applied',
    "payment_status" "PaymentStatus",
    "payment_method" VARCHAR(30),
    "discount_code_id" UUID,
    "applicant_email" VARCHAR(255) NOT NULL,
    "applicant_name" VARCHAR(100),
    "applicant_name_kana" VARCHAR(100),
    "applicant_affiliation" VARCHAR(200),
    "applicant_gender" "Gender",
    "applicant_age" INTEGER,
    "applicant_occupation" VARCHAR(100),
    "applicant_nationality" VARCHAR(100),
    "applied_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceled_at" TIMESTAMPTZ,
    "attended_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

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
    "reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "reminder_hours_before" INTEGER NOT NULL DEFAULT 24,
    "reminder_message" TEXT,
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

-- CreateTable
CREATE TABLE "event_speakers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "title" VARCHAR(100),
    "role" "EventSpeakerRole" NOT NULL,
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
    "role" "EventOrganizationRole" NOT NULL,
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
CREATE TABLE "event_board_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "allow_topic_creation" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "event_board_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_board_topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "event_board_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_board_topic_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "event_board_topic_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_board_topic_post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "event_board_topic_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_board_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_type" VARCHAR(30) NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_board_likes_pkey" PRIMARY KEY ("id")
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
    "updated_at" TIMESTAMPTZ NOT NULL,

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
    "execution_status" "event_execution_status" NOT NULL DEFAULT 'as_planned',
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

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "cover_image_url" VARCHAR(500),
    "category_id" UUID,
    "event_id" UUID,
    "start_date" DATE,
    "end_date" DATE,
    "status" "ProjectStatus" NOT NULL DEFAULT 'not_started',
    "tags_text" TEXT NOT NULL DEFAULT '',
    "invite_token" VARCHAR(100) NOT NULL,
    "invite_link_enabled" BOOLEAN NOT NULL DEFAULT false,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "activity_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'member',
    "status" "ProjectMemberStatus" NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ,
    "removed_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "last_reply_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_thread_replies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_thread_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_thread_reply_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reply_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_thread_reply_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_thread_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "thread_id" UUID,
    "reply_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_thread_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tags" (
    "project_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tags_pkey" PRIMARY KEY ("project_id","tag_id")
);

-- CreateTable
CREATE TABLE "project_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL DEFAULT 'file',
    "name" VARCHAR(200),
    "parent_folder_id" UUID,
    "file_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "VideoTaskStatus" NOT NULL DEFAULT 'not_started',
    "requested_date" DATE,
    "due_date" DATE,
    "notify_assignee" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_assignees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_task_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "location" VARCHAR(200),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "allow_topic_creation" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_board_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_board_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_topic_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_board_topic_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_topic_post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_board_topic_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_board_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_type" VARCHAR(30) NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_board_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_series" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "video_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "series_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "video_provider" "VideoProvider" NOT NULL,
    "video_external_id" VARCHAR(200) NOT NULL,
    "playback_url" VARCHAR(500),
    "stream_status" "StreamStatus" NOT NULL DEFAULT 'uploading',
    "thumbnail_url" VARCHAR(500),
    "duration_seconds" INTEGER,
    "available_until" TIMESTAMPTZ,
    "password_hash" VARCHAR(255),
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "watch_order" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_instructors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "affiliation" VARCHAR(200),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_instructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_watch_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "watched_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_seconds" INTEGER NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "last_position_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ,
    "last_watched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "video_watch_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "video_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_task_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_task_completions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "VideoTaskStatus" NOT NULL DEFAULT 'completed',
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "video_task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "resource_type" VARCHAR(30),
    "resource_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "login_frequency_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "post_frequency_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "event_participation_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "video_watch_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "engagement_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "snapshot_date" DATE NOT NULL,
    "total_members" INTEGER NOT NULL DEFAULT 0,
    "active_members" INTEGER NOT NULL DEFAULT 0,
    "new_members" INTEGER NOT NULL DEFAULT 0,
    "withdrawn_members" INTEGER NOT NULL DEFAULT 0,
    "total_posts" INTEGER NOT NULL DEFAULT 0,
    "total_comments" INTEGER NOT NULL DEFAULT 0,
    "total_events" INTEGER NOT NULL DEFAULT 0,
    "total_event_participants" INTEGER NOT NULL DEFAULT 0,
    "total_video_views" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_activity_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "last_login_at" TIMESTAMPTZ,
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "event_participation_count" INTEGER NOT NULL DEFAULT 0,
    "last_event_participated_at" TIMESTAMPTZ,
    "video_watch_count" INTEGER NOT NULL DEFAULT 0,
    "chat_message_count" INTEGER NOT NULL DEFAULT 0,
    "project_count" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_activity_summaries_pkey" PRIMARY KEY ("id")
);

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
    "notified_at" TIMESTAMPTZ,
    "reminded_at" TIMESTAMPTZ,
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

-- CreateTable
CREATE TABLE "shop_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "icon_image_url" VARCHAR(500),
    "header_image_url" VARCHAR(500),
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "auto_translate" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_series" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID,
    "series_id" UUID,
    "seller_user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "compare_at_price" INTEGER,
    "stock" INTEGER,
    "seller_type" "ProductSellerType" NOT NULL DEFAULT 'admin',
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "status" "ProductSaleStatus" NOT NULL DEFAULT 'on_sale',
    "sale_start_at" TIMESTAMPTZ,
    "sale_end_at" TIMESTAMPTZ,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buyer_user_id" UUID NOT NULL,
    "seller_user_id" UUID NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'in_progress',
    "notes" TEXT,
    "completed_at" TIMESTAMPTZ,
    "canceled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "cover_photo_url" VARCHAR(500),
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "photo_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "album_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "caption" VARCHAR(500),
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'published',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_tags" (
    "album_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_tags_pkey" PRIMARY KEY ("album_id","tag_id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "access_info" TEXT,
    "venue_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "capacity" INTEGER,
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "venue_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "venue_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "space_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_reservable" BOOLEAN NOT NULL DEFAULT true,
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "space_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "content_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "price" INTEGER,
    "cover_image_url" VARCHAR(500),
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "faq_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memo_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "memo_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "memos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memo_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "memo_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memo_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source_type" "ScheduleSourceType",
    "source_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "location" VARCHAR(300),
    "visibility" "ScheduleVisibility" NOT NULL DEFAULT 'private',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_user_id" UUID NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "assigned_to_user_id" UUID,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID,
    "moderator_user_id" UUID NOT NULL,
    "action_type" "ModerationActionType" NOT NULL,
    "target_type" VARCHAR(30) NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banned_words" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "word" VARCHAR(100) NOT NULL,
    "match_type" "BannedWordMatchType" NOT NULL DEFAULT 'exact',
    "action" "BannedWordAction" NOT NULL DEFAULT 'flag',
    "replacement" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "banned_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orientation_pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orientation_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orientation_completions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orientation_completions_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "social_accounts_user_id_idx" ON "social_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_provider_user_id_key" ON "social_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "login_histories_user_id_created_at_idx" ON "login_histories"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "feature_settings_feature_key_key" ON "feature_settings"("feature_key");

-- CreateIndex
CREATE INDEX "feature_settings_category_idx" ON "feature_settings"("category");

-- CreateIndex
CREATE INDEX "feature_settings_is_enabled_idx" ON "feature_settings"("is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "member_ranks_slug_key" ON "member_ranks"("slug");

-- CreateIndex
CREATE INDEX "member_ranks_sort_order_idx" ON "member_ranks"("sort_order");

-- CreateIndex
CREATE INDEX "permission_settings_feature_key_idx" ON "permission_settings"("feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "permission_settings_feature_key_action_key" ON "permission_settings"("feature_key", "action");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- CreateIndex
CREATE INDEX "categories_scope_sort_order_idx" ON "categories"("scope", "sort_order");

-- CreateIndex
CREATE INDEX "categories_required_rank_id_idx" ON "categories"("required_rank_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_scope_slug_key" ON "categories"("scope", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");

-- CreateIndex
CREATE INDEX "files_uploaded_by_user_id_idx" ON "files"("uploaded_by_user_id");

-- CreateIndex
CREATE INDEX "files_storage_key_idx" ON "files"("storage_key");

-- CreateIndex
CREATE INDEX "files_created_at_idx" ON "files"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_member_card_barcode_key" ON "user_profiles"("member_card_barcode");

-- CreateIndex
CREATE INDEX "user_interests_category_id_idx" ON "user_interests"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_interests_user_id_category_id_key" ON "user_interests"("user_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_languages_user_id_language_code_key" ON "user_languages"("user_id", "language_code");

-- CreateIndex
CREATE INDEX "user_affiliations_user_id_sort_order_idx" ON "user_affiliations"("user_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "user_public_info_user_id_key" ON "user_public_info"("user_id");

-- CreateIndex
CREATE INDEX "user_public_info_public_status_idx" ON "user_public_info"("public_status");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_notification_type_key" ON "notification_preferences"("user_id", "notification_type");

-- CreateIndex
CREATE INDEX "board_categories_sort_order_idx" ON "board_categories"("sort_order");

-- CreateIndex
CREATE INDEX "board_likes_target_type_target_id_idx" ON "board_likes"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_likes_user_id_target_type_target_id_key" ON "board_likes"("user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "board_topics_category_id_is_pinned_sort_order_created_at_idx" ON "board_topics"("category_id", "is_pinned" DESC, "sort_order", "created_at" DESC);

-- CreateIndex
CREATE INDEX "board_topics_author_user_id_idx" ON "board_topics"("author_user_id");

-- CreateIndex
CREATE INDEX "board_topic_posts_topic_id_created_at_idx" ON "board_topic_posts"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "board_topic_posts_author_user_id_idx" ON "board_topic_posts"("author_user_id");

-- CreateIndex
CREATE INDEX "board_topic_post_comments_post_id_created_at_idx" ON "board_topic_post_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "board_topic_post_comments_parent_comment_id_idx" ON "board_topic_post_comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "board_topic_post_comments_author_user_id_idx" ON "board_topic_post_comments"("author_user_id");

-- CreateIndex
CREATE INDEX "chat_rooms_last_message_at_idx" ON "chat_rooms"("last_message_at" DESC);

-- CreateIndex
CREATE INDEX "chat_rooms_type_idx" ON "chat_rooms"("type");

-- CreateIndex
CREATE INDEX "chat_room_members_user_id_idx" ON "chat_room_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_room_members_chat_room_id_user_id_key" ON "chat_room_members"("chat_room_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_messages_chat_room_id_created_at_idx" ON "chat_messages"("chat_room_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_sender_user_id_idx" ON "chat_messages"("sender_user_id");

-- CreateIndex
CREATE INDEX "broadcasts_status_created_at_idx" ON "broadcasts"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "broadcast_recipients_broadcast_id_status_idx" ON "broadcast_recipients"("broadcast_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_recipients_broadcast_id_user_id_channel_key" ON "broadcast_recipients"("broadcast_id", "user_id", "channel");

-- CreateIndex
CREATE INDEX "broadcast_attachments_broadcast_id_sort_order_idx" ON "broadcast_attachments"("broadcast_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_suppressions_email_key" ON "broadcast_suppressions"("email");

-- CreateIndex
CREATE INDEX "broadcast_templates_category_sort_order_idx" ON "broadcast_templates"("category", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "member_attributes_slug_key" ON "member_attributes"("slug");

-- CreateIndex
CREATE INDEX "member_attributes_sort_order_idx" ON "member_attributes"("sort_order");

-- CreateIndex
CREATE INDEX "member_attribute_values_attribute_id_idx" ON "member_attribute_values"("attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_attribute_values_user_id_attribute_id_key" ON "member_attribute_values"("user_id", "attribute_id");

-- CreateIndex
CREATE INDEX "events_status_start_at_idx" ON "events"("status", "start_at");

-- CreateIndex
CREATE INDEX "events_start_at_idx" ON "events"("start_at");

-- CreateIndex
CREATE INDEX "events_created_by_user_id_idx" ON "events"("created_by_user_id");

-- CreateIndex
CREATE INDEX "events_venue_id_idx" ON "events"("venue_id");

-- CreateIndex
CREATE INDEX "event_tickets_event_id_sort_order_idx" ON "event_tickets"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_participants_user_id_idx" ON "event_participants"("user_id");

-- CreateIndex
CREATE INDEX "event_participants_event_id_status_idx" ON "event_participants"("event_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_event_id_user_id_ticket_id_key" ON "event_participants"("event_id", "user_id", "ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_application_form_configs_event_id_key" ON "event_application_form_configs"("event_id");

-- CreateIndex
CREATE INDEX "event_application_questions_event_id_sort_order_idx" ON "event_application_questions"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_participant_answers_question_id_idx" ON "event_participant_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_participant_answers_participant_id_question_id_key" ON "event_participant_answers"("participant_id", "question_id");

-- CreateIndex
CREATE INDEX "event_speakers_event_id_sort_order_idx" ON "event_speakers"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_organizations_event_id_sort_order_idx" ON "event_organizations"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_tags_tag_id_idx" ON "event_tags"("tag_id");

-- CreateIndex
CREATE INDEX "event_board_categories_event_id_sort_order_idx" ON "event_board_categories"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_board_topics_event_id_category_id_is_pinned_sort_orde_idx" ON "event_board_topics"("event_id", "category_id", "is_pinned" DESC, "sort_order", "created_at" DESC);

-- CreateIndex
CREATE INDEX "event_board_topics_author_user_id_idx" ON "event_board_topics"("author_user_id");

-- CreateIndex
CREATE INDEX "event_board_topic_posts_topic_id_created_at_idx" ON "event_board_topic_posts"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "event_board_topic_posts_author_user_id_idx" ON "event_board_topic_posts"("author_user_id");

-- CreateIndex
CREATE INDEX "event_board_topic_post_comments_post_id_created_at_idx" ON "event_board_topic_post_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "event_board_topic_post_comments_parent_comment_id_idx" ON "event_board_topic_post_comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "event_board_topic_post_comments_author_user_id_idx" ON "event_board_topic_post_comments"("author_user_id");

-- CreateIndex
CREATE INDEX "event_board_likes_target_type_target_id_idx" ON "event_board_likes"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_board_likes_user_id_target_type_target_id_key" ON "event_board_likes"("user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "event_files_event_id_parent_folder_id_sort_order_idx" ON "event_files"("event_id", "parent_folder_id", "sort_order");

-- CreateIndex
CREATE INDEX "event_files_event_id_parent_folder_id_name_idx" ON "event_files"("event_id", "parent_folder_id", "name");

-- CreateIndex
CREATE INDEX "event_files_event_id_type_idx" ON "event_files"("event_id", "type");

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

-- CreateIndex
CREATE UNIQUE INDEX "projects_invite_token_key" ON "projects"("invite_token");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_created_by_user_id_idx" ON "projects"("created_by_user_id");

-- CreateIndex
CREATE INDEX "projects_event_id_idx" ON "projects"("event_id");

-- CreateIndex
CREATE INDEX "projects_category_id_idx" ON "projects"("category_id");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "project_threads_project_id_is_pinned_last_reply_at_idx" ON "project_threads"("project_id", "is_pinned" DESC, "last_reply_at" DESC);

-- CreateIndex
CREATE INDEX "project_thread_replies_thread_id_created_at_idx" ON "project_thread_replies"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "project_thread_reply_attachments_reply_id_sort_order_idx" ON "project_thread_reply_attachments"("reply_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_thread_likes_thread_id_idx" ON "project_thread_likes"("thread_id");

-- CreateIndex
CREATE INDEX "project_thread_likes_reply_id_idx" ON "project_thread_likes"("reply_id");

-- CreateIndex
CREATE INDEX "project_tags_tag_id_idx" ON "project_tags"("tag_id");

-- CreateIndex
CREATE INDEX "project_files_project_id_parent_folder_id_sort_order_idx" ON "project_files"("project_id", "parent_folder_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_files_project_id_parent_folder_id_name_idx" ON "project_files"("project_id", "parent_folder_id", "name");

-- CreateIndex
CREATE INDEX "project_files_project_id_type_idx" ON "project_files"("project_id", "type");

-- CreateIndex
CREATE INDEX "project_tasks_project_id_sort_order_idx" ON "project_tasks"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_task_assignees_user_id_idx" ON "project_task_assignees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_task_assignees_task_id_user_id_key" ON "project_task_assignees"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "project_task_attachments_task_id_sort_order_idx" ON "project_task_attachments"("task_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_schedules_project_id_start_at_idx" ON "project_schedules"("project_id", "start_at");

-- CreateIndex
CREATE INDEX "project_board_categories_project_id_sort_order_idx" ON "project_board_categories"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_board_topics_project_id_category_id_is_pinned_sort__idx" ON "project_board_topics"("project_id", "category_id", "is_pinned" DESC, "sort_order", "created_at" DESC);

-- CreateIndex
CREATE INDEX "project_board_topics_author_user_id_idx" ON "project_board_topics"("author_user_id");

-- CreateIndex
CREATE INDEX "project_board_topic_posts_topic_id_created_at_idx" ON "project_board_topic_posts"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "project_board_topic_posts_author_user_id_idx" ON "project_board_topic_posts"("author_user_id");

-- CreateIndex
CREATE INDEX "project_board_topic_post_comments_post_id_created_at_idx" ON "project_board_topic_post_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "project_board_topic_post_comments_parent_comment_id_idx" ON "project_board_topic_post_comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "project_board_topic_post_comments_author_user_id_idx" ON "project_board_topic_post_comments"("author_user_id");

-- CreateIndex
CREATE INDEX "project_board_likes_target_type_target_id_idx" ON "project_board_likes"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_board_likes_user_id_target_type_target_id_key" ON "project_board_likes"("user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "video_series_sort_order_idx" ON "video_series"("sort_order");

-- CreateIndex
CREATE INDEX "videos_publish_status_sort_order_idx" ON "videos"("publish_status", "sort_order");

-- CreateIndex
CREATE INDEX "videos_series_id_idx" ON "videos"("series_id");

-- CreateIndex
CREATE INDEX "videos_series_id_watch_order_idx" ON "videos"("series_id", "watch_order");

-- CreateIndex
CREATE INDEX "video_instructors_user_id_idx" ON "video_instructors"("user_id");

-- CreateIndex
CREATE INDEX "video_instructors_video_id_sort_order_idx" ON "video_instructors"("video_id", "sort_order");

-- CreateIndex
CREATE INDEX "video_attachments_video_id_sort_order_idx" ON "video_attachments"("video_id", "sort_order");

-- CreateIndex
CREATE INDEX "video_watch_progress_user_id_idx" ON "video_watch_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_watch_progress_video_id_user_id_key" ON "video_watch_progress"("video_id", "user_id");

-- CreateIndex
CREATE INDEX "video_tasks_video_id_sort_order_idx" ON "video_tasks"("video_id", "sort_order");

-- CreateIndex
CREATE INDEX "video_task_attachments_task_id_sort_order_idx" ON "video_task_attachments"("task_id", "sort_order");

-- CreateIndex
CREATE INDEX "video_task_completions_user_id_idx" ON "video_task_completions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_task_completions_video_task_id_user_id_key" ON "video_task_completions"("video_task_id", "user_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_action_created_at_idx" ON "activity_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "engagement_scores_user_id_key" ON "engagement_scores"("user_id");

-- CreateIndex
CREATE INDEX "engagement_scores_score_idx" ON "engagement_scores"("score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_snapshot_date_key" ON "analytics_snapshots"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "member_activity_summaries_user_id_key" ON "member_activity_summaries"("user_id");

-- CreateIndex
CREATE INDEX "member_activity_summaries_event_participation_count_idx" ON "member_activity_summaries"("event_participation_count" DESC);

-- CreateIndex
CREATE INDEX "member_activity_summaries_last_login_at_idx" ON "member_activity_summaries"("last_login_at" DESC);

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

-- CreateIndex
CREATE INDEX "skill_comments_skill_listing_id_created_at_idx" ON "skill_comments"("skill_listing_id", "created_at");

-- CreateIndex
CREATE INDEX "product_series_sort_order_idx" ON "product_series"("sort_order");

-- CreateIndex
CREATE INDEX "products_publish_status_status_created_at_idx" ON "products"("publish_status", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_series_id_idx" ON "products"("series_id");

-- CreateIndex
CREATE INDEX "products_seller_user_id_idx" ON "products"("seller_user_id");

-- CreateIndex
CREATE INDEX "product_images_product_id_sort_order_idx" ON "product_images"("product_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_buyer_user_id_created_at_idx" ON "orders"("buyer_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_seller_user_id_created_at_idx" ON "orders"("seller_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "albums_publish_status_sort_order_idx" ON "albums"("publish_status", "sort_order");

-- CreateIndex
CREATE INDEX "albums_category_id_idx" ON "albums"("category_id");

-- CreateIndex
CREATE INDEX "album_photos_album_id_publish_status_sort_order_idx" ON "album_photos"("album_id", "publish_status", "sort_order");

-- CreateIndex
CREATE INDEX "album_tags_tag_id_idx" ON "album_tags"("tag_id");

-- CreateIndex
CREATE INDEX "venues_publish_status_idx" ON "venues"("publish_status");

-- CreateIndex
CREATE INDEX "venue_images_venue_id_sort_order_idx" ON "venue_images"("venue_id", "sort_order");

-- CreateIndex
CREATE INDEX "spaces_venue_id_publish_status_sort_order_idx" ON "spaces"("venue_id", "publish_status", "sort_order");

-- CreateIndex
CREATE INDEX "reservations_space_id_start_at_end_at_idx" ON "reservations"("space_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "reservations_user_id_created_at_idx" ON "reservations"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "contents_publish_status_content_type_idx" ON "contents"("publish_status", "content_type");

-- CreateIndex
CREATE INDEX "faq_articles_category_sort_order_idx" ON "faq_articles"("category", "sort_order");

-- CreateIndex
CREATE INDEX "memo_categories_user_id_sort_order_idx" ON "memo_categories"("user_id", "sort_order");

-- CreateIndex
CREATE INDEX "memos_user_id_created_at_idx" ON "memos"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "memos_category_id_idx" ON "memos"("category_id");

-- CreateIndex
CREATE INDEX "memo_attachments_memo_id_sort_order_idx" ON "memo_attachments"("memo_id", "sort_order");

-- CreateIndex
CREATE INDEX "memo_attachments_file_id_idx" ON "memo_attachments"("file_id");

-- CreateIndex
CREATE INDEX "schedules_user_id_start_at_end_at_idx" ON "schedules"("user_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "schedules_source_type_idx" ON "schedules"("source_type");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_user_id_source_type_source_id_key" ON "schedules"("user_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "content_reports_status_created_at_idx" ON "content_reports"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "content_reports_target_type_target_id_idx" ON "content_reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_actions_report_id_idx" ON "moderation_actions"("report_id");

-- CreateIndex
CREATE INDEX "moderation_actions_target_type_target_id_created_at_idx" ON "moderation_actions"("target_type", "target_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orientation_pages_sort_order_idx" ON "orientation_pages"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "orientation_completions_user_id_key" ON "orientation_completions"("user_id");

-- CreateIndex
CREATE INDEX "user_library_items_user_id_created_at_idx" ON "user_library_items"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_rank_id_fkey" FOREIGN KEY ("rank_id") REFERENCES "member_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_histories" ADD CONSTRAINT "login_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_settings" ADD CONSTRAINT "feature_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_settings" ADD CONSTRAINT "permission_settings_feature_key_fkey" FOREIGN KEY ("feature_key") REFERENCES "feature_settings"("feature_key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_settings" ADD CONSTRAINT "permission_settings_required_rank_id_fkey" FOREIGN KEY ("required_rank_id") REFERENCES "member_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_required_rank_id_fkey" FOREIGN KEY ("required_rank_id") REFERENCES "member_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_affiliations" ADD CONSTRAINT "user_affiliations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_public_info" ADD CONSTRAINT "user_public_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_categories" ADD CONSTRAINT "board_categories_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_likes" ADD CONSTRAINT "board_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topics" ADD CONSTRAINT "board_topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "board_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topics" ADD CONSTRAINT "board_topics_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topic_posts" ADD CONSTRAINT "board_topic_posts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "board_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topic_posts" ADD CONSTRAINT "board_topic_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topic_post_comments" ADD CONSTRAINT "board_topic_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "board_topic_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topic_post_comments" ADD CONSTRAINT "board_topic_post_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_topic_post_comments" ADD CONSTRAINT "board_topic_post_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "board_topic_post_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_members" ADD CONSTRAINT "chat_room_members_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_members" ADD CONSTRAINT "chat_room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "broadcast_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_attachments" ADD CONSTRAINT "broadcast_attachments_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_attachments" ADD CONSTRAINT "broadcast_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_attribute_values" ADD CONSTRAINT "member_attribute_values_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_attribute_values" ADD CONSTRAINT "member_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "member_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_required_rank_id_fkey" FOREIGN KEY ("required_rank_id") REFERENCES "member_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tickets" ADD CONSTRAINT "event_tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "event_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_discount_code_id_fkey" FOREIGN KEY ("discount_code_id") REFERENCES "event_discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_application_form_configs" ADD CONSTRAINT "event_application_form_configs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_application_questions" ADD CONSTRAINT "event_application_questions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participant_answers" ADD CONSTRAINT "event_participant_answers_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "event_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participant_answers" ADD CONSTRAINT "event_participant_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "event_application_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "event_board_categories" ADD CONSTRAINT "event_board_categories_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_categories" ADD CONSTRAINT "event_board_categories_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topics" ADD CONSTRAINT "event_board_topics_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topics" ADD CONSTRAINT "event_board_topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "event_board_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topics" ADD CONSTRAINT "event_board_topics_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topic_posts" ADD CONSTRAINT "event_board_topic_posts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "event_board_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topic_posts" ADD CONSTRAINT "event_board_topic_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topic_post_comments" ADD CONSTRAINT "event_board_topic_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "event_board_topic_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topic_post_comments" ADD CONSTRAINT "event_board_topic_post_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_topic_post_comments" ADD CONSTRAINT "event_board_topic_post_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "event_board_topic_post_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_likes" ADD CONSTRAINT "event_board_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_threads" ADD CONSTRAINT "project_threads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_threads" ADD CONSTRAINT "project_threads_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_replies" ADD CONSTRAINT "project_thread_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "project_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_replies" ADD CONSTRAINT "project_thread_replies_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_reply_attachments" ADD CONSTRAINT "project_thread_reply_attachments_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "project_thread_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_reply_attachments" ADD CONSTRAINT "project_thread_reply_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_likes" ADD CONSTRAINT "project_thread_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_likes" ADD CONSTRAINT "project_thread_likes_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "project_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_thread_likes" ADD CONSTRAINT "project_thread_likes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "project_thread_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "project_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_assignees" ADD CONSTRAINT "project_task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_assignees" ADD CONSTRAINT "project_task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_attachments" ADD CONSTRAINT "project_task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_attachments" ADD CONSTRAINT "project_task_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_schedules" ADD CONSTRAINT "project_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_schedules" ADD CONSTRAINT "project_schedules_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_categories" ADD CONSTRAINT "project_board_categories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_categories" ADD CONSTRAINT "project_board_categories_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topics" ADD CONSTRAINT "project_board_topics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topics" ADD CONSTRAINT "project_board_topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "project_board_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topics" ADD CONSTRAINT "project_board_topics_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topic_posts" ADD CONSTRAINT "project_board_topic_posts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "project_board_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topic_posts" ADD CONSTRAINT "project_board_topic_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topic_post_comments" ADD CONSTRAINT "project_board_topic_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "project_board_topic_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topic_post_comments" ADD CONSTRAINT "project_board_topic_post_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_topic_post_comments" ADD CONSTRAINT "project_board_topic_post_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "project_board_topic_post_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_likes" ADD CONSTRAINT "project_board_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "video_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_instructors" ADD CONSTRAINT "video_instructors_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_instructors" ADD CONSTRAINT "video_instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_attachments" ADD CONSTRAINT "video_attachments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_attachments" ADD CONSTRAINT "video_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_watch_progress" ADD CONSTRAINT "video_watch_progress_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_watch_progress" ADD CONSTRAINT "video_watch_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_tasks" ADD CONSTRAINT "video_tasks_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_task_attachments" ADD CONSTRAINT "video_task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "video_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_task_attachments" ADD CONSTRAINT "video_task_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_task_completions" ADD CONSTRAINT "video_task_completions_video_task_id_fkey" FOREIGN KEY ("video_task_id") REFERENCES "video_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_task_completions" ADD CONSTRAINT "video_task_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_scores" ADD CONSTRAINT "engagement_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_activity_summaries" ADD CONSTRAINT "member_activity_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "skill_comments" ADD CONSTRAINT "skill_comments_skill_listing_id_fkey" FOREIGN KEY ("skill_listing_id") REFERENCES "skill_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_comments" ADD CONSTRAINT "skill_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_settings" ADD CONSTRAINT "shop_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "product_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_photos" ADD CONSTRAINT "album_photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_photos" ADD CONSTRAINT "album_photos_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_photos" ADD CONSTRAINT "album_photos_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_tags" ADD CONSTRAINT "album_tags_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_tags" ADD CONSTRAINT "album_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_images" ADD CONSTRAINT "venue_images_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_images" ADD CONSTRAINT "venue_images_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memo_categories" ADD CONSTRAINT "memo_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memos" ADD CONSTRAINT "memos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memos" ADD CONSTRAINT "memos_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "memo_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memo_attachments" ADD CONSTRAINT "memo_attachments_memo_id_fkey" FOREIGN KEY ("memo_id") REFERENCES "memos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memo_attachments" ADD CONSTRAINT "memo_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "content_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_user_id_fkey" FOREIGN KEY ("moderator_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orientation_completions" ADD CONSTRAINT "orientation_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_library_items" ADD CONSTRAINT "user_library_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_library_items" ADD CONSTRAINT "user_library_items_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================
-- Phase 11.1: pgroonga 全文検索インデックス（15 個）
-- ============================================================
-- 演算子クラスは pgroonga_text_full_text_search_ops_v2（デフォルト）。
-- 検索演算子は &@~（クエリ構文 + 形態素解析）を使用。
-- 配列カラムを対象にする場合は ARRAY[col1, col2, ...] でラップ。
--
-- 注: events/products/videos/projects/board_topics/surveys/skill_listings/
--    albums/venues/spaces/contents の partial index (WHERE deleted_at IS NULL)
--    は外してある（プランナーが通常 SELECT で誤って Index Scan する事故対策）。
--    users.idx_users_pgroonga は単一カラム index なので partial のままで問題ない。

-- イベント (title + tags_text + venue_name)
CREATE INDEX idx_events_pgroonga
  ON events USING pgroonga ((ARRAY[title, tags_text, venue_name]));

-- 商品
CREATE INDEX idx_products_pgroonga
  ON products USING pgroonga ((ARRAY[name, description]));

-- 動画
CREATE INDEX idx_videos_pgroonga
  ON videos USING pgroonga ((ARRAY[title, description]));

-- プロジェクト (name + description + tags_text)
CREATE INDEX idx_projects_pgroonga
  ON projects USING pgroonga ((ARRAY[name, description, tags_text]));

-- ユーザー（partial: deleted_at IS NULL）
CREATE INDEX idx_users_pgroonga
  ON users USING pgroonga (name)
  WHERE deleted_at IS NULL;

-- 掲示板 (title のみ、本文は対象外)
CREATE INDEX idx_board_topics_pgroonga
  ON board_topics USING pgroonga ((ARRAY[title]));

-- アンケート
CREATE INDEX idx_surveys_pgroonga
  ON surveys USING pgroonga ((ARRAY[title, description]));

-- スキル
CREATE INDEX idx_skill_listings_pgroonga
  ON skill_listings USING pgroonga ((ARRAY[title, description]));

-- アルバム
CREATE INDEX idx_albums_pgroonga
  ON albums USING pgroonga ((ARRAY[title, description]));

-- 会場
CREATE INDEX idx_venues_pgroonga
  ON venues USING pgroonga ((ARRAY[name, description, address, access_info]));

-- スペース
CREATE INDEX idx_spaces_pgroonga
  ON spaces USING pgroonga ((ARRAY[name, description]));

-- コンテンツ
CREATE INDEX idx_contents_pgroonga
  ON contents USING pgroonga ((ARRAY[name, description]));

-- FAQ（deleted_at 無し）
CREATE INDEX idx_faq_articles_pgroonga
  ON faq_articles USING pgroonga ((ARRAY[title, body]));

-- ユーザー公開情報（deleted_at 無し）
CREATE INDEX idx_user_public_info_pgroonga
  ON user_public_info USING pgroonga ((ARRAY[nickname, introduction, specialty, prefecture]));

-- ユーザー所属（deleted_at 無し）
CREATE INDEX idx_user_affiliations_pgroonga
  ON user_affiliations USING pgroonga ((ARRAY[organization_name, title, role_description]));

-- ============================================================
-- Row-Level Security: public スキーマの全テーブルで RLS 有効化
-- ============================================================
-- Supabase は anon key 経由で public スキーマのテーブルを REST 公開するため、
-- RLS が無効だと Security Advisor から警告を受ける。
-- NestJS API は postgres ロール直接接続で RLS をバイパスするので、
-- ポリシー未定義（deny all）で問題ない。
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END
$$;
