import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CacheService } from "@/cache/cache.service";
import { Prisma } from "@prisma/client";
import type { GrantPointsDto } from "./dto/grant-points.dto";
import type { PointHistoryQueryDto } from "./dto/point-query.dto";
import type { CreatePointRuleDto } from "./dto/create-point-rule.dto";

const RULES_CACHE_KEY = "master:point-rules:all";
const RULES_CACHE_PREFIX = "master:point-rules:";
const CACHE_TTL_SEC = 60 * 60;

@Injectable()
export class PointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** ポイントサマリー取得（なければ作成） */
  async getSummary(userId: string) {
    return this.prisma.pointSummary.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  /** ポイント履歴一覧 */
  async getHistory(userId: string, query: PointHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PointHistoryWhereInput = { userId };
    if (query.type) where.type = query.type;

    const [data, total] = await Promise.all([
      this.prisma.pointHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          grantedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.pointHistory.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data,
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

  /** 管理者によるポイント付与 */
  async grantPoints(adminUserId: string, dto: GrantPointsDto) {
    const expiresAt = dto.expiryDays
      ? new Date(Date.now() + dto.expiryDays * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const history = await tx.pointHistory.create({
        data: {
          userId: dto.userId,
          points: dto.points,
          type: "admin_grant",
          description: dto.description,
          remainingPoints: dto.points,
          expiresAt,
          grantedByUserId: adminUserId,
        },
      });

      await tx.pointSummary.upsert({
        where: { userId: dto.userId },
        update: {
          totalGranted: { increment: dto.points },
          availablePoints: { increment: dto.points },
          lastActivityAt: new Date(),
        },
        create: {
          userId: dto.userId,
          totalGranted: dto.points,
          availablePoints: dto.points,
          lastActivityAt: new Date(),
        },
      });

      return history;
    });
  }

  /** ポイント利用 */
  async utilizePoints(userId: string, points: number, description?: string) {
    const summary = await this.getSummary(userId);
    if (summary.availablePoints < points) {
      throw new NotFoundException("ポイントが不足しています");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.pointHistory.create({
        data: {
          userId,
          points: -points,
          type: "utilization",
          description,
        },
      });

      await tx.pointSummary.update({
        where: { userId },
        data: {
          totalUtilized: { increment: points },
          availablePoints: { decrement: points },
          lastActivityAt: new Date(),
        },
      });
    });
  }

  // --- ルール管理 ---

  async getRules() {
    return this.cache.getOrSet(
      RULES_CACHE_KEY,
      () => this.prisma.pointRule.findMany({ orderBy: { createdAt: "desc" } }),
      CACHE_TTL_SEC,
    );
  }

  async createRule(dto: CreatePointRuleDto) {
    const created = await this.prisma.pointRule.create({
      data: {
        name: dto.name,
        triggerEvent: dto.triggerEvent,
        pointAmount: dto.pointAmount,
        expiryDays: dto.expiryDays,
        conditions: (dto.conditions as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
    await this.cache.invalidate(RULES_CACHE_PREFIX);
    return created;
  }

  async updateRule(
    id: string,
    data: { name?: string; pointAmount?: number; expiryDays?: number; isActive?: boolean },
  ) {
    const updated = await this.prisma.pointRule.update({ where: { id }, data });
    await this.cache.invalidate(RULES_CACHE_PREFIX);
    return updated;
  }

  async deleteRule(id: string) {
    await this.prisma.pointRule.delete({ where: { id } });
    await this.cache.invalidate(RULES_CACHE_PREFIX);
  }
}
