-- AlterTable: EventFile に updated_at カラムを追加
ALTER TABLE "event_files" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

-- AlterTable: ProjectFile に updated_at カラムを追加
ALTER TABLE "project_files" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

-- CreateIndex
CREATE INDEX "event_files_event_id_parent_folder_id_name_idx" ON "event_files"("event_id", "parent_folder_id", "name");

-- CreateIndex
CREATE INDEX "event_files_event_id_type_idx" ON "event_files"("event_id", "type");

-- CreateIndex
CREATE INDEX "project_files_project_id_parent_folder_id_name_idx" ON "project_files"("project_id", "parent_folder_id", "name");

-- CreateIndex
CREATE INDEX "project_files_project_id_type_idx" ON "project_files"("project_id", "type");
