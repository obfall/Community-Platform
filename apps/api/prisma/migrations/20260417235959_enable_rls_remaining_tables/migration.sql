-- Supabase Security Advisor 対応: RLS 未有効テーブルをまとめて有効化
--
-- 背景:
--   20260409002206_enable_rls_all_tables では _prisma_migrations を除外し、
--   その後追加された以下のテーブルにも RLS が設定されていなかったため、
--   Supabase Security Advisor から勧告を受けた。
--
-- 対象テーブル:
--   - _prisma_migrations            (Prisma 内部のマイグレーション履歴)
--   - user_library_items            (20260412062906_add_user_library で追加)
--   - event_application_form_configs   (20260417_event_apply_customizable_form で追加)
--   - event_application_questions      (同上)
--   - event_participant_answers        (同上)
--
-- 影響:
--   - NestJS API / Prisma CLI は DB 直接接続 (DATABASE_URL / DIRECT_URL) で動作するため
--     RLS をバイパスし、これまで通り読み書きできる (postgres ロールは BYPASSRLS)。
--   - anon key 経由の Supabase REST API からの直接アクセスはすべて拒否される
--     (ポリシー未定義 = deny all)。

-- _prisma_migrations は Prisma のシャドウDB検証時には未作成の場合があるため
-- 条件付きで有効化する。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

ALTER TABLE public.user_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_application_form_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_application_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participant_answers ENABLE ROW LEVEL SECURITY;
