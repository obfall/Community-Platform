import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Broadcast, BroadcastChannel, BroadcastScope } from "@prisma/client";
import type { BroadcastRecipientRow } from "./recipient";

@Injectable()
export class LineDispatcher {
  private readonly logger = new Logger(LineDispatcher.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * LINE チャネル。
   * Phase 4 で LINE Messaging API 統合を予定。
   * 現状は NotificationPreference.lineEnabled を尊重しつつ、ログのみ。
   * User テーブルに lineUserId カラム追加も Phase 4 で実施。
   */
  async dispatch(
    broadcast: Broadcast,
    recipients: BroadcastRecipientRow[],
  ): Promise<{ sent: number; failed: number }> {
    const notificationType =
      broadcast.scope === BroadcastScope.event ? "event_announcement" : "announcement";

    const prefs = await this.prisma.notificationPreference.findMany({
      where: { userId: { in: recipients.map((r) => r.userId) }, notificationType },
      select: { userId: true, lineEnabled: true },
    });
    const enabled = new Set(prefs.filter((p) => p.lineEnabled).map((p) => p.userId));
    const allowed = recipients.filter((r) => enabled.has(r.userId));

    if (allowed.length === 0) return { sent: 0, failed: 0 };

    this.logger.log(
      `[MOCK] LINE broadcast(${broadcast.id}) — ${allowed.length} recipients (Phase 4 で実装予定)`,
    );
    // LINE channel は lineUserId カラム未整備のため、BroadcastRecipient 記録は Phase 4 で対応
    void BroadcastChannel; // lint 回避
    return { sent: 0, failed: 0 };
  }
}
