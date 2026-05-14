-- event_type (String?) を eventTypes (String[]) に置き換える。
-- pre-production のため既存データは破棄し、空配列で再初期化する。

ALTER TABLE "events" DROP COLUMN "event_type";
ALTER TABLE "events" ADD COLUMN "event_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
