-- event_speakers.role を VARCHAR(30) から EventSpeakerRole enum に変更する。
-- 既存データ（demo seed 由来の日本語値）は USING 句で enum 値にマッピングする。
-- 想定外の値は speaker に fallback。

-- 1) enum 型を作成
CREATE TYPE "EventSpeakerRole" AS ENUM (
  'speaker',
  'co_speaker',
  'guest',
  'moderator',
  'panelist'
);

-- 2) 既存の role カラムを enum 型に変換
ALTER TABLE "event_speakers"
  ALTER COLUMN "role" TYPE "EventSpeakerRole"
  USING CASE "role"
    WHEN '講師'         THEN 'speaker'::"EventSpeakerRole"
    WHEN '共同講師'     THEN 'co_speaker'::"EventSpeakerRole"
    WHEN 'ゲスト'       THEN 'guest'::"EventSpeakerRole"
    WHEN '司会'         THEN 'moderator'::"EventSpeakerRole"
    WHEN 'モデレーター' THEN 'moderator'::"EventSpeakerRole"
    WHEN 'パネリスト'   THEN 'panelist'::"EventSpeakerRole"
    ELSE 'speaker'::"EventSpeakerRole"
  END;
