import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

export type ParticipationBucket = "0" | "1" | "2-4" | "5-9" | "10+";

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

    const [
      totalMembers,
      activeMembers,
      totalEvents,
      totalVideos,
      recentSnapshots,
      recentAttendedCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null, status: "active" } }),
      this.prisma.user.count({
        where: { deletedAt: null, status: "active", lastLoginAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.event.count({ where: { deletedAt: null } }),
      this.prisma.video.count({ where: { deletedAt: null, publishStatus: "published" } }),
      this.prisma.analyticsSnapshot.findMany({ orderBy: { snapshotDate: "desc" }, take: 30 }),
      this.prisma.eventParticipant.count({
        where: { status: "attended", attendedAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return {
      summary: {
        totalMembers,
        activeMembers,
        totalEvents,
        totalVideos,
        recentAttendedCount,
      },
      snapshots: recentSnapshots,
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

  /** 参加数分布ヒストグラム（active ユーザー × イベント参加回数） */
  async getEventParticipationDistribution() {
    const [totalActiveUsers, participations] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null, status: "active" } }),
      this.prisma.eventParticipant.groupBy({
        by: ["userId"],
        where: {
          status: { not: "canceled" },
          user: { deletedAt: null, status: "active" },
        },
        _count: { _all: true },
      }),
    ]);

    const buckets: Record<ParticipationBucket, number> = {
      "0": 0,
      "1": 0,
      "2-4": 0,
      "5-9": 0,
      "10+": 0,
    };

    let usersWithAnyParticipation = 0;
    for (const p of participations) {
      usersWithAnyParticipation += 1;
      const n = p._count._all;
      if (n >= 10) buckets["10+"] += 1;
      else if (n >= 5) buckets["5-9"] += 1;
      else if (n >= 2) buckets["2-4"] += 1;
      else if (n >= 1) buckets["1"] += 1;
    }
    buckets["0"] = Math.max(0, totalActiveUsers - usersWithAnyParticipation);

    return {
      totalActiveUsers,
      buckets: (
        [
          { label: "0回", bucket: "0" },
          { label: "1回", bucket: "1" },
          { label: "2-4回", bucket: "2-4" },
          { label: "5-9回", bucket: "5-9" },
          { label: "10回以上", bucket: "10+" },
        ] as const
      ).map((b) => ({ bucket: b.bucket, label: b.label, count: buckets[b.bucket] })),
    };
  }

  /** 月次参加者推移（直近 N ヶ月） */
  async getMonthlyParticipationTrend(months = 12) {
    const now = new Date();
    const fromDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1, 0, 0, 0),
    );

    const rows = await this.prisma.$queryRaw<
      Array<{ month: Date; unique_count: bigint; total_count: bigint }>
    >`
      SELECT
        date_trunc('month', COALESCE(ep.attended_at, e.start_at)) AS month,
        COUNT(DISTINCT ep.user_id) AS unique_count,
        COUNT(*) AS total_count
      FROM event_participants ep
      JOIN events e ON e.id = ep.event_id
      WHERE ep.status = 'attended'
        AND COALESCE(ep.attended_at, e.start_at) >= ${fromDate}
      GROUP BY month
      ORDER BY month ASC
    `;

    const keyed = new Map<string, { unique: number; total: number }>();
    for (const r of rows) {
      const d = new Date(r.month);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      keyed.set(key, { unique: Number(r.unique_count), total: Number(r.total_count) });
    }

    const result: Array<{
      month: string;
      uniqueParticipants: number;
      totalParticipations: number;
    }> = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const v = keyed.get(key) ?? { unique: 0, total: 0 };
      result.push({ month: key, uniqueParticipants: v.unique, totalParticipations: v.total });
    }

    return { months, data: result };
  }

  /** イベント別ランキング（開催日 desc） */
  async getEventRanking(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const total = await this.prisma.event.count({ where: { deletedAt: null } });

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        start_at: Date;
        cover_image_url: string | null;
        applied: bigint;
        attended: bigint;
        canceled: bigint;
        active: bigint;
        repeaters: bigint;
      }>
    >`
      WITH filtered_events AS (
        SELECT id, title, start_at, cover_image_url
        FROM events
        WHERE deleted_at IS NULL
        ORDER BY start_at DESC
        LIMIT ${limit} OFFSET ${skip}
      ),
      event_counts AS (
        SELECT
          ep.event_id,
          COUNT(*) AS applied,
          COUNT(*) FILTER (WHERE ep.status = 'attended') AS attended,
          COUNT(*) FILTER (WHERE ep.status = 'canceled') AS canceled,
          COUNT(*) FILTER (WHERE ep.status != 'canceled') AS active
        FROM event_participants ep
        WHERE ep.event_id IN (SELECT id FROM filtered_events)
        GROUP BY ep.event_id
      ),
      repeater_counts AS (
        SELECT
          ep.event_id,
          COUNT(DISTINCT ep.user_id) AS repeaters
        FROM event_participants ep
        JOIN events e ON e.id = ep.event_id
        WHERE ep.event_id IN (SELECT id FROM filtered_events)
          AND ep.status != 'canceled'
          AND EXISTS (
            SELECT 1 FROM event_participants ep2
            JOIN events e2 ON e2.id = ep2.event_id
            WHERE ep2.user_id = ep.user_id
              AND ep2.status != 'canceled'
              AND ep2.event_id != ep.event_id
              AND e2.start_at < e.start_at
          )
        GROUP BY ep.event_id
      )
      SELECT
        fe.id,
        fe.title,
        fe.start_at,
        fe.cover_image_url,
        COALESCE(ec.applied, 0) AS applied,
        COALESCE(ec.attended, 0) AS attended,
        COALESCE(ec.canceled, 0) AS canceled,
        COALESCE(ec.active, 0) AS active,
        COALESCE(rc.repeaters, 0) AS repeaters
      FROM filtered_events fe
      LEFT JOIN event_counts ec ON ec.event_id = fe.id
      LEFT JOIN repeater_counts rc ON rc.event_id = fe.id
      ORDER BY fe.start_at DESC
    `;

    const data = rows.map((r) => {
      const applied = Number(r.applied);
      const attended = Number(r.attended);
      const canceled = Number(r.canceled);
      const active = Number(r.active);
      const repeaters = Number(r.repeaters);
      return {
        eventId: r.id,
        title: r.title,
        startAt: r.start_at,
        coverImageUrl: r.cover_image_url,
        appliedCount: applied,
        attendedCount: attended,
        canceledCount: canceled,
        attendanceRate: active > 0 ? attended / active : null,
        cancellationRate: applied > 0 ? canceled / applied : null,
        repeaterRate: active > 0 ? repeaters / active : null,
      };
    });

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

  /** 離脱予兆リスト（過去 attended >=1 かつ 直近 N ヶ月 attended = 0） */
  async getDropoutRiskList(query: { page?: number; limit?: number; months?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const months = query.months ?? 3;

    const now = new Date();
    const threshold = new Date(now.getTime());
    threshold.setMonth(threshold.getMonth() - months);

    const totalRow = await this.prisma.$queryRaw<Array<{ cnt: bigint }>>`
      WITH user_stats AS (
        SELECT user_id, COUNT(*) AS total_attended, MAX(attended_at) AS last_attended
        FROM event_participants
        WHERE status = 'attended' AND attended_at IS NOT NULL
        GROUP BY user_id
      )
      SELECT COUNT(*) AS cnt
      FROM user_stats us
      JOIN users u ON u.id = us.user_id
      WHERE us.total_attended >= 1
        AND us.last_attended < ${threshold}
        AND u.deleted_at IS NULL
        AND u.status = 'active'
    `;
    const total = Number(totalRow[0]?.cnt ?? 0);

    const rows = await this.prisma.$queryRaw<
      Array<{
        user_id: string;
        name: string;
        email: string;
        avatar_url: string | null;
        total_attended: bigint;
        last_attended: Date;
      }>
    >`
      WITH user_stats AS (
        SELECT user_id, COUNT(*) AS total_attended, MAX(attended_at) AS last_attended
        FROM event_participants
        WHERE status = 'attended' AND attended_at IS NOT NULL
        GROUP BY user_id
      )
      SELECT
        us.user_id,
        u.name,
        u.email,
        u.avatar_url,
        us.total_attended,
        us.last_attended
      FROM user_stats us
      JOIN users u ON u.id = us.user_id
      WHERE us.total_attended >= 1
        AND us.last_attended < ${threshold}
        AND u.deleted_at IS NULL
        AND u.status = 'active'
      ORDER BY us.last_attended ASC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const data = rows.map((r) => {
      const lastAttended = new Date(r.last_attended);
      const elapsedDays = Math.floor(
        (now.getTime() - lastAttended.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        userId: r.user_id,
        user: { id: r.user_id, name: r.name, email: r.email, avatarUrl: r.avatar_url },
        totalAttended: Number(r.total_attended),
        lastAttendedAt: lastAttended,
        elapsedDays,
      };
    });

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
      thresholdMonths: months,
    };
  }
}
