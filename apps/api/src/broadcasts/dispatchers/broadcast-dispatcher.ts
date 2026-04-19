import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { Broadcast, BroadcastChannel, BroadcastStatus, BroadcastTargetType } from "@prisma/client";
import { InAppDispatcher } from "./in-app.dispatcher";
import { EmailDispatcher } from "./email.dispatcher";
import { LineDispatcher } from "./line.dispatcher";
import type { BroadcastRecipientRow } from "./recipient";

@Injectable()
export class BroadcastDispatcher {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inApp: InAppDispatcher,
    private readonly email: EmailDispatcher,
    private readonly line: LineDispatcher,
  ) {}

  /**
   * 配信の実行オーケストレーション。
   * - 対象者を targetType / targetFilter から解決
   * - channels に含まれるチャネルごとに dispatcher を呼ぶ
   * - 各チャネル dispatcher が NotificationPreference を尊重して除外
   * - 送信結果を集約して Broadcast を更新
   */
  async dispatch(broadcast: Broadcast, actorUserId: string) {
    const recipients = await this.resolveRecipients(broadcast.targetType, broadcast.targetFilter);

    await this.prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: BroadcastStatus.sending, totalRecipients: recipients.length },
    });

    let totalSent = 0;
    let totalFailed = 0;
    let lineSent = 0;

    for (const channel of broadcast.channels) {
      const { sent, failed } = await this.dispatchChannel(
        channel,
        broadcast,
        recipients,
        actorUserId,
      );
      totalSent += sent;
      totalFailed += failed;
      if (channel === BroadcastChannel.line) lineSent += sent;
    }

    const updated = await this.prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        status: BroadcastStatus.sent,
        sentAt: new Date(),
        sentCount: totalSent,
        failedCount: totalFailed,
        lineSentCount: lineSent,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      totalRecipients: updated.totalRecipients,
      sentCount: updated.sentCount,
      failedCount: updated.failedCount,
    };
  }

  private dispatchChannel(
    channel: BroadcastChannel,
    broadcast: Broadcast,
    recipients: BroadcastRecipientRow[],
    actorUserId: string,
  ) {
    switch (channel) {
      case BroadcastChannel.in_app:
        return this.inApp.dispatch(broadcast, recipients, actorUserId);
      case BroadcastChannel.email:
        return this.email.dispatch(broadcast, recipients);
      case BroadcastChannel.line:
        return this.line.dispatch(broadcast, recipients);
    }
  }

  /**
   * targetType / targetFilter から対象者 (userId, email) を解決。
   * - all: status=active の全メンバー
   * - rank: rankId でフィルタ
   * - event: EventParticipant から （キャンセル除く）
   * - custom: 現状 all と同等（将来拡張）
   */
  private async resolveRecipients(
    targetType: BroadcastTargetType,
    targetFilter: unknown,
  ): Promise<BroadcastRecipientRow[]> {
    const filter =
      targetFilter && typeof targetFilter === "object"
        ? (targetFilter as Record<string, unknown>)
        : {};

    if (targetType === BroadcastTargetType.event) {
      const eventId = typeof filter.eventId === "string" ? filter.eventId : null;
      if (!eventId) return [];
      const participants = await this.prisma.eventParticipant.findMany({
        where: { eventId, status: { not: "canceled" } },
        select: { user: { select: { id: true, email: true, status: true, deletedAt: true } } },
      });
      return participants
        .map((p) => p.user)
        .filter((u) => u.status === "active" && u.deletedAt == null)
        .map((u) => ({ userId: u.id, email: u.email }));
    }

    const where: Record<string, unknown> = { status: "active", deletedAt: null };
    if (targetType === BroadcastTargetType.rank && filter.rankId) {
      where.rankId = filter.rankId;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true },
    });
    return users.map((u) => ({ userId: u.id, email: u.email }));
  }
}
