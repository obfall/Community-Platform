import { Injectable, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { EventsService } from "./events.service";
import type { UpsertApplicationFormConfigDto } from "./dto/upsert-application-form-config.dto";
import type {
  CreateApplicationQuestionDto,
  UpdateApplicationQuestionDto,
  ReorderQuestionsDto,
} from "./dto/application-question.dto";

@Injectable()
export class ApplicationFormService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
  ) {}

  async getForm(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException("イベントが見つかりません");

    const [config, questions] = await Promise.all([
      this.prisma.eventApplicationFormConfig.findUnique({ where: { eventId } }),
      this.prisma.eventApplicationQuestion.findMany({
        where: { eventId },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return { config, questions };
  }

  async getFormPublic(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException("イベントが見つかりません");

    const [config, questions] = await Promise.all([
      this.prisma.eventApplicationFormConfig.findUnique({
        where: { eventId },
        select: {
          askName: true,
          askNameKana: true,
          askAffiliation: true,
          askGender: true,
          askAge: true,
          askOccupation: true,
          askNationality: true,
        },
      }),
      this.prisma.eventApplicationQuestion.findMany({
        where: { eventId },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          description: true,
          questionType: true,
          options: true,
          isRequired: true,
          sortOrder: true,
        },
      }),
    ]);

    return {
      config: config ?? {
        askName: "required",
        askNameKana: "hidden",
        askAffiliation: "hidden",
        askGender: "hidden",
        askAge: "hidden",
        askOccupation: "hidden",
        askNationality: "hidden",
      },
      questions,
    };
  }

  async upsertConfig(eventId: string, dto: UpsertApplicationFormConfigDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException("イベントが見つかりません");

    const config = await this.prisma.eventApplicationFormConfig.upsert({
      where: { eventId },
      create: { eventId, ...dto },
      update: dto,
    });

    // リマインダー設定変更時にジョブを再スケジュール
    if (dto.reminderEnabled !== undefined || dto.reminderHoursBefore !== undefined) {
      if (config.reminderEnabled) {
        await this.eventsService.scheduleReminder(eventId);
      } else {
        await this.eventsService.cancelReminder(eventId);
      }
    }

    return config;
  }

  async createQuestion(eventId: string, dto: CreateApplicationQuestionDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException("イベントが見つかりません");

    if (dto.sortOrder === undefined) {
      const maxSort = await this.prisma.eventApplicationQuestion.findFirst({
        where: { eventId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      dto.sortOrder = (maxSort?.sortOrder ?? -1) + 1;
    }

    return this.prisma.eventApplicationQuestion.create({
      data: {
        eventId,
        label: dto.label,
        description: dto.description,
        questionType: dto.questionType,
        // DTO クラスのインスタンス配列を Prisma の Json 入力型に変換するため as 経由でキャスト
        options: dto.options ? (dto.options as unknown as Prisma.InputJsonValue) : undefined,
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async updateQuestion(questionId: string, dto: UpdateApplicationQuestionDto) {
    const question = await this.prisma.eventApplicationQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException("質問が見つかりません");

    const { options, ...rest } = dto;
    return this.prisma.eventApplicationQuestion.update({
      where: { id: questionId },
      data: {
        ...rest,
        ...(options !== undefined && {
          options:
            options === null ? Prisma.JsonNull : (options as unknown as Prisma.InputJsonValue),
        }),
      },
    });
  }

  async deleteQuestion(questionId: string) {
    const question = await this.prisma.eventApplicationQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException("質問が見つかりません");

    await this.prisma.eventApplicationQuestion.delete({ where: { id: questionId } });
  }

  async reorderQuestions(eventId: string, dto: ReorderQuestionsDto) {
    await Promise.all(
      dto.items.map((item) =>
        this.prisma.eventApplicationQuestion.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return this.prisma.eventApplicationQuestion.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
    });
  }
}
