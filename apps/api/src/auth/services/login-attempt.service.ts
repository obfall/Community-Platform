import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

const MAX_FAILURES = 5;
const LOCK_WINDOW_MIN = 15;

/**
 * ログイン試行制限（アカウント単位ロック）。
 * IP ベースの @nestjs/throttler とは別軸で、複数 IP からの分散攻撃にも効く。
 *
 * - 直近 15 分間の失敗回数が 5 を超えたら「ロック中」とみなす
 * - ロックが切れる時刻 = 直近窓内で最も古い失敗 + 15 分
 * - データソースは LoginHistory テーブル（既存）
 */
@Injectable()
export class LoginAttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async isLocked(userId: string): Promise<boolean> {
    const since = new Date(Date.now() - LOCK_WINDOW_MIN * 60_000);
    const failures = await this.prisma.loginHistory.count({
      where: {
        userId,
        status: "failure",
        createdAt: { gte: since },
      },
    });
    return failures >= MAX_FAILURES;
  }

  /**
   * ロック解除までの残り秒数。
   * ロック中でなければ 0 を返す。
   */
  async getRemainingLockSeconds(userId: string): Promise<number> {
    const since = new Date(Date.now() - LOCK_WINDOW_MIN * 60_000);
    const oldestFailure = await this.prisma.loginHistory.findFirst({
      where: {
        userId,
        status: "failure",
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    if (!oldestFailure) return 0;
    const unlockAt = oldestFailure.createdAt.getTime() + LOCK_WINDOW_MIN * 60_000;
    return Math.max(0, Math.floor((unlockAt - Date.now()) / 1000));
  }
}
