CREATE TABLE "project_schedules" (
  "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
  "project_id"        UUID         NOT NULL,
  "title"             VARCHAR(200) NOT NULL,
  "description"       TEXT,
  "start_at"          TIMESTAMPTZ  NOT NULL,
  "end_at"            TIMESTAMPTZ  NOT NULL,
  "is_all_day"        BOOLEAN      NOT NULL DEFAULT false,
  "location"          VARCHAR(200),
  "created_by_user_id" UUID        NOT NULL,
  "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_schedules_project_id_start_at_idx" ON "project_schedules"("project_id", "start_at");

ALTER TABLE "project_schedules"
  ADD CONSTRAINT "project_schedules_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_schedules"
  ADD CONSTRAINT "project_schedules_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_schedules" ENABLE ROW LEVEL SECURITY;
