import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { FileManagerCoreService } from "./core/file-manager-core.service";
import { EVENT_FILE_SCOPE } from "./core/file-manager-scope.config";
import type { CreateFolderDto } from "./dto/create-folder.dto";
import type { RegisterFileDto } from "./dto/register-file.dto";
import type { RenameDto } from "./dto/rename.dto";
import type { MoveDto } from "./dto/move.dto";
import type { ReorderDto } from "./dto/reorder.dto";
import type { ListFilesQueryDto } from "./dto/list-files-query.dto";

@Injectable()
export class EventFilesService {
  constructor(
    private readonly core: FileManagerCoreService,
    private readonly prisma: PrismaService,
  ) {}

  async ensureMember(eventId: string, userId: string) {
    // イベント作成者
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { createdByUserId: true },
    });
    if (event?.createdByUserId === userId) return;

    // イベント参加者
    const participant = await this.prisma.eventParticipant.findFirst({
      where: { eventId, userId, status: { not: "canceled" } },
    });
    if (participant) return;

    // admin / owner
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === "owner" || user?.role === "admin") return;

    throw new ForbiddenException("このイベントにアクセスする権限がありません");
  }

  list(eventId: string, query: ListFilesQueryDto) {
    return this.core.list(EVENT_FILE_SCOPE, eventId, {
      folderId: query.folderId,
      search: query.q,
      sort: query.sort ?? "name",
      order: query.order ?? "asc",
    });
  }

  getFolder(eventId: string, folderId: string) {
    return this.core.getFolder(EVENT_FILE_SCOPE, eventId, folderId);
  }

  createFolder(eventId: string, userId: string, dto: CreateFolderDto) {
    return this.core.createFolder(EVENT_FILE_SCOPE, eventId, userId, dto);
  }

  registerFile(eventId: string, userId: string, dto: RegisterFileDto) {
    return this.core.registerFile(EVENT_FILE_SCOPE, eventId, userId, dto);
  }

  rename(eventId: string, id: string, dto: RenameDto) {
    return this.core.rename(EVENT_FILE_SCOPE, eventId, id, dto.name);
  }

  move(eventId: string, id: string, dto: MoveDto) {
    return this.core.move(EVENT_FILE_SCOPE, eventId, id, dto.parentFolderId ?? null);
  }

  reorder(eventId: string, dto: ReorderDto) {
    return this.core.reorder(EVENT_FILE_SCOPE, eventId, dto.items);
  }

  remove(eventId: string, id: string) {
    return this.core.remove(EVENT_FILE_SCOPE, eventId, id);
  }

  getDownloadInfo(eventId: string, id: string) {
    return this.core.getDownloadInfo(EVENT_FILE_SCOPE, eventId, id);
  }
}
