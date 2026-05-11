-- UserProfile.bio を削除
-- introduction（UserPublicInfo）と用途が重複し、編集 UI も無いデッドフィールドのため削除する。
-- 全文検索で必要だった bio 単独 pgroonga インデックスも合わせて削除。

DROP INDEX IF EXISTS "idx_user_profiles_pgroonga";

ALTER TABLE "user_profiles" DROP COLUMN "bio";
