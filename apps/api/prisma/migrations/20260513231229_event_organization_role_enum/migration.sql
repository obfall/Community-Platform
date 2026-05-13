-- event_organizations.role を VARCHAR(30) から EventOrganizationRole enum に変更する。
-- 既存データ（demo seed 由来の日本語値）は USING 句で enum 値にマッピングする。
-- 想定外の値は organizer に fallback。

-- 1) enum 型を作成
CREATE TYPE "EventOrganizationRole" AS ENUM (
  'organizer',
  'co_organizer',
  'cooperation',
  'sponsor',
  'support'
);

-- 2) 既存の role カラムを enum 型に変換
ALTER TABLE "event_organizations"
  ALTER COLUMN "role" TYPE "EventOrganizationRole"
  USING CASE "role"
    WHEN '主催'       THEN 'organizer'::"EventOrganizationRole"
    WHEN '共催'       THEN 'co_organizer'::"EventOrganizationRole"
    WHEN '協力'       THEN 'cooperation'::"EventOrganizationRole"
    WHEN '協賛'       THEN 'sponsor'::"EventOrganizationRole"
    WHEN 'スポンサー' THEN 'sponsor'::"EventOrganizationRole"
    WHEN '後援'       THEN 'support'::"EventOrganizationRole"
    ELSE 'organizer'::"EventOrganizationRole"
  END;
