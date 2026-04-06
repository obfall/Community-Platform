import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** アクティビティログ記録 */
  async logActivity(
    userId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.activityLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  }

  /** ダッシュボード集計 */
  async getDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalMembers, activeMembers, totalEvents, totalVideos, recentSnapshots] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null, status: "active" } }),
        this.prisma.user.count({
          where: { deletedAt: null, status: "active", lastLoginAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.event.count({ where: { deletedAt: null } }),
        this.prisma.video.count({ where: { deletedAt: null, publishStatus: "published" } }),
        this.prisma.analyticsSnapshot.findMany({ orderBy: { snapshotDate: "desc" }, take: 30 }),
      ]);

    return {
      summary: { totalMembers, activeMembers, totalEvents, totalVideos },
      snapshots: recentSnapshots,
    };
  }

  /** メンバー活動分析 */
  async getMemberActivity(query: { page?: number; limit?: number; sortBy?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[query.sortBy ?? "loginCount"] = "desc";

    const [summaries, total] = await Promise.all([
      this.prisma.memberActivitySummary.findMany({
        skip,
        take: limit,
        orderBy: orderBy as any,
        include: {
          user: { select: { id: true, name: true, email: true, role: true, status: true } },
        },
      }),
      this.prisma.memberActivitySummary.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: summaries.map((s) => ({
        userId: s.userId,
        user: s.user,
        lastLoginAt: s.lastLoginAt,
        loginCount: s.loginCount,
        postCount: s.postCount,
        commentCount: s.commentCount,
        eventParticipationCount: s.eventParticipationCount,
        videoWatchCount: s.videoWatchCount,
        chatMessageCount: s.chatMessageCount,
        projectCount: s.projectCount,
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

  /** エンゲージメントスコアランキング */
  async getEngagementRanking(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [scores, total] = await Promise.all([
      this.prisma.engagementScore.findMany({
        skip,
        take: limit,
        orderBy: { score: "desc" },
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      this.prisma.engagementScore.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: scores.map((s) => ({
        userId: s.userId,
        user: s.user,
        score: Number(s.score),
        loginFrequencyScore: Number(s.loginFrequencyScore),
        postFrequencyScore: Number(s.postFrequencyScore),
        eventParticipationScore: Number(s.eventParticipationScore),
        videoWatchScore: Number(s.videoWatchScore),
        calculatedAt: s.calculatedAt,
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

  /** 最近のアクティビティログ */
  async getRecentActivity(query: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true } } },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: logs,
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
}
