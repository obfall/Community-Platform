-- ParticipantStatus enum から `confirmed` を削除する。
-- PostgreSQL は enum 値の直接削除を許可しないため、新 enum を作成 → カラム置換 → 旧 enum 削除の手順を取る。
-- 既存の `confirmed` レコードは `applied`（申込済）に丸めて保存する。

-- 1. 既存の confirmed 行を applied に変換
UPDATE "event_participants" SET "status" = 'applied' WHERE "status" = 'confirmed';

-- 2. 新 enum を作成
CREATE TYPE "ParticipantStatus_new" AS ENUM ('applied', 'canceled', 'attended', 'no_show');

-- 3. カラムを新 enum 型に置換（DEFAULT 句を一旦外し、再設定）
ALTER TABLE "event_participants"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ParticipantStatus_new"
    USING ("status"::text::"ParticipantStatus_new"),
  ALTER COLUMN "status" SET DEFAULT 'applied';

-- 4. 旧 enum を削除し、新 enum をリネーム
DROP TYPE "ParticipantStatus";
ALTER TYPE "ParticipantStatus_new" RENAME TO "ParticipantStatus";
