import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { StorageService } from "./storage/storage.service";
import { FileManagerCoreService } from "./core/file-manager-core.service";
import { ProjectFilesController } from "./project-files.controller";
import { ProjectFilesService } from "./project-files.service";
import { EventFilesController } from "./event-files.controller";
import { EventFilesService } from "./event-files.service";

@Module({
  controllers: [FilesController, ProjectFilesController, EventFilesController],
  providers: [
    FilesService,
    StorageService,
    FileManagerCoreService,
    ProjectFilesService,
    EventFilesService,
  ],
  exports: [FilesService, StorageService, FileManagerCoreService],
})
export class FilesModule {}
