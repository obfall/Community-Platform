import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "@/prisma/prisma.service";
import { ListActivityLogDto } from "./dto/list-activity-log.dto";
import { ListLoginHistoryDto } from "./dto/list-login-history.dto";

const EXPORT_LIMIT = 10000;

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  profile: { select: { avatarUrl: true } },
} as const;

type UserWithProfile = {
  id: string;
  name: string;
  email: string;
  profile: { avatarUrl: string | null } | null;
};

function flattenUser(user: UserWithProfile) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}

@Injectable()
export class UsageHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  private buildActivityWhere(query: ListActivityLogDto): Prisma.ActivityLogWhereInput {
    const where: Prisma.ActivityLogWhereInput = {};
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    if (query.search) {
      where.user = {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }
    return where;
  }

  private buildLoginWhere(query: ListLoginHistoryDto): Prisma.LoginHistoryWhereInput {
    const where: Prisma.LoginHistoryWhereInput = {};
    if (query.userId) where.userId = query.userId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    if (query.search) {
      where.user = {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }
    return where;
  }

  async listActivityLogs(query: ListActivityLogDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildActivityWhere(query);

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { user: { select: USER_SELECT } },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: logs.map((log) => ({ ...log, user: flattenUser(log.user) })),
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

  async listLoginHistories(query: ListLoginHistoryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildLoginWhere(query);

    const [logs, total] = await Promise.all([
      this.prisma.loginHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { user: { select: USER_SELECT } },
      }),
      this.prisma.loginHistory.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: logs.map((log) => ({ ...log, user: flattenUser(log.user) })),
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

  async getActivityLogsForExport(query: ListActivityLogDto) {
    const logs = await this.prisma.activityLog.findMany({
      where: this.buildActivityWhere(query),
      orderBy: { createdAt: "desc" },
      take: EXPORT_LIMIT,
      include: { user: { select: USER_SELECT } },
    });
    return logs.map((log) => ({ ...log, user: flattenUser(log.user) }));
  }

  async getLoginHistoriesForExport(query: ListLoginHistoryDto) {
    const logs = await this.prisma.loginHistory.findMany({
      where: this.buildLoginWhere(query),
      orderBy: { createdAt: "desc" },
      take: EXPORT_LIMIT,
      include: { user: { select: USER_SELECT } },
    });
    return logs.map((log) => ({ ...log, user: flattenUser(log.user) }));
  }
}
