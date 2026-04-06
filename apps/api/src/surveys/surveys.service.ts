import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateSurveyDto } from "./dto/create-survey.dto";
import type { SubmitResponseDto } from "./dto/submit-response.dto";
import type { SurveyQueryDto } from "./dto/survey-query.dto";

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SurveyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SurveyWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.search) where.title = { contains: query.search, mode: "insensitive" };

    const [data, total] = await Promise.all([
      this.prisma.survey.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { questions: true, responses: true } },
        },
      }),
      this.prisma.survey.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: data.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        isAnonymous: s.isAnonymous,
        targetType: s.targetType,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        responseCount: s.responseCount,
        questionCount: s._count.questions,
        createdBy: s.createdBy,
        createdAt: s.createdAt,
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
            options: q.options ?? Prisma.JsonNull,
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

  async updateStatus(id: string, status: "draft" | "active" | "closed") {
    const survey = await this.prisma.survey.findUnique({ where: { id } });
    if (!survey || survey.deletedAt) throw new NotFoundException("アンケートが見つかりません");

    return this.prisma.survey.update({
      where: { id },
      data: { status },
    });
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
