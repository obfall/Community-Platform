import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma, MailStatus } from "@prisma/client";
import type { CreateMailMessageDto } from "./dto/create-mail-message.dto";
import type { UpdateMailMessageDto } from "./dto/update-mail-message.dto";
import type { MailMessageQueryDto } from "./dto/mail-query.dto";

const CREATOR_SELECT = { id: true, name: true } as const;

@Injectable()
export class MailMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 配信一覧 */
  async findAll(query: MailMessageQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;

    const [messages, total] = await Promise.all([
      this.prisma.mailMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { createdByUser: { select: CREATOR_SELECT } },
      }),
      this.prisma.mailMessage.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: messages.map((m) => this.mapMessage(m)),
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

  /** メッセージ作成（下書き） */
  async create(userId: string, dto: CreateMailMessageDto) {
    const message = await this.prisma.mailMessage.create({
      data: {
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        bodyText: dto.bodyText,
        targetType: dto.targetType,
        targetFilter: (dto.targetFilter ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        templateId: dto.templateId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        createdByUserId: userId,
      },
      include: { createdByUser: { select: CREATOR_SELECT } },
    });

    return this.mapMessage(message);
  }

  /** メッセージ詳細 */
  async findOne(id: string) {
    const message = await this.prisma.mailMessage.findUnique({
      where: { id },
      include: {
        createdByUser: { select: CREATOR_SELECT },
        recipients: {
          orderBy: { createdAt: "asc" },
          take: 100,
        },
      },
    });

    if (!message) throw new NotFoundException("メッセージが見つかりません");

    return {
      ...this.mapMessage(message),
      recipients: message.recipients.map((r) => ({
        id: r.id,
        userId: r.userId,
        email: r.email,
        status: r.status,
        sentAt: r.sentAt,
        openedAt: r.openedAt,
        clickedAt: r.clickedAt,
      })),
    };
  }

  /** メッセージ更新（下書き時のみ） */
  async update(id: string, dto: UpdateMailMessageDto) {
    const existing = await this.prisma.mailMessage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("メッセージが見つかりません");
    if (existing.status !== MailStatus.draft) {
      throw new BadRequestException("下書き以外のメッセージは更新できません");
    }

    const message = await this.prisma.mailMessage.update({
      where: { id },
      data: {
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.bodyHtml !== undefined && { bodyHtml: dto.bodyHtml }),
        ...(dto.bodyText !== undefined && { bodyText: dto.bodyText }),
        ...(dto.targetType !== undefined && { targetType: dto.targetType }),
        ...(dto.targetFilter !== undefined && {
          targetFilter: (dto.targetFilter ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        }),
        ...(dto.templateId !== undefined && { templateId: dto.templateId }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        }),
      },
      include: { createdByUser: { select: CREATOR_SELECT } },
    });

    return this.mapMessage(message);
  }

  /** 送信実行（受信者を生成し、ステータスを sending に変更） */
  async send(id: string) {
    const message = await this.prisma.mailMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException("メッセージが見つかりません");
    if (message.status !== MailStatus.draft && message.status !== MailStatus.scheduled) {
      throw new BadRequestException("送信可能なステータスではありません");
    }

    // 配信対象ユーザーを取得
    const users = await this.resolveRecipients(message.targetType, message.targetFilter);

    // 配信停止リストを除外
    const suppressedEmails = await this.prisma.mailSuppression.findMany({
      select: { email: true },
    });
    const suppressedSet = new Set(suppressedEmails.map((s) => s.email));
    const eligibleUsers = users.filter((u) => !suppressedSet.has(u.email));

    // 受信者レコードを一括作成
    await this.prisma.mailMessageRecipient.createMany({
      data: eligibleUsers.map((u) => ({
        messageId: id,
        userId: u.id,
        email: u.email,
      })),
      skipDuplicates: true,
    });

    // ステータス更新
    const updated = await this.prisma.mailMessage.update({
      where: { id },
      data: {
        status: MailStatus.sending,
        totalRecipients: eligibleUsers.length,
      },
      include: { createdByUser: { select: CREATOR_SELECT } },
    });

    // TODO: Phase 3.3 で BullMQ キューにジョブを追加
    // 今はステータスを sent に暫定更新
    await this.prisma.mailMessage.update({
      where: { id },
      data: {
        status: MailStatus.sent,
        sentAt: new Date(),
        sentCount: eligibleUsers.length,
      },
    });

    return this.mapMessage(updated);
  }

  // --- Private ---

  private async resolveRecipients(
    targetType: string,
    targetFilter: unknown,
  ): Promise<Array<{ id: string; email: string }>> {
    const where: Record<string, unknown> = {
      status: "active",
      deletedAt: null,
    };

    if (targetType === "rank" && targetFilter && typeof targetFilter === "object") {
      const filter = targetFilter as Record<string, unknown>;
      if (filter.rankId) where.rankId = filter.rankId;
    }

    return this.prisma.user.findMany({
      where,
      select: { id: true, email: true },
    });
  }

  private mapMessage(
    message: Prisma.MailMessageGetPayload<{
      include: { createdByUser: { select: { id: true; name: true } } };
    }>,
  ) {
    return {
      id: message.id,
      subject: message.subject,
      bodyHtml: message.bodyHtml,
      bodyText: message.bodyText,
      targetType: message.targetType,
      targetFilter: message.targetFilter as Record<string, unknown> | null,
      templateId: message.templateId,
      status: message.status,
      scheduledAt: message.scheduledAt,
      sentAt: message.sentAt,
      totalRecipients: message.totalRecipients,
      sentCount: message.sentCount,
      deliveredCount: message.deliveredCount,
      failedCount: message.failedCount,
      createdBy: { id: message.createdByUser.id, name: message.createdByUser.name },
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
