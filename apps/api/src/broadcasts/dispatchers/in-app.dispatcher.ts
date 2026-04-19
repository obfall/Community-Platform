import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { NotificationsService } from "@/notifications/notifications.service";
import {
  Broadcast,
  BroadcastChannel,
  BroadcastRecipientStatus,
  BroadcastScope,
} from "@prisma/client";
import type { BroadcastRecipientRow } from "./recipient";

@Injectable()
export class InAppDispatcher {
  private readonly logger = new Logger(InAppDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * In-App 通知チャネル。
   * NotificationPreference.inAppEnabled が false のユーザーを除外し、
   * Notification を作成しつつ BroadcastRecipient にも配信記録を残す。
   */
  async dispatch(
    broadcast: Broadcast,
    recipients: BroadcastRecipientRow[],
    actorUserId: string,
  ): Promise<{ sent: number; failed: number }> {
    const notificationType = this.resolveNotificationType(broadcast.scope);

    const filtered = await this.filterByPreference(
      recipients.map((r) => r.userId),
      notificationType,
    );
    const allowed = recipients.filter((r) => filtered.has(r.userId));

    if (allowed.length === 0) return { sent: 0, failed: 0 };

    const referenceType = broadcast.scope === BroadcastScope.event ? "event" : "broadcast";
    const referenceId =
      broadcast.scope === BroadcastScope.event
        ? ((broadcast.targetFilter as Record<string, unknown>)?.eventId as string | undefined)
        : broadcast.id;

    const notificationItems = allowed.map((r) => ({
      userId: r.userId,
      type: notificationType,
      title: broadcast.subject,
      body: broadcast.bodyText ?? stripHtml(broadcast.bodyHtml),
      referenceType,
      referenceId,
      actorUserId,
    }));

    try {
      await this.notifications.createMany(notificationItems);

      await this.prisma.broadcastRecipient.createMany({
        data: allowed.map((r) => ({
          broadcastId: broadcast.id,
          userId: r.userId,
          channel: BroadcastChannel.in_app,
          email: r.email,
          status: BroadcastRecipientStatus.sent,
          sentAt: new Date(),
        })),
        skipDuplicates: true,
      });

      return { sent: allowed.length, failed: 0 };
    } catch (err) {
      this.logger.error("InApp dispatch failed", err as Error);
      return { sent: 0, failed: allowed.length };
    }
  }

  private async filterByPreference(userIds: string[], notificationType: string) {
    const prefs = await this.prisma.notificationPreference.findMany({
      where: { userId: { in: userIds }, notificationType },
      select: { userId: true, inAppEnabled: true },
    });
    const disabled = new Set(prefs.filter((p) => !p.inAppEnabled).map((p) => p.userId));
    return new Set(userIds.filter((id) => !disabled.has(id)));
  }

  private resolveNotificationType(scope: BroadcastScope): string {
    return scope === BroadcastScope.event ? "event_announcement" : "announcement";
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
