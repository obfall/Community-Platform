import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { NotificationsService } from "@/notifications/notifications.service";
import {
  buildPaginationMeta,
  escapePgroongaQuery,
  extractPagination,
  pgroongaSearchAndFetch,
} from "@/common/utils";
import { Prisma } from "@prisma/client";
import type { CreateSurveyDto } from "./dto/create-survey.dto";
import type { SubmitResponseDto } from "./dto/submit-response.dto";
import type { SurveyQueryDto } from "./dto/survey-query.dto";

@Injectable()
export class SurveysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(query: SurveyQueryDto) {
    const escaped = query.search ? escapePgroongaQuery(query.search) : "";
    if (escaped) {
      return this.searchByPgroonga(query, escaped);
    }
    return this.findAllStandard(query);
  }

  private async findAllStandard(query: SurveyQueryDto) {
    const { page, limit, skip } = extractPagination(query);

    const where: Prisma.SurveyWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.eventId) {
      where.eventId = query.eventId;
    } else {
      where.eventId = null;
    }

    const [data, total] = await Promise.all([
      this.prisma.survey.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: this.surveyListInclude(),
      }),
      this.prisma.survey.count({ where }),
    ]);

    return this.formatSurveyList(data, total, page, limit);
  }

  /** pgroonga による全文検索版。検索条件は通常一覧と一致させる（下書き含む）。 */
  private async searchByPgroonga(query: SurveyQueryDto, escaped: string) {
    const { page, limit, offset } = extractPagination(query);

    const where = Prisma.sql`
      deleted_at IS NULL
      ${query.status ? Prisma.sql`AND status = ${query.status}::"SurveyStatus"` : Prisma.empty}
      ${query.eventId ? Prisma.sql`AND event_id = ${query.eventId}::uuid` : Prisma.sql`AND event_id IS NULL`}
    `;

    const { records, hitsById, total } = await pgroongaSearchAndFetch({
      prisma: this.prisma,
      table: "surveys",
      searchColumns: ["title", "description"],
      titleColumn: "title",
      snippetColumn: "description",
      escaped,
      where,
      limit,
      offset,
      fetchByIds: (ids) =>
        this.prisma.survey.findMany({
          where: { id: { in: ids }, deletedAt: null },
          include: this.surveyListInclude(),
        }),
    });

    return this.formatSurveyList(records, total, page, limit, hitsById);
  }

  private surveyListInclude() {
    return {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { questions: true, responses: true } },
    } satisfies Prisma.SurveyInclude;
  }

  private formatSurveyList(
    data: Array<
      Prisma.SurveyGetPayload<{
        include: {
          createdBy: { select: { id: true; name: true } };
          _count: { select: { questions: true; responses: true } };
        };
      }>
    >,
    total: number,
    page: number,
    limit: number,
    hitsById?: Map<string, { titleHighlighted: string; snippetHighlighted: string }>,
  ) {
    return {
      data: data.map((s) => {
        const h = hitsById?.get(s.id);
        return {
          id: s.id,
          title: s.title,
          description: s.description,
          titleHighlighted: h?.titleHighlighted,
          snippetHighlighted: h?.snippetHighlighted,
          status: s.status,
          isAnonymous: s.isAnonymous,
          targetType: s.targetType,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          eventId: s.eventId,
          responseCount: s.responseCount,
          notifiedAt: s.notifiedAt,
          remindedAt: s.remindedAt,
          questionCount: s._count.questions,
          createdBy: s.createdBy,
          createdAt: s.createdAt,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!survey || survey.deletedAt) throw new NotFoundException("アンケートが見つかりません");
    return survey;
  }

  async create(userId: string, dto: CreateSurveyDto) {
    return this.prisma.survey.create({
      data: {
        title: dto.title,
        description: dto.description,
        eventId: dto.eventId,
        isAnonymous: dto.isAnonymous ?? false,
        targetType: dto.targetType ?? "all",
        targetFilter: (dto.targetFilter as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        createdByUserId: userId,
        questions: {
          create: dto.questions.map((q, i) => ({
            questionType: q.questionType,
            questionText: q.questionText,
            isRequired: q.isRequired ?? false,
            sortOrder: q.sortOrder ?? i,
            options: q.options ? (q.options as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
            minValue: q.minValue,
            maxValue: q.maxValue,
          })),
        },
      },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  async update(
    id: string,
    dto: {
      title?: string;
      description?: string | null;
      isAnonymous?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
      questions?: Array<{
        id?: string;
        questionType: string;
        questionText: string;
        isRequired?: boolean;
        sortOrder?: number;
        options?: Array<{ value: string; label: string }>;
        minValue?: number | null;
        maxValue?: number | null;
      }>;
    },
  ) {
    const survey = await this.prisma.survey.findUnique({ where: { id } });
    if (!survey || survey.deletedAt) throw new NotFoundException("アンケートが見つかりません");

    // 質問の更新: 既存を全削除して再作成（シンプルな方式）
    if (dto.questions) {
      await this.prisma.surveyQuestion.deleteMany({ where: { surveyId: id } });
    }

    return this.prisma.survey.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isAnonymous !== undefined && { isAnonymous: dto.isAnonymous }),
        ...(dto.startsAt !== undefined && {
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }),
        ...(dto.questions && {
          questions: {
            create: dto.questions.map((q, i) => ({
              questionType: q.questionType as
                | "single_choice"
                | "multi_choice"
                | "text"
                | "rating"
                | "number",
              questionText: q.questionText,
              isRequired: q.isRequired ?? false,
              sortOrder: q.sortOrder ?? i,
              options: q.options ?? Prisma.JsonNull,
              minValue: q.minValue,
              maxValue: q.maxValue,
            })),
          },
        }),
      },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  async updateStatus(id: string, status: "draft" | "active" | "closed") {
    const survey = await this.prisma.survey.findUnique({ where: { id } });
    if (!survey || survey.deletedAt) throw new NotFoundException("アンケートが見つかりません");

    const now = new Date();
    const updated = await this.prisma.survey.update({
      where: { id },
      data: {
        status,
        // 初回 active 化時に notifiedAt を記録
        ...(status === "active" && survey.status !== "active" && !survey.notifiedAt
          ? { notifiedAt: now }
          : {}),
      },
    });

    // active に変更時、メンバー全員に初回通知を発行
    if (status === "active" && survey.status !== "active") {
      const members = await this.prisma.user.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true },
      });

      if (members.length > 0) {
        await this.notifications.createMany(
          members.map((m: { id: string }) => ({
            userId: m.id,
            type: "survey",
            title: "新しいアンケートが届きました",
            body: survey.title,
            referenceType: "survey",
            referenceId: id,
          })),
        );
      }
    }

    return updated;
  }

  async remove(id: string) {
    await this.prisma.survey.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** 回答送信 */
  async submitResponse(surveyId: string, userId: string | null, dto: SubmitResponseDto) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: true },
    });
    if (!survey || survey.deletedAt) throw new NotFoundException("アンケートが見つかりません");
    if (survey.status !== "active")
      throw new BadRequestException("このアンケートは現在回答を受け付けていません");

    if (survey.endsAt && new Date() > survey.endsAt) {
      throw new BadRequestException("回答期限を過ぎています");
    }

    const respondentUserId = survey.isAnonymous ? null : userId;

    if (respondentUserId) {
      const existing = await this.prisma.surveyResponse.findUnique({
        where: { surveyId_respondentUserId: { surveyId, respondentUserId } },
      });
      if (existing) throw new BadRequestException("既に回答済みです");
    }

    const response = await this.prisma.surveyResponse.create({
      data: {
        surveyId,
        respondentUserId,
        answers: {
          create: dto.answers.map((a) => ({
            questionId: a.questionId,
            selectedOptions: a.selectedOptions ?? Prisma.JsonNull,
            textValue: a.textValue,
            numericValue: a.numericValue,
          })),
        },
      },
      include: { answers: true },
    });

    await this.prisma.survey.update({
      where: { id: surveyId },
      data: { responseCount: { increment: 1 } },
    });

    // 回答者のアンケート関連通知を自動既読にする
    if (userId) {
      await this.prisma.notification.updateMany({
        where: {
          userId,
          referenceType: "survey",
          referenceId: surveyId,
          isRead: false,
        },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return response;
  }

  /** 結果集計 */
  async getResults(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        responses: {
          include: { answers: true },
        },
      },
    });
    if (!survey || survey.deletedAt) throw new NotFoundException("アンケートが見つかりません");

    const results = survey.questions.map((q) => {
      const answers = survey.responses.flatMap((r) =>
        r.answers.filter((a) => a.questionId === q.id),
      );

      return {
        question: q,
        totalAnswers: answers.length,
        ...(q.questionType === "single_choice" || q.questionType === "multi_choice"
          ? {
              optionCounts: this.countOptions(answers),
            }
          : {}),
        ...(q.questionType === "rating" || q.questionType === "number"
          ? {
              average: this.calcAverage(answers),
              min: this.calcMin(answers),
              max: this.calcMax(answers),
            }
          : {}),
        ...(q.questionType === "text"
          ? { textAnswers: answers.map((a) => a.textValue).filter(Boolean) }
          : {}),
      };
    });

    return {
      survey: { id: survey.id, title: survey.title, responseCount: survey.responseCount },
      results,
    };
  }

  /** 未回答アンケート一覧（メンバー向け） */
  async findPending(userId: string) {
    // ユーザーが既に回答済みのアンケートIDを取得
    const responded = await this.prisma.surveyResponse.findMany({
      where: { respondentUserId: userId },
      select: { surveyId: true },
    });
    const respondedIds = responded.map((r) => r.surveyId);

    const surveys = await this.prisma.survey.findMany({
      where: {
        deletedAt: null,
        status: "active",
        id: respondedIds.length > 0 ? { notIn: respondedIds } : undefined,
        OR: [
          { eventId: null },
          {
            event: {
              participants: {
                some: {
                  userId,
                  status: { in: ["applied", "confirmed", "attended"] },
                },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        event: { select: { id: true, title: true } },
        _count: { select: { questions: true } },
      },
    });

    return surveys.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      eventId: s.eventId,
      eventTitle: s.event?.title ?? null,
      questionCount: s._count.questions,
      createdAt: s.createdAt,
    }));
  }

  /** 送信先一覧 + 回答状況 */
  async getRecipients(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      select: {
        id: true,
        title: true,
        status: true,
        notifiedAt: true,
        remindedAt: true,
        responseCount: true,
        deletedAt: true,
      },
    });
    if (!survey || survey.deletedAt) throw new NotFoundException("アンケートが見つかりません");

    // 全アクティブメンバー
    const members = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        profile: { select: { avatarUrl: true } },
      },
      orderBy: { name: "asc" },
    });

    // 回答済みユーザーIDセット
    const responses = await this.prisma.surveyResponse.findMany({
      where: { surveyId },
      select: { respondentUserId: true, submittedAt: true },
    });
    const respondedMap = new Map(
      responses.filter((r) => r.respondentUserId).map((r) => [r.respondentUserId!, r.submittedAt]),
    );

    return {
      survey: {
        id: survey.id,
        title: survey.title,
        status: survey.status,
        notifiedAt: survey.notifiedAt,
        remindedAt: survey.remindedAt,
        responseCount: survey.responseCount,
      },
      recipients: members.map((m) => ({
        userId: m.id,
        name: m.name,
        avatarUrl: m.profile?.avatarUrl ?? null,
        responded: respondedMap.has(m.id),
        respondedAt: respondedMap.get(m.id) ?? null,
      })),
    };
  }

  /** 未回答者全員にリマインド通知を送信 */
  async sendReminder(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
    });
    if (!survey || survey.deletedAt) throw new NotFoundException("アンケートが見つかりません");
    if (survey.status !== "active")
      throw new BadRequestException("受付中のアンケートのみリマインドを送信できます");

    // 回答済みユーザーIDを取得
    const responded = await this.prisma.surveyResponse.findMany({
      where: { surveyId },
      select: { respondentUserId: true },
    });
    const respondedIds = new Set(responded.map((r) => r.respondentUserId).filter(Boolean));

    // 未回答のアクティブメンバー
    const members = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });
    const unreplied = members.filter((m) => !respondedIds.has(m.id));

    if (unreplied.length > 0) {
      await this.notifications.createMany(
        unreplied.map((m) => ({
          userId: m.id,
          type: "survey",
          title: "アンケートの回答をお願いします",
          body: survey.title,
          referenceType: "survey",
          referenceId: surveyId,
        })),
      );
    }

    await this.prisma.survey.update({
      where: { id: surveyId },
      data: { remindedAt: new Date() },
    });

    return { sentCount: unreplied.length };
  }

  /** 個別ユーザーにリマインド通知を送信 */
  async sendReminderToUser(surveyId: string, targetUserId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
    });
    if (!survey || survey.deletedAt) throw new NotFoundException("アンケートが見つかりません");
    if (survey.status !== "active")
      throw new BadRequestException("受付中のアンケートのみリマインドを送信できます");

    // 既に回答済みか確認
    const existing = await this.prisma.surveyResponse.findFirst({
      where: { surveyId, respondentUserId: targetUserId },
    });
    if (existing) throw new BadRequestException("このユーザーは既に回答済みです");

    await this.notifications.create({
      userId: targetUserId,
      type: "survey",
      title: "アンケートの回答をお願いします",
      body: survey.title,
      referenceType: "survey",
      referenceId: surveyId,
    });

    return { sent: true };
  }

  private countOptions(answers: Array<{ selectedOptions: unknown }>) {
    const counts: Record<string, number> = {};
    for (const a of answers) {
      const opts = a.selectedOptions as string[] | null;
      if (opts && Array.isArray(opts)) {
        for (const o of opts) {
          counts[o] = (counts[o] ?? 0) + 1;
        }
      }
    }
    return counts;
  }

  private calcAverage(answers: Array<{ numericValue: unknown }>) {
    const nums = answers.map((a) => Number(a.numericValue)).filter((n) => !isNaN(n));
    return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
  }

  private calcMin(answers: Array<{ numericValue: unknown }>) {
    const nums = answers.map((a) => Number(a.numericValue)).filter((n) => !isNaN(n));
    return nums.length ? Math.min(...nums) : null;
  }

  private calcMax(answers: Array<{ numericValue: unknown }>) {
    const nums = answers.map((a) => Number(a.numericValue)).filter((n) => !isNaN(n));
    return nums.length ? Math.max(...nums) : null;
  }
}
