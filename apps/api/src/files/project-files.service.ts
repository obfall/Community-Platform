import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { FileManagerCoreService } from "./core/file-manager-core.service";
import { PROJECT_FILE_SCOPE } from "./core/file-manager-scope.config";
import type { CreateFolderDto } from "./dto/create-folder.dto";
import type { RegisterFileDto } from "./dto/register-file.dto";
import type { RenameDto } from "./dto/rename.dto";
import type { MoveDto } from "./dto/move.dto";
import type { ReorderDto } from "./dto/reorder.dto";
import type { ListFilesQueryDto } from "./dto/list-files-query.dto";

@Injectable()
export class ProjectFilesService {
  constructor(
    private readonly core: FileManagerCoreService,
    private readonly prisma: PrismaService,
  ) {}

  async ensureMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member || member.status !== "active") {
      // プロジェクト作成者もチェック
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { createdByUserId: true },
      });
      if (project?.createdByUserId !== userId) {
        // admin / owner もチェック
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });
        if (user?.role !== "owner" && user?.role !== "admin") {
          throw new ForbiddenException("このプロジェクトにアクセスする権限がありません");
        }
      }
    }
  }

  list(projectId: string, query: ListFilesQueryDto) {
    return this.core.list(PROJECT_FILE_SCOPE, projectId, {
      folderId: query.folderId,
      search: query.q,
      sort: query.sort ?? "name",
      order: query.order ?? "asc",
    });
  }

  getFolder(projectId: string, folderId: string) {
    return this.core.getFolder(PROJECT_FILE_SCOPE, projectId, folderId);
  }

  createFolder(projectId: string, userId: string, dto: CreateFolderDto) {
    return this.core.createFolder(PROJECT_FILE_SCOPE, projectId, userId, dto);
  }

  registerFile(projectId: string, userId: string, dto: RegisterFileDto) {
    return this.core.registerFile(PROJECT_FILE_SCOPE, projectId, userId, dto);
  }

  rename(projectId: string, id: string, dto: RenameDto) {
    return this.core.rename(PROJECT_FILE_SCOPE, projectId, id, dto.name);
  }

  move(projectId: string, id: string, dto: MoveDto) {
    return this.core.move(PROJECT_FILE_SCOPE, projectId, id, dto.parentFolderId ?? null);
  }

  reorder(projectId: string, dto: ReorderDto) {
    return this.core.reorder(PROJECT_FILE_SCOPE, projectId, dto.items);
  }

  remove(projectId: string, id: string) {
    return this.core.remove(PROJECT_FILE_SCOPE, projectId, id);
  }

  getDownloadInfo(projectId: string, id: string) {
    return this.core.getDownloadInfo(PROJECT_FILE_SCOPE, projectId, id);
  }
}
