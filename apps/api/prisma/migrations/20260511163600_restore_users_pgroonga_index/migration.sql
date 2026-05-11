-- 1 個前の自動生成マイグレーション(20260511163521_drop_user_profile_bio)が
-- pgroonga インデックス idx_users_pgroonga を誤って削除したため復元する。
-- pgroonga インデックスは schema.prisma で管理できないため、Prisma の drift 検知が
-- 「DB にだけ存在する index」として誤認してしまった。

CREATE INDEX IF NOT EXISTS "idx_users_pgroonga"
  ON "users"
  USING pgroonga (name)
  WHERE deleted_at IS NULL;
