/**
 * WebSocket メッセージ送信のレートリミット（in-memory / per-socket）。
 *
 * - 接続単位で過去 windowMs 内の送信タイムスタンプを保持
 * - limit を超えると false を返す（呼び出し側で握り潰す）
 * - disconnect 時に cleanup() を呼ばないとメモリリーク
 *
 * 単一プロセス前提。Phase 12 でマルチインスタンス化する際は Redis ベースに置換。
 */
export class WsRateLimiter {
  private buckets = new Map<string, number[]>();

  constructor(
    private readonly limit = 30,
    private readonly windowMs = 60_000,
  ) {}

  /**
   * 送信を許可するか判定し、許可した場合は内部に記録する。
   * @returns true = 許可、false = レート上限超過
   */
  check(socketId: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(socketId) ?? [];
    const recent = bucket.filter((ts) => now - ts < this.windowMs);
    if (recent.length >= this.limit) {
      this.buckets.set(socketId, recent);
      return false;
    }
    recent.push(now);
    this.buckets.set(socketId, recent);
    return true;
  }

  cleanup(socketId: string): void {
    this.buckets.delete(socketId);
  }
}
