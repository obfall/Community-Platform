import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@/prisma/prisma.service";
import type {
  UpsertEventResultDto,
  AttachResultFileDto,
  ReorderResultAttachmentsDto,
} from "./dto/upsert-event-result.dto";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  profile: { select: { avatarUrl: true } },
} as const;

const ATTACHMENT_INCLUDE = {
  file: {
    select: {
      id: true,
      originalName: true,
      contentType: true,
      fileSizeBytes: true,
      storageKey: true,
      storageBucket: true,
      publicUrl: true,
    },
  },
} as const;

type AuthUser = { id: string; role: string };

@Injectable()
export class EventResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(eventId: string, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, createdByUserId: true },
    });
    if (!event) throw new NotFoundException("イベントが見つかりません");

    const result = await this.prisma.eventResult.findUnique({
      where: { eventId },
      include: {
        createdBy: { select: AUTHOR_SELECT },
        attachments: {
          orderBy: { sortOrder: "asc" },
          include: ATTACHMENT_INCLUDE,
        },
      },
    });

    if (!result) return null;

    const canEdit = this.canEdit(user, event.createdByUserId);
    const isPublic = result.publishStatus === "public" && result.status === "completed";
    if (!canEdit && !isPublic) {
      return null;
    }

    return this.mapResult(result);
  }

  async upsert(eventId: string, user: AuthUser, dto: UpsertEventResultDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, createdByUserId: true },
    });
    if (!event) throw new NotFoundException("イベントが見つかりません");
    this.assertCanEdit(user, event.createdByUserId);

    const activeCount = await this.prisma.eventParticipant.count({
      where: { eventId, status: { not: "canceled" } },
    });

    const attendanceRate =
      activeCount > 0
        ? new Prisma.Decimal(Math.round((dto.attendanceCount / activeCount) * 10000) / 100)
        : null;

    const data = {
      attendanceCount: dto.attendanceCount,
      attendanceRate,
      summary: dto.summary ?? null,
      achievementNotes: dto.achievementNotes ?? null,
      improvementNotes: dto.improvementNotes ?? null,
      executionStatus: dto.executionStatus,
      status: dto.status,
      publishStatus: dto.publishStatus,
    };

    await this.prisma.eventResult.upsert({
      where: { eventId },
      create: {
        ...data,
        eventId,
        createdByUserId: user.id,
      },
      update: data,
    });

    return this.get(eventId, user);
  }

  async remove(eventId: string, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, createdByUserId: true },
    });
    if (!event) throw new NotFoundException("イベントが見つかりません");
    this.assertCanEdit(user, event.createdByUserId);

    const result = await this.prisma.eventResult.findUnique({
      where: { eventId },
      select: { id: true },
    });
    if (!result) throw new NotFoundException("実施結果が見つかりません");

    await this.prisma.eventResult.delete({ where: { eventId } });
  }

  async addAttachment(eventId: string, user: AuthUser, dto: AttachResultFileDto) {
    const { result } = await this.loadForEdit(eventId, user);

    const maxSort = await this.prisma.eventResultAttachment.findFirst({
      where: { eventResultId: result.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const attachment = await this.prisma.eventResultAttachment.create({
      data: {
        eventResultId: result.id,
        fileId: dto.fileId,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
      include: ATTACHMENT_INCLUDE,
    });

    return this.mapAttachment(attachment);
  }

  async removeAttachment(eventId: string, attachmentId: string, user: AuthUser) {
    const { result } = await this.loadForEdit(eventId, user);

    const attachment = await this.prisma.eventResultAttachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, eventResultId: true },
    });
    if (!attachment || attachment.eventResultId !== result.id) {
      throw new NotFoundException("添付ファイルが見つかりません");
    }

    await this.prisma.eventResultAttachment.delete({
      where: { id: attachmentId },
    });
  }

  async reorderAttachments(eventId: string, user: AuthUser, dto: ReorderResultAttachmentsDto) {
    const { result } = await this.loadForEdit(eventId, user);

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.eventResultAttachment.updateMany({
          where: { id: item.id, eventResultId: result.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    const attachments = await this.prisma.eventResultAttachment.findMany({
      where: { eventResultId: result.id },
      orderBy: { sortOrder: "asc" },
      include: ATTACHMENT_INCLUDE,
    });

    return attachments.map((a) => this.mapAttachment(a));
  }

  // ---------- helpers ----------

  private canEdit(user: AuthUser, createdByUserId: string) {
    if (!user) return false;
    if (user.role === "admin" || user.role === "owner") return true;
    return user.id === createdByUserId;
  }

  private assertCanEdit(user: AuthUser, createdByUserId: string) {
    if (!this.canEdit(user, createdByUserId)) {
      throw new ForbiddenException("実施結果を編集する権限がありません");
    }
  }

  private async loadForEdit(eventId: string, user: AuthUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, createdByUserId: true },
    });
    if (!event) throw new NotFoundException("イベントが見つかりません");
    this.assertCanEdit(user, event.createdByUserId);

    const result = await this.prisma.eventResult.findUnique({
      where: { eventId },
      select: { id: true },
    });
    if (!result) throw new NotFoundException("実施結果が見つかりません");

    return { event, result };
  }

  private mapResult(result: any) {
    return {
      id: result.id,
      eventId: result.eventId,
      attendanceCount: result.attendanceCount,
      attendanceRate: result.attendanceRate != null ? Number(result.attendanceRate) : null,
      summary: result.summary,
      achievementNotes: result.achievementNotes,
      improvementNotes: result.improvementNotes,
      executionStatus: result.executionStatus,
      status: result.status,
      publishStatus: result.publishStatus,
      createdBy: {
        id: result.createdBy.id,
        name: result.createdBy.name,
        avatarUrl: result.createdBy.profile?.avatarUrl ?? null,
      },
      attachments: (result.attachments ?? []).map((a: any) => this.mapAttachment(a)),
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  private mapAttachment(a: any) {
    return {
      id: a.id,
      sortOrder: a.sortOrder,
      file: {
        id: a.file.id,
        originalName: a.file.originalName,
        contentType: a.file.contentType,
        fileSizeBytes: Number(a.file.fileSizeBytes),
        storageKey: a.file.storageKey,
        storageBucket: a.file.storageBucket,
        publicUrl: a.file.publicUrl,
      },
      createdAt: a.createdAt,
    };
  }
}
