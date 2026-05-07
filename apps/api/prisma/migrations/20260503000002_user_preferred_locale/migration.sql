-- Phase 11.5-01: User.preferred_locale を追加
-- ユーザーごとの UI 表示言語を保存する。NULL のときは appSettings.defaultLocale にフォールバック。
-- 既存の UserLanguage テーブル（話せる言語プロファイル）とは別の関心事。

-- AlterTable
ALTER TABLE "users"
    ADD COLUMN "preferred_locale" VARCHAR(10);

-- AddForeignKey（言語リネーム時 CASCADE / 削除時 NULL 化）
ALTER TABLE "users"
    ADD CONSTRAINT "users_preferred_locale_fkey"
    FOREIGN KEY ("preferred_locale") REFERENCES "locales"("code")
    ON UPDATE CASCADE ON DELETE SET NULL;

-- CreateIndex（言語別ユーザー集計の高速化）
CREATE INDEX "idx_users_preferred_locale" ON "users"("preferred_locale");
