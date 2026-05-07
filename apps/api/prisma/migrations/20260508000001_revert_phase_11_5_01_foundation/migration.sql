-- Phase 11.5-01 で導入した locales / preferred_locale / i18n.* 設定を撤回する。
-- MVP では多言語対応をやらない方針に切り替えたため、未使用テーブル・カラムを除去する。
-- CLAUDE.md「既存マイグレーションを編集しない」原則に従い、新マイグレーションで逆 SQL を書く。

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_preferred_locale_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_users_preferred_locale";

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "preferred_locale";

-- DropTable
DROP TABLE IF EXISTS "locales";

-- Delete app_settings rows added in Phase 11.5-01
DELETE FROM "app_settings" WHERE "key" IN ('i18n.fallbackLocale', 'i18n.enabledLocales');
