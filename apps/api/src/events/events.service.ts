import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateEventDto } from "./dto/create-event.dto";
import type { UpdateEventDto } from "./dto/update-event.dto";
import type { EventQueryDto } from "./dto/event-query.dto";
import type { CreateTicketDto } from "./dto/create-ticket.dto";
import type { ParticipateEventDto } from "./dto/participate-event.dto";
import type { UpdateParticipantStatusDto } from "./dto/update-participant-status.dto";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  profile: { select: { avatarUrl: true } },
} as const;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== Events ==========

  async findAll(query: EventQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.eventType) where.eventType = query.eventType;
    if (query.search) {
      where.title = { contains: query.search, mode: "insensitive" };
    }
    if (query.from || query.to) {
      where.startAt = {};
      if (query.from) where.startAt.gte = new Date(query.from);
      if (query.to) where.startAt.lte = new Date(query.to);
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { startAt: "desc" },
        skip,
        take: limit,
        include: {
          createdByUser: { select: AUTHOR_SELECT },
          category: { select: { id: true, name: true } },
          tickets: { orderBy: { sortOrder: "asc" } },
          _count: { select: { participants: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        locationType: e.locationType,
        venueName: e.venueName,
        startAt: e.startAt,
        endAt: e.endAt,
        status: e.status,
        coverImageUrl: e.coverImageUrl,
        participantCount: e._count.participants,
        category: e.category,
        createdBy: {
          id: e.createdByUser.id,
          name: e.createdByUser.name,
          avatarUrl: e.createdByUser.profile?.avatarUrl ?? null,
        },
        ticketCount: e.tickets.length,
        totalCapacity: e.tickets.some((t) => t.capacity !== null)
          ? e.tickets.reduce((sum, t) => sum + (t.capacity ?? 0), 0)
          : null,
        minPrice: e.tickets.length > 0 ? Math.min(...e.tickets.map((t) => t.price)) : null,
        createdAt: e.createdAt,
      })),
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

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        createdByUser: { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
        requiredRank: { select: { id: true, name: true } },
        tickets: { orderBy: { sortOrder: "asc" } },
        speakers: { orderBy: { sortOrder: "asc" }, include: { user: { select: AUTHOR_SELECT } } },
        organizations: { orderBy: { sortOrder: "asc" } },
        tags: { include: { tag: true } },
        _count: { select: { participants: true } },
      },
    });

    if (!event || event.deletedAt) throw new NotFoundException("イベントが見つかりません");
    return this.mapEventDetail(event);
  }

  async create(userId: string, dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        locationType: dto.locationType,
        venueName: dto.venueName,
        venueAddress: dto.venueAddress,
        onlineUrl: dto.onlineUrl,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        registrationDeadlineAt: dto.registrationDeadlineAt
          ? new Date(dto.registrationDeadlineAt)
          : undefined,
        ticketSaleStartAt: dto.ticketSaleStartAt ? new Date(dto.ticketSaleStartAt) : undefined,
        allowMultiTicketPurchase: dto.allowMultiTicketPurchase,
        planningRole: dto.planningRole,
        eventType: dto.eventType,
        categoryId: dto.categoryId,
        accessInfo: dto.accessInfo,
        participationMethod: dto.participationMethod,
        contactInfo: dto.contactInfo,
        cancellationPolicy: dto.cancellationPolicy,
        isAttendeeVisible: dto.isAttendeeVisible,
        coverImageUrl: dto.coverImageUrl,
        requiredRankId: dto.requiredRankId,
        createdByUserId: userId,
      },
    });
    return this.findOne(event.id);
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException("イベントが見つかりません");

    await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.locationType !== undefined && { locationType: dto.locationType }),
        ...(dto.venueName !== undefined && { venueName: dto.venueName }),
        ...(dto.venueAddress !== undefined && { venueAddress: dto.venueAddress }),
        ...(dto.onlineUrl !== undefined && { onlineUrl: dto.onlineUrl }),
        ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
        ...(dto.registrationDeadlineAt !== undefined && {
          registrationDeadlineAt: dto.registrationDeadlineAt
            ? new Date(dto.registrationDeadlineAt)
            : null,
        }),
        ...(dto.ticketSaleStartAt !== undefined && {
          ticketSaleStartAt: dto.ticketSaleStartAt ? new Date(dto.ticketSaleStartAt) : null,
        }),
        ...(dto.allowMultiTicketPurchase !== undefined && {
          allowMultiTicketPurchase: dto.allowMultiTicketPurchase,
        }),
        ...(dto.planningRole !== undefined && { planningRole: dto.planningRole }),
        ...(dto.eventType !== undefined && { eventType: dto.eventType }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.accessInfo !== undefined && { accessInfo: dto.accessInfo }),
        ...(dto.participationMethod !== undefined && {
          participationMethod: dto.participationMethod,
        }),
        ...(dto.contactInfo !== undefined && { contactInfo: dto.contactInfo }),
        ...(dto.cancellationPolicy !== undefined && {
          cancellationPolicy: dto.cancellationPolicy,
        }),
        ...(dto.isAttendeeVisible !== undefined && { isAttendeeVisible: dto.isAttendeeVisible }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.requiredRankId !== undefined && { requiredRankId: dto.requiredRankId }),
        ...(dto.isCalendarVisible !== undefined && { isCalendarVisible: dto.isCalendarVisible }),
      },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException("イベントが見つかりません");

    await this.prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ========== Tickets ==========

  async createTicket(eventId: string, dto: CreateTicketDto) {
    await this.assertEventExists(eventId);
    return this.prisma.eventTicket.create({
      data: {
        eventId,
        ticketName: dto.ticketName,
        price: dto.price ?? 0,
        currency: dto.currency ?? "JPY",
        capacity: dto.capacity,
        purchaseLimit: dto.purchaseLimit ?? 1,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateTicket(ticketId: string, dto: Partial<CreateTicketDto>) {
    const ticket = await this.prisma.eventTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("チケットが見つかりません");

    return this.prisma.eventTicket.update({
      where: { id: ticketId },
      data: {
        ...(dto.ticketName !== undefined && { ticketName: dto.ticketName }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.purchaseLimit !== undefined && { purchaseLimit: dto.purchaseLimit }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async removeTicket(ticketId: string) {
    const ticket = await this.prisma.eventTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("チケットが見つかりません");

    await this.prisma.eventTicket.delete({ where: { id: ticketId } });
  }

  // ========== Participants ==========

  async participate(eventId: string, userId: string, dto: ParticipateEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { tickets: true },
    });
    if (!event || event.deletedAt) throw new NotFoundException("イベントが見つかりません");
    if (event.status !== "recruiting") {
      throw new BadRequestException("このイベントは現在募集していません");
    }

    // 締切チェック
    if (event.registrationDeadlineAt && new Date() > event.registrationDeadlineAt) {
      throw new BadRequestException("申込締切を過ぎています");
    }

    const quantity = dto.quantity ?? 1;

    // 定員チェック（チケット指定時）
    if (dto.ticketId) {
      const ticket = event.tickets.find((t) => t.id === dto.ticketId);
      if (!ticket) throw new BadRequestException("チケットが見つかりません");
      if (!ticket.isActive) throw new BadRequestException("このチケットは販売停止中です");
      if (ticket.capacity !== null && ticket.soldCount + quantity > ticket.capacity) {
        throw new BadRequestException(
          `定員に達しています（残り${ticket.capacity - ticket.soldCount}枚）`,
        );
      }
      if (quantity > ticket.purchaseLimit) {
        throw new BadRequestException(`購入上限は${ticket.purchaseLimit}枚です`);
      }
    }

    // 割引コード処理
    let discountCodeId: string | undefined;
    if (dto.discountCode && dto.ticketId) {
      const code = await this.prisma.eventDiscountCode.findFirst({
        where: {
          ticketId: dto.ticketId,
          code: dto.discountCode,
          isActive: true,
        },
      });
      if (!code) throw new BadRequestException("無効な割引コードです");
      if (code.expiresAt && new Date() > code.expiresAt) {
        throw new BadRequestException("割引コードの有効期限が切れています");
      }
      if (code.usageLimit && code.usedCount >= code.usageLimit) {
        throw new BadRequestException("割引コードの使用回数上限に達しています");
      }
      discountCodeId = code.id;
    }

    // トランザクションで参加登録 + カウント更新を一括実行
    const participant = await this.prisma.$transaction(async (tx) => {
      const p = await tx.eventParticipant.create({
        data: {
          eventId,
          userId,
          ticketId: dto.ticketId,
          quantity,
          paymentMethod: dto.paymentMethod,
          discountCodeId,
        },
      });

      // チケットの soldCount を更新
      if (dto.ticketId) {
        await tx.eventTicket.update({
          where: { id: dto.ticketId },
          data: { soldCount: { increment: quantity } },
        });
      }

      // イベントの participantCount を更新
      await tx.event.update({
        where: { id: eventId },
        data: { participantCount: { increment: 1 } },
      });

      // 割引コード使用数を更新
      if (discountCodeId) {
        await tx.eventDiscountCode.update({
          where: { id: discountCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return p;
    });

    return participant;
  }

  async cancelParticipation(eventId: string, userId: string) {
    const participant = await this.prisma.eventParticipant.findFirst({
      where: { eventId, userId, status: { not: "canceled" } },
    });
    if (!participant) throw new NotFoundException("参加登録が見つかりません");

    // トランザクションでキャンセル + カウント戻しを一括実行
    await this.prisma.$transaction(async (tx) => {
      await tx.eventParticipant.update({
        where: { id: participant.id },
        data: { status: "canceled", canceledAt: new Date() },
      });

      // チケットの soldCount を戻す
      if (participant.ticketId) {
        await tx.eventTicket.update({
          where: { id: participant.ticketId },
          data: { soldCount: { decrement: participant.quantity } },
        });
      }

      // イベントの participantCount を戻す
      await tx.event.update({
        where: { id: eventId },
        data: { participantCount: { decrement: 1 } },
      });
    });

    return { canceled: true };
  }

  async getParticipants(eventId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [participants, total] = await Promise.all([
      this.prisma.eventParticipant.findMany({
        where: { eventId },
        orderBy: { appliedAt: "asc" },
        skip,
        take: limit,
        include: {
          user: { select: AUTHOR_SELECT },
          ticket: { select: { id: true, ticketName: true, price: true } },
        },
      }),
      this.prisma.eventParticipant.count({ where: { eventId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: participants.map((p) => ({
        id: p.id,
        user: {
          id: p.user.id,
          name: p.user.name,
          avatarUrl: p.user.profile?.avatarUrl ?? null,
        },
        ticket: p.ticket,
        quantity: p.quantity,
        status: p.status,
        paymentStatus: p.paymentStatus,
        paymentMethod: p.paymentMethod,
        appliedAt: p.appliedAt,
        canceledAt: p.canceledAt,
      })),
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

  async updateParticipantStatus(participantId: string, dto: UpdateParticipantStatusDto) {
    const participant = await this.prisma.eventParticipant.findUnique({
      where: { id: participantId },
    });
    if (!participant) throw new NotFoundException("参加者が見つかりません");

    return this.prisma.eventParticipant.update({
      where: { id: participantId },
      data: {
        status: dto.status,
        ...(dto.status === "canceled" && { canceledAt: new Date() }),
      },
    });
  }

  // ========== Calendar ==========

  async getCalendarEvents(from: string, to: string) {
    return this.prisma.event.findMany({
      where: {
        deletedAt: null,
        isCalendarVisible: true,
        startAt: { gte: new Date(from), lte: new Date(to) },
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        locationType: true,
        status: true,
        coverImageUrl: true,
      },
      orderBy: { startAt: "asc" },
    });
  }

  // ========== Helpers ==========

  private async assertEventExists(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.deletedAt) throw new NotFoundException("イベントが見つかりません");
    return event;
  }

  private mapEventDetail(event: any) {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      locationType: event.locationType,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      onlineUrl: event.onlineUrl,
      startAt: event.startAt,
      endAt: event.endAt,
      registrationDeadlineAt: event.registrationDeadlineAt,
      ticketSaleStartAt: event.ticketSaleStartAt,
      allowMultiTicketPurchase: event.allowMultiTicketPurchase,
      planningRole: event.planningRole,
      eventType: event.eventType,
      accessInfo: event.accessInfo,
      participationMethod: event.participationMethod,
      contactInfo: event.contactInfo,
      cancellationPolicy: event.cancellationPolicy,
      language: event.language,
      isAttendeeVisible: event.isAttendeeVisible,
      status: event.status,
      coverImageUrl: event.coverImageUrl,
      isCalendarVisible: event.isCalendarVisible,
      participantCount: event._count?.participants ?? event.participantCount,
      category: event.category,
      requiredRank: event.requiredRank,
      createdBy: {
        id: event.createdByUser.id,
        name: event.createdByUser.name,
        avatarUrl: event.createdByUser.profile?.avatarUrl ?? null,
      },
      tickets: event.tickets,
      speakers: event.speakers?.map((s: any) => ({
        id: s.id,
        name: s.name,
        title: s.title,
        role: s.role,
        sortOrder: s.sortOrder,
        user: s.user
          ? { id: s.user.id, name: s.user.name, avatarUrl: s.user.profile?.avatarUrl ?? null }
          : null,
      })),
      organizations: event.organizations,
      tags: event.tags?.map((t: any) => ({ id: t.tag.id, name: t.tag.name, slug: t.tag.slug })),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
