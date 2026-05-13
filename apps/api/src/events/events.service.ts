import { Injectable, NotFoundException, BadRequestException, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { PrismaService } from "@/prisma/prisma.service";
import { NotificationsService } from "@/notifications/notifications.service";
import {
  AUTHOR_SELECT,
  buildPaginationMeta,
  escapePgroongaQuery,
  extractPagination,
  formatAuthor,
  pgroongaSearchAndFetch,
} from "@/common/utils";
import { Prisma, EventStatus, ParticipantStatus } from "@prisma/client";
import type { UserRole } from "@prisma/client";
import type { CreateEventDto } from "./dto/create-event.dto";
import type { UpdateEventDto } from "./dto/update-event.dto";
import type { EventQueryDto } from "./dto/event-query.dto";
import type { CreateTicketDto } from "./dto/create-ticket.dto";
import type { ParticipateEventDto } from "./dto/participate-event.dto";
import type { UpdateParticipantStatusDto } from "./dto/update-participant-status.dto";

/** ホーム「今後のイベント」に出すイベント状態。recruiting 以外は非管理者から隠す方針に統一。 */
const UPCOMING_LISTABLE_STATUSES: EventStatus[] = [EventStatus.recruiting];

/** admin / owner は全ステータス参照可。それ以外は recruiting のみ。 */
const canViewAllEventStatuses = (role: UserRole): boolean => role === "admin" || role === "owner";

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Optional() @InjectQueue("event-reminder") private readonly reminderQueue?: Queue,
  ) {}

  // ========== Events ==========

  async findAll(query: EventQueryDto, role: UserRole) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(query, escaped, role);
    }
    return this.findAllStandard(query, role);
  }

  private async findAllStandard(query: EventQueryDto, role: UserRole) {
    const { page, limit, skip } = extractPagination(query);

    const where: Prisma.EventWhereInput = { deletedAt: null };
    if (canViewAllEventStatuses(role)) {
      if (query.status) where.status = query.status;
    } else {
      // 非管理者は recruiting のみ。クエリの status 指定は無視する。
      where.status = EventStatus.recruiting;
    }
    if (query.eventType) where.eventType = query.eventType;
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
          venue: { select: { id: true, name: true } },
          tickets: { orderBy: { sortOrder: "asc" } },
          tags: { include: { tag: true } },
          _count: { select: { participants: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return this.formatList(events, total, page, limit);
  }

  /**
   * pgroonga による全文検索版。関連度スコア順 + ハイライト付き。
   * 検索条件は通常一覧 (findAllStandard) と一致させる（非管理者は recruiting のみ）。
   */
  private async searchByPgroonga(query: EventQueryDto, escaped: string, role: UserRole) {
    const { page, limit, offset } = extractPagination(query);

    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;
    const canViewAll = canViewAllEventStatuses(role);

    // 検索時の WHERE: 通常一覧と同じ条件 + クエリ別フィルタ
    const where = Prisma.sql`
      deleted_at IS NULL
      ${
        canViewAll
          ? query.status
            ? Prisma.sql`AND status = ${query.status}::"EventStatus"`
            : Prisma.empty
          : Prisma.sql`AND status = 'recruiting'::"EventStatus"`
      }
      ${query.eventType ? Prisma.sql`AND event_type = ${query.eventType}` : Prisma.empty}
      ${fromDate ? Prisma.sql`AND start_at >= ${fromDate}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND start_at <= ${toDate}` : Prisma.empty}
    `;

    const { records, hitsById, total } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "events",
      // タグ名でもヒットさせるため tags_text を含める。description は対象外
      // （description は snippet ハイライトのみで利用）
      searchColumns: ["title", "tags_text"],
      titleColumn: "title",
      snippetColumn: "description",
      escaped,
      where,
      limit,
      offset,
      fetchByIds: (ids) =>
        this.prisma.event.findMany({
          where: { id: { in: ids }, deletedAt: null },
          include: {
            createdByUser: { select: AUTHOR_SELECT },
            venue: { select: { id: true, name: true } },
            tickets: { orderBy: { sortOrder: "asc" } },
            tags: { include: { tag: true } },
            _count: { select: { participants: true } },
          },
        }),
    });

    return this.formatList(records, total, page, limit, hitsById);
  }

  private formatList(
    events: Array<
      Prisma.EventGetPayload<{
        include: {
          createdByUser: { select: typeof AUTHOR_SELECT };
          venue: { select: { id: true; name: true } };
          tickets: true;
          tags: { include: { tag: true } };
          _count: { select: { participants: true } };
        };
      }>
    >,
    total: number,
    page: number,
    limit: number,
    hitsById?: Map<string, { titleHighlighted: string; snippetHighlighted: string }>,
  ) {
    return {
      data: events.map((e) => {
        const h = hitsById?.get(e.id);
        return {
          id: e.id,
          title: e.title,
          description: e.description,
          titleHighlighted: h?.titleHighlighted,
          snippetHighlighted: h?.snippetHighlighted,
          locationType: e.locationType,
          venueId: e.venueId,
          venueName: e.venue?.name ?? e.venueName,
          startAt: e.startAt,
          endAt: e.endAt,
          status: e.status,
          coverImageUrl: e.coverImageUrl,
          participantCount: e._count.participants,
          createdBy: formatAuthor(e.createdByUser),
          ticketCount: e.tickets.length,
          totalCapacity: e.tickets.some((t) => t.capacity !== null)
            ? e.tickets.reduce((sum, t) => sum + (t.capacity ?? 0), 0)
            : null,
          minPrice: e.tickets.length > 0 ? Math.min(...e.tickets.map((t) => t.price)) : null,
          tags: e.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, slug: t.tag.slug })),
          createdAt: e.createdAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string, role: UserRole) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        createdByUser: { select: AUTHOR_SELECT },
        venue: { select: { id: true, name: true, address: true } },
        requiredRank: { select: { id: true, name: true } },
        tickets: { orderBy: { sortOrder: "asc" } },
        speakers: { orderBy: { sortOrder: "asc" }, include: { user: { select: AUTHOR_SELECT } } },
        organizations: { orderBy: { sortOrder: "asc" } },
        tags: { include: { tag: true } },
        _count: { select: { participants: true } },
      },
    });

    if (!event || event.deletedAt) throw new NotFoundException("イベントが見つかりません");
    if (event.status !== EventStatus.recruiting && !canViewAllEventStatuses(role)) {
      throw new NotFoundException("イベントが見つかりません");
    }
    return this.mapEventDetail(event);
  }

  async create(userId: string, dto: CreateEventDto) {
    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          title: dto.title,
          description: dto.description,
          locationType: dto.locationType,
          venueId: dto.venueId,
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

      if (dto.organizations && dto.organizations.length > 0) {
        await tx.eventOrganization.createMany({
          data: dto.organizations.map((o, idx) => ({
            eventId: created.id,
            organizationName: o.organizationName,
            role: o.role,
            sortOrder: idx,
          })),
        });
      }

      if (dto.tags && dto.tags.length > 0) {
        await this.syncEventTags(tx, created.id, dto.tags);
      }

      if (dto.speakers && dto.speakers.length > 0) {
        await tx.eventSpeaker.createMany({
          data: dto.speakers.map((s, idx) => ({
            eventId: created.id,
            name: s.name,
            title: s.title,
            role: s.role,
            userId: s.userId,
            sortOrder: idx,
          })),
        });
      }

      return created;
    });

    // create / update / duplicate は admin/owner 限定のため、role 制限を受けない "admin" で取得する。
    return this.findOne(event.id, "admin");
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException("イベントが見つかりません");

    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.locationType !== undefined && { locationType: dto.locationType }),
          ...(dto.venueId !== undefined && { venueId: dto.venueId }),
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

      // organizations: undefined なら変更なし、配列なら全件置換（空配列は全削除）
      if (dto.organizations !== undefined) {
        await tx.eventOrganization.deleteMany({ where: { eventId: id } });
        if (dto.organizations.length > 0) {
          await tx.eventOrganization.createMany({
            data: dto.organizations.map((o, idx) => ({
              eventId: id,
              organizationName: o.organizationName,
              role: o.role,
              sortOrder: idx,
            })),
          });
        }
      }

      // tags: undefined なら変更なし、配列なら全件置換（空配列は全削除 + tags_text='' に同期）
      if (dto.tags !== undefined) {
        await this.syncEventTags(tx, id, dto.tags);
      }

      // speakers: undefined なら変更なし、配列なら全件置換（空配列は全削除）
      if (dto.speakers !== undefined) {
        await tx.eventSpeaker.deleteMany({ where: { eventId: id } });
        if (dto.speakers.length > 0) {
          await tx.eventSpeaker.createMany({
            data: dto.speakers.map((s, idx) => ({
              eventId: id,
              name: s.name,
              title: s.title,
              role: s.role,
              userId: s.userId,
              sortOrder: idx,
            })),
          });
        }
      }
    });

    // リマインダー再スケジュール
    if (dto.status === "canceled") {
      await this.cancelReminder(id);
    } else if (dto.status === "recruiting" || dto.startAt !== undefined) {
      await this.scheduleReminder(id);
    }

    return this.findOne(id, "admin");
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
      include: { tickets: true, applicationFormConfig: true },
    });
    if (!event || event.deletedAt) throw new NotFoundException("イベントが見つかりません");
    if (event.status !== "recruiting") {
      throw new BadRequestException("このイベントは現在募集していません");
    }

    if (event.registrationDeadlineAt && new Date() > event.registrationDeadlineAt) {
      throw new BadRequestException("申込締切を過ぎています");
    }

    const quantity = dto.quantity ?? 1;

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

    const config = event.applicationFormConfig;
    if (config) {
      const requiredFields: Array<{ field: string; value: unknown }> = [
        { field: "氏名", value: dto.applicantName },
        { field: "ふりがな", value: dto.applicantNameKana },
        { field: "所属", value: dto.applicantAffiliation },
        { field: "性別", value: dto.applicantGender },
        { field: "年齢", value: dto.applicantAge },
        { field: "職業", value: dto.applicantOccupation },
        { field: "国籍", value: dto.applicantNationality },
      ];
      const configKeys = [
        config.askName,
        config.askNameKana,
        config.askAffiliation,
        config.askGender,
        config.askAge,
        config.askOccupation,
        config.askNationality,
      ];
      for (let i = 0; i < requiredFields.length; i++) {
        const rf = requiredFields[i]!;
        if (
          configKeys[i] === "required" &&
          (rf.value === undefined || rf.value === null || rf.value === "")
        ) {
          throw new BadRequestException(`${rf.field}は必須です`);
        }
      }
    }

    const questions = await this.prisma.eventApplicationQuestion.findMany({
      where: { eventId },
    });
    const answersMap = new Map((dto.answers ?? []).map((a) => [a.questionId, a.answer]));
    for (const q of questions) {
      if (q.isRequired && !answersMap.has(q.id)) {
        throw new BadRequestException(`「${q.label}」は必須です`);
      }
      const answer = answersMap.get(q.id);
      if (
        answer !== undefined &&
        (q.questionType === "radio" || q.questionType === "select" || q.questionType === "checkbox")
      ) {
        const options = (q.options as Array<{ value: string }>) ?? [];
        const validValues = options.map((o) => o.value);
        const values = Array.isArray(answer) ? answer : [answer];
        for (const v of values) {
          if (!validValues.includes(v)) {
            throw new BadRequestException(`「${q.label}」に無効な選択肢が含まれています`);
          }
        }
      }
    }

    let discountCodeId: string | undefined;
    if (dto.discountCode) {
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

    const participant = await this.prisma.$transaction(async (tx) => {
      const p = await tx.eventParticipant.create({
        data: {
          eventId,
          userId,
          ticketId: dto.ticketId,
          quantity,
          paymentMethod: dto.paymentMethod,
          discountCodeId,
          applicantEmail: dto.applicantEmail,
          applicantName: dto.applicantName,
          applicantNameKana: dto.applicantNameKana,
          applicantAffiliation: dto.applicantAffiliation,
          applicantGender: dto.applicantGender as never,
          applicantAge: dto.applicantAge,
          applicantOccupation: dto.applicantOccupation,
          applicantNationality: dto.applicantNationality,
        },
      });

      if (dto.answers && dto.answers.length > 0) {
        await tx.eventParticipantAnswer.createMany({
          data: dto.answers.map((a) => ({
            participantId: p.id,
            questionId: a.questionId,
            answer: a.answer,
          })),
        });
      }

      await tx.eventTicket.update({
        where: { id: dto.ticketId },
        data: { soldCount: { increment: quantity } },
      });

      const updatedEvent = await tx.event.update({
        where: { id: eventId },
        data: { participantCount: { increment: 1 } },
      });

      if (discountCodeId) {
        await tx.eventDiscountCode.update({
          where: { id: discountCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return { participant: p, updatedEvent };
    });

    // 通知（トランザクション外で非同期実行）
    try {
      await this.notificationsService.create({
        userId,
        type: "event_application",
        title: "イベント申込完了",
        body: config?.completionMessageApp ?? undefined,
        referenceType: "event",
        referenceId: eventId,
      });

      if (config?.notifyOnCapacityReached) {
        const totalCapacity = event.tickets.reduce((sum, t) => sum + (t.capacity ?? 0), 0);
        if (totalCapacity > 0 && participant.updatedEvent.participantCount >= totalCapacity) {
          await this.notificationsService.create({
            userId: event.createdByUserId,
            type: "event_capacity_reached",
            title: "定員達成",
            body: `イベント「${event.title}」が定員に達しました`,
            referenceType: "event",
            referenceId: eventId,
          });
        }
      }

      if (config?.notifyOnRemainingThreshold != null) {
        const totalCapacity = event.tickets.reduce((sum, t) => sum + (t.capacity ?? 0), 0);
        const remaining = totalCapacity - participant.updatedEvent.participantCount;
        if (totalCapacity > 0 && remaining <= config.notifyOnRemainingThreshold) {
          await this.notificationsService.create({
            userId: event.createdByUserId,
            type: "event_remaining_threshold",
            title: "残席通知",
            body: `イベント「${event.title}」の残席が${remaining}件です`,
            referenceType: "event",
            referenceId: eventId,
          });
        }
      }
    } catch {
      // 通知送信失敗は申込処理に影響させない
    }

    return participant.participant;
  }

  async cancelParticipation(eventId: string, userId: string) {
    const participant = await this.prisma.eventParticipant.findFirst({
      where: { eventId, userId, status: { not: "canceled" } },
    });
    if (!participant) throw new NotFoundException("参加登録が見つかりません");

    await this.prisma.$transaction(async (tx) => {
      await tx.eventParticipant.update({
        where: { id: participant.id },
        data: { status: "canceled", canceledAt: new Date() },
      });

      await tx.eventTicket.update({
        where: { id: participant.ticketId },
        data: { soldCount: { decrement: participant.quantity } },
      });

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
        user: formatAuthor(p.user),
        ticket: p.ticket,
        quantity: p.quantity,
        status: p.status,
        paymentStatus: p.paymentStatus,
        paymentMethod: p.paymentMethod,
        appliedAt: p.appliedAt,
        canceledAt: p.canceledAt,
        attendedAt: p.attendedAt,
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

  async getParticipantDetail(eventId: string, participantId: string) {
    const participant = await this.prisma.eventParticipant.findFirst({
      where: { id: participantId, eventId },
      include: {
        user: { select: AUTHOR_SELECT },
        ticket: { select: { id: true, ticketName: true, price: true } },
        answers: {
          include: {
            question: { select: { id: true, label: true, questionType: true } },
          },
        },
      },
    });
    if (!participant) throw new NotFoundException("参加者が見つかりません");

    return {
      id: participant.id,
      user: formatAuthor(participant.user),
      ticket: participant.ticket,
      quantity: participant.quantity,
      status: participant.status,
      applicantEmail: participant.applicantEmail,
      applicantName: participant.applicantName,
      applicantNameKana: participant.applicantNameKana,
      applicantAffiliation: participant.applicantAffiliation,
      applicantGender: participant.applicantGender,
      applicantAge: participant.applicantAge,
      applicantOccupation: participant.applicantOccupation,
      applicantNationality: participant.applicantNationality,
      appliedAt: participant.appliedAt,
      canceledAt: participant.canceledAt,
      answers: participant.answers.map((a) => ({
        questionId: a.questionId,
        label: a.question.label,
        questionType: a.question.questionType,
        answer: a.answer,
      })),
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
        ...(dto.status === "attended" && { attendedAt: new Date() }),
        ...(dto.status === "applied" && { canceledAt: null, attendedAt: null }),
      },
    });
  }

  // ========== Stats ==========

  async getParticipantStats(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { tickets: true, applicationFormConfig: true },
    });
    if (!event || event.deletedAt) throw new NotFoundException("イベントが見つかりません");

    const activeWhere = { eventId, status: { not: "canceled" as const } };

    // groupBy / count / 回答 / 質問 を全て並列実行。参加者本体の findMany は廃止し、
    // SQL 集計（DB 内で COUNT）に置き換えることで参加者数によらず定数時間で完了する。
    const [
      statusGroups,
      canceledTotal,
      genderGroups,
      ageGroups,
      occupationGroups,
      affiliationGroups,
      nationalityGroups,
      answers,
      questions,
    ] = await Promise.all([
      this.prisma.eventParticipant.groupBy({
        by: ["status"],
        where: activeWhere,
        _count: { _all: true },
      }),
      this.prisma.eventParticipant.count({ where: { eventId, status: "canceled" } }),
      this.prisma.eventParticipant.groupBy({
        by: ["applicantGender"],
        where: activeWhere,
        _count: { _all: true },
      }),
      this.prisma.eventParticipant.groupBy({
        by: ["applicantAge"],
        where: activeWhere,
        _count: { _all: true },
      }),
      this.prisma.eventParticipant.groupBy({
        by: ["applicantOccupation"],
        where: activeWhere,
        _count: { _all: true },
      }),
      this.prisma.eventParticipant.groupBy({
        by: ["applicantAffiliation"],
        where: activeWhere,
        _count: { _all: true },
      }),
      this.prisma.eventParticipant.groupBy({
        by: ["applicantNationality"],
        where: activeWhere,
        _count: { _all: true },
      }),
      this.prisma.eventParticipantAnswer.findMany({
        where: { participant: activeWhere },
        select: { questionId: true, answer: true },
      }),
      this.prisma.eventApplicationQuestion.findMany({
        where: { eventId },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const total = statusGroups.reduce((s, g) => s + g._count._all, 0);
    const attendedTotal = statusGroups.find((g) => g.status === "attended")?._count._all ?? 0;
    const noShowTotal = statusGroups.find((g) => g.status === "no_show")?._count._all ?? 0;
    const attendanceRate = total > 0 ? Math.round((attendedTotal / total) * 100) : null;

    const tickets = event.tickets.map((t) => ({
      ticketId: t.id,
      ticketName: t.ticketName,
      soldCount: t.soldCount,
      capacity: t.capacity,
    }));

    // groupBy 結果から null を除外して [key, count] のタプル配列に変換
    const genderEntries: Array<[string, number]> = genderGroups
      .filter((g) => g.applicantGender !== null)
      .map((g) => [g.applicantGender as string, g._count._all]);
    const occupationEntries: Array<[string, number]> = occupationGroups
      .filter((g) => g.applicantOccupation !== null)
      .map((g) => [g.applicantOccupation as string, g._count._all]);
    const affiliationEntries: Array<[string, number]> = affiliationGroups
      .filter((g) => g.applicantAffiliation !== null)
      .map((g) => [g.applicantAffiliation as string, g._count._all]);
    const nationalityEntries: Array<[string, number]> = nationalityGroups
      .filter((g) => g.applicantNationality !== null)
      .map((g) => [g.applicantNationality as string, g._count._all]);

    // applicantAge は数値 groupBy なので JS 側で band に集約
    const ageBandCounts = new Map<string, number>();
    let ageAnswered = 0;
    for (const g of ageGroups) {
      if (g.applicantAge == null) continue;
      const c = g._count._all;
      ageAnswered += c;
      const band =
        g.applicantAge < 20
          ? "<20"
          : g.applicantAge < 30
            ? "20-29"
            : g.applicantAge < 40
              ? "30-39"
              : g.applicantAge < 50
                ? "40-49"
                : g.applicantAge < 60
                  ? "50-59"
                  : "60+";
      ageBandCounts.set(band, (ageBandCounts.get(band) ?? 0) + c);
    }

    const sumEntries = (e: Array<[string, number]>) => e.reduce((s, [, c]) => s + c, 0);

    const topN = (entries: Iterable<[string, number]>, limit = 10) => {
      const sorted = [...entries].sort((a, b) => b[1] - a[1]);
      const top = sorted.slice(0, limit).map(([key, count]) => ({ key, count }));
      const otherCount = sorted.slice(limit).reduce((sum, [, c]) => sum + c, 0);
      if (otherCount > 0) top.push({ key: "other", count: otherCount });
      return top;
    };

    // answers は Json 型のため JS で集計（option counts）。質問ごとに分離
    const answersByQuestion = new Map<string, unknown[]>();
    for (const a of answers) {
      const arr = answersByQuestion.get(a.questionId) ?? [];
      arr.push(a.answer);
      answersByQuestion.set(a.questionId, arr);
    }

    const questionStats = questions.map((q) => {
      const qAnswers = answersByQuestion.get(q.id) ?? [];
      const answered = qAnswers.length;
      let optionCounts: Array<{ value: string; label: string; count: number }> | undefined;

      if (
        q.questionType === "radio" ||
        q.questionType === "select" ||
        q.questionType === "checkbox"
      ) {
        const options = (q.options as Array<{ value: string; label: string }>) ?? [];
        const counts = new Map<string, number>();
        for (const a of qAnswers) {
          const vals = Array.isArray(a) ? (a as string[]) : [a as string];
          for (const v of vals) {
            counts.set(v, (counts.get(v) ?? 0) + 1);
          }
        }
        optionCounts = options.map((o) => ({
          value: o.value,
          label: o.label,
          count: counts.get(o.value) ?? 0,
        }));
      }

      return {
        questionId: q.id,
        label: q.label,
        questionType: q.questionType,
        answered,
        optionCounts,
      };
    });

    return {
      total,
      canceledTotal,
      attendedTotal,
      noShowTotal,
      attendanceRate,
      tickets,
      basicAttributes: {
        gender: { values: topN(genderEntries), answered: sumEntries(genderEntries) },
        ageBands: { values: topN(ageBandCounts.entries()), answered: ageAnswered },
        occupation: { values: topN(occupationEntries), answered: sumEntries(occupationEntries) },
        affiliation: {
          values: topN(affiliationEntries),
          answered: sumEntries(affiliationEntries),
        },
        nationality: {
          values: topN(nationalityEntries),
          answered: sumEntries(nationalityEntries),
        },
      },
      questions: questionStats,
    };
  }

  // ========== Duplicate ==========

  async duplicate(id: string, userId: string) {
    const source = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tickets: true,
        applicationFormConfig: true,
        applicationQuestions: { orderBy: { sortOrder: "asc" } },
        speakers: { orderBy: { sortOrder: "asc" } },
        organizations: { orderBy: { sortOrder: "asc" } },
        tags: { include: { tag: true } },
      },
    });
    if (!source || source.deletedAt) throw new NotFoundException("イベントが見つかりません");

    const newEvent = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          title: `${source.title}（コピー）`,
          description: source.description,
          locationType: source.locationType,
          venueId: source.venueId,
          venueName: source.venueName,
          venueAddress: source.venueAddress,
          onlineUrl: source.onlineUrl,
          startAt: source.startAt,
          endAt: source.endAt,
          registrationDeadlineAt: source.registrationDeadlineAt,
          ticketSaleStartAt: source.ticketSaleStartAt,
          allowMultiTicketPurchase: source.allowMultiTicketPurchase,
          acceptedPaymentMethods: source.acceptedPaymentMethods ?? undefined,
          planningRole: source.planningRole,
          eventType: source.eventType,
          accessInfo: source.accessInfo,
          participationMethod: source.participationMethod,
          contactInfo: source.contactInfo,
          cancellationPolicy: source.cancellationPolicy,
          language: source.language,
          isAttendeeVisible: source.isAttendeeVisible,
          status: "draft",
          coverImageUrl: source.coverImageUrl,
          requiredRankId: source.requiredRankId,
          createdByUserId: userId,
          participantCount: 0,
          isCalendarVisible: source.isCalendarVisible,
        },
      });

      // チケット複製
      if (source.tickets.length > 0) {
        await tx.eventTicket.createMany({
          data: source.tickets.map((t) => ({
            eventId: event.id,
            ticketName: t.ticketName,
            price: t.price,
            currency: t.currency,
            capacity: t.capacity,
            purchaseLimit: t.purchaseLimit,
            sortOrder: t.sortOrder,
            isActive: t.isActive,
            soldCount: 0,
          })),
        });
      }

      // 申込フォーム設定複製
      if (source.applicationFormConfig) {
        const cfg = source.applicationFormConfig;
        await tx.eventApplicationFormConfig.create({
          data: {
            eventId: event.id,
            notifyOnCapacityReached: cfg.notifyOnCapacityReached,
            notifyOnRemainingThreshold: cfg.notifyOnRemainingThreshold,
            completionMessageApp: cfg.completionMessageApp,
            completionMessageEmail: cfg.completionMessageEmail,
            askName: cfg.askName,
            askNameKana: cfg.askNameKana,
            askAffiliation: cfg.askAffiliation,
            askGender: cfg.askGender,
            askAge: cfg.askAge,
            askOccupation: cfg.askOccupation,
            askNationality: cfg.askNationality,
            reminderEnabled: cfg.reminderEnabled,
            reminderHoursBefore: cfg.reminderHoursBefore,
            reminderMessage: cfg.reminderMessage,
          },
        });
      }

      // カスタム質問複製
      if (source.applicationQuestions.length > 0) {
        await tx.eventApplicationQuestion.createMany({
          data: source.applicationQuestions.map((q) => ({
            eventId: event.id,
            label: q.label,
            description: q.description,
            questionType: q.questionType,
            options: q.options ?? undefined,
            isRequired: q.isRequired,
            sortOrder: q.sortOrder,
          })),
        });
      }

      // 登壇者複製
      if (source.speakers.length > 0) {
        await tx.eventSpeaker.createMany({
          data: source.speakers.map((s) => ({
            eventId: event.id,
            userId: s.userId,
            name: s.name,
            title: s.title,
            role: s.role,
            sortOrder: s.sortOrder,
          })),
        });
      }

      // 関係団体複製
      if (source.organizations.length > 0) {
        await tx.eventOrganization.createMany({
          data: source.organizations.map((o) => ({
            eventId: event.id,
            organizationName: o.organizationName,
            role: o.role,
            sortOrder: o.sortOrder,
          })),
        });
      }

      // タグ複製（syncEventTags 経由で EventTag + tags_text を同期）
      if (source.tags.length > 0) {
        await this.syncEventTags(
          tx,
          event.id,
          source.tags.map((t) => t.tag.name),
        );
      }

      return event;
    });

    return this.findOne(newEvent.id, "admin");
  }

  // ========== Calendar ==========

  async getCalendarEvents(from: string, to: string, role: UserRole) {
    return this.prisma.event.findMany({
      where: {
        deletedAt: null,
        isCalendarVisible: true,
        startAt: { gte: new Date(from), lte: new Date(to) },
        ...(canViewAllEventStatuses(role) ? {} : { status: EventStatus.recruiting }),
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

  async findUpcoming(limit: number) {
    const events = await this.prisma.event.findMany({
      where: {
        deletedAt: null,
        isCalendarVisible: true,
        startAt: { gte: new Date() },
        status: { in: UPCOMING_LISTABLE_STATUSES },
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        locationType: true,
        status: true,
        coverImageUrl: true,
        venueName: true,
        venue: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt,
      endAt: e.endAt,
      locationType: e.locationType,
      status: e.status,
      coverImageUrl: e.coverImageUrl,
      venueName: e.venue?.name ?? e.venueName,
    }));
  }

  async findMyUpcoming(userId: string, days: number) {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);

    const participants = await this.prisma.eventParticipant.findMany({
      where: {
        userId,
        status: { not: ParticipantStatus.canceled },
        event: {
          deletedAt: null,
          status: { not: EventStatus.canceled },
          endAt: { gte: now },
          startAt: { lte: end },
        },
      },
      select: {
        status: true,
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            locationType: true,
            venueName: true,
            venue: { select: { name: true } },
          },
        },
      },
      orderBy: { event: { startAt: "asc" } },
    });

    return participants.map((p) => ({
      eventId: p.event.id,
      title: p.event.title,
      startAt: p.event.startAt,
      endAt: p.event.endAt,
      locationType: p.event.locationType,
      venueName: p.event.venue?.name ?? p.event.venueName,
      participantStatus: p.status,
    }));
  }

  // ========== Reminder ==========

  async scheduleReminder(eventId: string) {
    if (!this.reminderQueue) return;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { applicationFormConfig: true },
    });
    if (!event || event.deletedAt) return;

    const config = event.applicationFormConfig;
    if (!config?.reminderEnabled || !event.startAt) return;

    // Remove existing job for this event
    await this.cancelReminder(eventId);

    const delay =
      event.startAt.getTime() - config.reminderHoursBefore * 60 * 60 * 1000 - Date.now();
    if (delay <= 0) return; // Already past the reminder time

    await this.reminderQueue.add(
      `event-reminder-${eventId}`,
      { eventId },
      {
        jobId: `event-reminder-${eventId}`,
        delay,
        removeOnComplete: true,
        removeOnFail: 5,
      },
    );
  }

  async cancelReminder(eventId: string) {
    if (!this.reminderQueue) return;

    const jobId = `event-reminder-${eventId}`;
    const job = await this.reminderQueue.getJob(jobId);
    if (job) {
      await job.remove().catch(() => {});
    }
  }

  // ========== Helpers ==========

  /**
   * タグ名の配列から、対応する Tag レコードを upsert（find by name → 既存再利用、なければ新規作成）し、
   * `EventTag` リンクと `events.tags_text` を一括で更新する。
   *
   * トランザクション内で呼ぶ前提。tags が空配列なら EventTag 全削除 + tags_text='' に同期。
   *
   * slug は name をそのまま使う。VARCHAR(50) を超える場合は truncate、衝突時は `-2` `-3` ... を付与。
   */
  private async syncEventTags(
    tx: Prisma.TransactionClient,
    eventId: string,
    tagNames: string[],
  ): Promise<void> {
    // 重複・空文字を除去
    const uniqueNames = Array.from(
      new Set(tagNames.map((n) => n.trim()).filter((n) => n.length > 0)),
    );

    // 各タグを find/create
    const tagIds: string[] = [];
    for (const name of uniqueNames) {
      const existing = await tx.tag.findFirst({ where: { name }, select: { id: true } });
      if (existing) {
        tagIds.push(existing.id);
        continue;
      }
      const created = await this.createTagWithUniqueSlug(tx, name);
      tagIds.push(created.id);
    }

    // EventTag を全件置換
    await tx.eventTag.deleteMany({ where: { eventId } });
    if (tagIds.length > 0) {
      await tx.eventTag.createMany({
        data: tagIds.map((tagId) => ({ eventId, tagId })),
        skipDuplicates: true,
      });
    }

    // tags_text を同期（スペース区切り、name ソートで安定化）
    const tagsText = [...uniqueNames].sort().join(" ");
    await tx.event.update({ where: { id: eventId }, data: { tagsText } });
  }

  /**
   * 名前から slug を生成して Tag を作成する。slug 衝突時は -2, -3 ... と suffix を付与。
   * VARCHAR(50) を超える slug は base を truncate して suffix の余地を確保。
   */
  private async createTagWithUniqueSlug(
    tx: Prisma.TransactionClient,
    name: string,
  ): Promise<{ id: string }> {
    const SLUG_MAX = 50;
    const baseSlug = name.slice(0, SLUG_MAX);
    for (let suffix = 1; suffix <= 100; suffix++) {
      const slug = suffix === 1 ? baseSlug : `${baseSlug.slice(0, SLUG_MAX - 4)}-${suffix}`;
      const conflict = await tx.tag.findUnique({ where: { slug }, select: { id: true } });
      if (!conflict) {
        return tx.tag.create({ data: { name, slug }, select: { id: true } });
      }
    }
    throw new BadRequestException("タグの slug 衝突上限を超えました");
  }

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
      venueId: event.venueId,
      venueName: event.venue?.name ?? event.venueName,
      venueAddress: event.venue?.address ?? event.venueAddress,
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
      requiredRank: event.requiredRank,
      createdBy: formatAuthor(event.createdByUser),
      tickets: event.tickets,
      speakers: event.speakers?.map((s: any) => ({
        id: s.id,
        name: s.name,
        title: s.title,
        role: s.role,
        sortOrder: s.sortOrder,
        user: s.user ? formatAuthor(s.user) : null,
      })),
      organizations: event.organizations,
      tags: event.tags?.map((t: any) => ({ id: t.tag.id, name: t.tag.name, slug: t.tag.slug })),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
