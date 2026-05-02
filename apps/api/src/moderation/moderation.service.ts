import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";
import { Prisma } from "@prisma/client";
import type { CreateReportDto } from "./dto/create-report.dto";
import type { UpdateReportDto } from "./dto/update-report.dto";
import type { CreateActionDto } from "./dto/create-action.dto";
import type { CreateBannedWordDto } from "./dto/create-banned-word.dto";

const BANNED_WORDS_CACHE_KEY = "master:banned-words:all";
const BANNED_WORDS_CACHE_PREFIX = "master:banned-words:";
const CACHE_TTL_SEC = 60 * 60;

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // --- Reports ---

  async createReport(reporterUserId: string, dto: CreateReportDto) {
    return this.prisma.contentReport.create({
      data: {
        reporterUserId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        category: dto.category,
        description: dto.description,
      },
    });
  }

  async findAllReports(status?: string) {
    const where: Prisma.ContentReportWhereInput = {};
    if (status) where.status = status as "pending" | "reviewing" | "resolved" | "dismissed";
    return this.prisma.contentReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  async findOneReport(id: string) {
    const report = await this.prisma.contentReport.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        actions: {
          orderBy: { createdAt: "desc" },
          include: { moderator: { select: { id: true, name: true } } },
        },
      },
    });
    if (!report) throw new NotFoundException("通報が見つかりません");
    return report;
  }

  async updateReport(id: string, data: UpdateReportDto) {
    const existing = await this.prisma.contentReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("通報が見つかりません");
    return this.prisma.contentReport.update({
      where: { id },
      data: {
        ...(data.status !== undefined && {
          status: data.status as "pending" | "reviewing" | "resolved" | "dismissed",
        }),
        ...(data.assignedToUserId !== undefined && { assignedToUserId: data.assignedToUserId }),
        ...(data.status === "resolved" || data.status === "dismissed"
          ? { resolvedAt: new Date() }
          : {}),
      },
    });
  }

  // --- Actions ---

  async createAction(moderatorUserId: string, dto: CreateActionDto) {
    return this.prisma.moderationAction.create({
      data: {
        reportId: dto.reportId,
        moderatorUserId,
        actionType: dto.actionType,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        notes: dto.notes,
      },
    });
  }

  // --- Banned Words ---

  async findAllBannedWords() {
    return this.cache.getOrSet(
      BANNED_WORDS_CACHE_KEY,
      () => this.prisma.bannedWord.findMany({ orderBy: { createdAt: "desc" } }),
      CACHE_TTL_SEC,
    );
  }

  async createBannedWord(dto: CreateBannedWordDto) {
    const created = await this.prisma.bannedWord.create({
      data: {
        word: dto.word,
        matchType: dto.matchType ?? "exact",
        action: dto.action ?? "flag",
        replacement: dto.replacement,
        isActive: dto.isActive ?? true,
      },
    });
    await this.cache.invalidate(BANNED_WORDS_CACHE_PREFIX);
    return created;
  }

  async removeBannedWord(id: string) {
    const existing = await this.prisma.bannedWord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("禁止ワードが見つかりません");
    await this.prisma.bannedWord.delete({ where: { id } });
    await this.cache.invalidate(BANNED_WORDS_CACHE_PREFIX);
  }
}
