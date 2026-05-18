-- 招待リンク機能を廃止するため Content.inviteToken 列と unique index を削除する
DROP INDEX IF EXISTS "contents_invite_token_key";
ALTER TABLE "contents" DROP COLUMN IF EXISTS "invite_token";
