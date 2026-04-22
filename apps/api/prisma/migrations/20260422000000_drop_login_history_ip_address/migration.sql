-- ログイン履歴から ip_address カラムを削除
-- 前段プロキシ（Railway LB 等）経由で trust proxy 未設定のため実用価値がなく、監査画面にも出さない方針に変更
ALTER TABLE "login_histories" DROP COLUMN "ip_address";
