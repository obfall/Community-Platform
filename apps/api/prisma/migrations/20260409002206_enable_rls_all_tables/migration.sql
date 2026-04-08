-- Supabase の警告対応: Row-Level Security (RLS) を全テーブルで有効化
--
-- 目的:
--   anon key 経由の Supabase REST API でテーブルへ直接アクセスされるのを
--   防ぐため、public スキーマの全テーブルで RLS を有効化する。
--
-- 影響:
--   - NestJS API は DB 直接接続 (DATABASE_URL / DIRECT_URL) で動作するため
--     RLS をバイパスし、これまで通り読み書きできる。
--   - anon key 経由の直接アクセスはすべて拒否される (ポリシー未定義 = deny all)。
--
-- 注意:
--   このマイグレーションは現在存在する全テーブルに対して RLS を有効化する。
--   今後新しいテーブルを追加する場合は、そのテーブルのマイグレーションでも
--   ENABLE ROW LEVEL SECURITY を必ず追加すること。

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END
$$;
