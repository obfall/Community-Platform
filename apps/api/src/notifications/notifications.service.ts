import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import type { NotificationQueryDto } from "./dto/notification-query.dto";
import type { UpdatePreferencesDto } from "./dto/update-preferences.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(query.unreadOnly && { isRead: false }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          referenceType: true,
          referenceId: true,
          isRead: true,
          readAt: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              name: true,
              profile: { select: { avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: notifications.map((n) => ({
        ...n,
        actor: n.actor
          ? { id: n.actor.id, name: n.actor.name, avatarUrl: n.actor.profile?.avatarUrl ?? null }
          : null,
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

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException("通知が見つかりません");
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
      select: { id: true, isRead: true, readAt: true },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updatedCount: result.count };
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      select: {
        id: true,
        notificationType: true,
        emailEnabled: true,
        inAppEnabled: true,
        lineEnabled: true,
      },
    });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const results = await Promise.all(
      dto.preferences.map((pref) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_notificationType: {
              userId,
              notificationType: pref.notificationType,
            },
          },
          update: {
            emailEnabled: pref.emailEnabled,
            inAppEnabled: pref.inAppEnabled,
            lineEnabled: pref.lineEnabled,
          },
          create: {
            userId,
            notificationType: pref.notificationType,
            emailEnabled: pref.emailEnabled,
            inAppEnabled: pref.inAppEnabled,
            lineEnabled: pref.lineEnabled,
          },
          select: {
            id: true,
            notificationType: true,
            emailEnabled: true,
            inAppEnabled: true,
            lineEnabled: true,
          },
        }),
      ),
    );

    return results;
  }
}
