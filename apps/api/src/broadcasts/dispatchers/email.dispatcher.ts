import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import {
  Broadcast,
  BroadcastChannel,
  BroadcastRecipientStatus,
  BroadcastScope,
} from "@prisma/client";
import type { BroadcastRecipientRow } from "./recipient";

@Injectable()
export class EmailDispatcher {
  private readonly logger = new Logger(EmailDispatcher.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Email チャネル。
   * - NotificationPreference.emailEnabled で除外
   * - BroadcastSuppression に登録済みのアドレスで除外
   * - 実送信は Phase 4（Resend SDK）で統合。現状は MOCK ログ + BroadcastRecipient 記録のみ。
   */
  async dispatch(
    broadcast: Broadcast,
    recipients: BroadcastRecipientRow[],
  ): Promise<{ sent: number; failed: number }> {
    const notificationType = this.resolveNotificationType(broadcast.scope);

    const [prefs, suppressions] = await Promise.all([
      this.prisma.notificationPreference.findMany({
        where: { userId: { in: recipients.map((r) => r.userId) }, notificationType },
        select: { userId: true, emailEnabled: true },
      }),
      this.prisma.broadcastSuppression.findMany({ select: { email: true } }),
    ]);

    const emailDisabled = new Set(prefs.filter((p) => !p.emailEnabled).map((p) => p.userId));
    const suppressedEmails = new Set(suppressions.map((s) => s.email));

    const allowed = recipients.filter(
      (r) => !emailDisabled.has(r.userId) && !suppressedEmails.has(r.email),
    );

    if (allowed.length === 0) return { sent: 0, failed: 0 };

    // TODO: Phase 4 で Resend SDK 経由の実送信に置き換え
    this.logger.log(`[MOCK] email broadcast(${broadcast.id}) to ${allowed.length} recipients`);

    await this.prisma.broadcastRecipient.createMany({
      data: allowed.map((r) => ({
        broadcastId: broadcast.id,
        userId: r.userId,
        channel: BroadcastChannel.email,
        email: r.email,
        status: BroadcastRecipientStatus.sent,
        sentAt: new Date(),
      })),
      skipDuplicates: true,
    });

    return { sent: allowed.length, failed: 0 };
  }

  private resolveNotificationType(scope: BroadcastScope): string {
    return scope === BroadcastScope.event ? "event_announcement" : "announcement";
  }
}
