import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import {
  Prisma,
  BroadcastChannel,
  BroadcastScope,
  BroadcastStatus,
  BroadcastTargetType,
} from "@prisma/client";
import type { CreateBroadcastDto } from "./dto/create-broadcast.dto";
import type { BroadcastQueryDto } from "./dto/broadcast-query.dto";
import { BroadcastDispatcher } from "./dispatchers/broadcast-dispatcher";

const CREATOR_SELECT = { id: true, name: true } as const;

type BroadcastWithCreator = Prisma.BroadcastGetPayload<{
  include: { createdByUser: { select: { id: true; name: true } } };
}>;

@Injectable()
export class BroadcastsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: BroadcastDispatcher,
  ) {}

  /** 配信一覧 */
  async findAll(query: BroadcastQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BroadcastWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.scope) where.scope = query.scope;
    if (query.eventId) {
      where.scope = BroadcastScope.event;
      where.targetFilter = { path: ["eventId"], equals: query.eventId };
    }

    const [messages, total] = await Promise.all([
      this.prisma.broadcast.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { createdByUser: { select: CREATOR_SELECT } },
      }),
      this.prisma.broadcast.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: messages.map((m) => this.mapBroadcast(m)),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /** 配信作成（下書き） */
  async create(userId: string, dto: CreateBroadcastDto) {
    this.validateScopeAndTarget(dto.scope, dto.targetType, dto.targetFilter);

    const broadcast = await this.prisma.broadcast.create({
      data: {
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        bodyText: dto.bodyText,
        scope: dto.scope ?? BroadcastScope.global,
        channels: dto.channels ?? [BroadcastChannel.email],
        targetType: dto.targetType,
        targetFilter: (dto.targetFilter ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        templateId: dto.templateId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        createdByUserId: userId,
      },
      include: { createdByUser: { select: CREATOR_SELECT } },
    });

    return this.mapBroadcast(broadcast);
  }

  /** 配信詳細 */
  async findOne(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id },
      include: {
        createdByUser: { select: CREATOR_SELECT },
        recipients: {
          orderBy: { createdAt: "asc" },
          take: 200,
        },
      },
    });

    if (!broadcast) throw new NotFoundException("配信が見つかりません");

    return {
      ...this.mapBroadcast(broadcast),
      recipients: broadcast.recipients.map((r) => ({
        id: r.id,
        userId: r.userId,
        channel: r.channel,
        email: r.email,
        status: r.status,
        sentAt: r.sentAt,
        openedAt: r.openedAt,
        clickedAt: r.clickedAt,
      })),
    };
  }

  /** 送信実行（dispatcher に委譲） */
  async send(id: string, actorUserId: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException("配信が見つかりません");
    if (
      broadcast.status !== BroadcastStatus.draft &&
      broadcast.status !== BroadcastStatus.scheduled
    ) {
      throw new BadRequestException("送信可能なステータスではありません");
    }

    return this.dispatcher.dispatch(broadcast, actorUserId);
  }

  // --- Private ---

  /** scope と target の整合性を検証 */
  private validateScopeAndTarget(
    scope: BroadcastScope | undefined,
    targetType: BroadcastTargetType,
    targetFilter: Record<string, unknown> | undefined,
  ) {
    const actualScope = scope ?? BroadcastScope.global;
    if (actualScope === BroadcastScope.event) {
      if (targetType !== BroadcastTargetType.event) {
        throw new BadRequestException("イベント配信では targetType=event が必要です");
      }
      if (!targetFilter?.eventId || typeof targetFilter.eventId !== "string") {
        throw new BadRequestException("イベント配信では targetFilter.eventId が必要です");
      }
    }
  }

  private mapBroadcast(broadcast: BroadcastWithCreator) {
    return {
      id: broadcast.id,
      subject: broadcast.subject,
      bodyHtml: broadcast.bodyHtml,
      bodyText: broadcast.bodyText,
      scope: broadcast.scope,
      channels: broadcast.channels,
      targetType: broadcast.targetType,
      targetFilter: broadcast.targetFilter as Record<string, unknown> | null,
      templateId: broadcast.templateId,
      status: broadcast.status,
      scheduledAt: broadcast.scheduledAt,
      sentAt: broadcast.sentAt,
      totalRecipients: broadcast.totalRecipients,
      sentCount: broadcast.sentCount,
      deliveredCount: broadcast.deliveredCount,
      failedCount: broadcast.failedCount,
      createdBy: { id: broadcast.createdByUser.id, name: broadcast.createdByUser.name },
      createdAt: broadcast.createdAt,
      updatedAt: broadcast.updatedAt,
    };
  }
}
