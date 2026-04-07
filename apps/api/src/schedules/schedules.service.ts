import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateScheduleDto } from "./dto/create-schedule.dto";
import type { UpdateScheduleDto } from "./dto/update-schedule.dto";

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, startAt?: string, endAt?: string) {
    const where: Prisma.ScheduleWhereInput = { userId, deletedAt: null };
    if (startAt && endAt) {
      where.AND = [{ endAt: { gte: new Date(startAt) } }, { startAt: { lte: new Date(endAt) } }];
    }
    return this.prisma.schedule.findMany({ where, orderBy: { startAt: "asc" } });
  }

  async create(userId: string, dto: CreateScheduleDto) {
    return this.prisma.schedule.create({
      data: {
        userId,
        sourceType: null,
        sourceId: null,
        title: dto.title,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        isAllDay: dto.isAllDay ?? false,
        location: dto.location,
        visibility: dto.visibility ?? "private",
      },
    });
  }

  async update(userId: string, id: string, data: UpdateScheduleDto) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    if (!schedule || schedule.deletedAt)
      throw new NotFoundException("スケジュールが見つかりません");
    if (schedule.userId !== userId) throw new ForbiddenException("アクセス権がありません");
    if (schedule.sourceType !== null) {
      throw new BadRequestException("外部由来のスケジュールは更新できません");
    }
    return this.prisma.schedule.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startAt !== undefined && { startAt: new Date(data.startAt) }),
        ...(data.endAt !== undefined && { endAt: new Date(data.endAt) }),
        ...(data.isAllDay !== undefined && { isAllDay: data.isAllDay }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.visibility !== undefined && {
          visibility: data.visibility as "private" | "public",
        }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    if (!schedule || schedule.deletedAt)
      throw new NotFoundException("スケジュールが見つかりません");
    if (schedule.userId !== userId) throw new ForbiddenException("アクセス権がありません");
    await this.prisma.schedule.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
