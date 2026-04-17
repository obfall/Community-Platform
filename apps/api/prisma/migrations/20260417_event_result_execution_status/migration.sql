-- CreateEnum (冪等)
DO $$ BEGIN
  CREATE TYPE "event_execution_status" AS ENUM ('as_planned', 'modified', 'partially_held', 'postponed', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable (冪等)
ALTER TABLE "event_results"
  ADD COLUMN IF NOT EXISTS "execution_status" "event_execution_status" NOT NULL DEFAULT 'as_planned';
