import { WsRateLimiter } from "./ws-rate-limiter";

describe("WsRateLimiter: WebSocket レートリミット", () => {
  it("窓内では上限まで許可し、上限超過は拒否する", () => {
    const limiter = new WsRateLimiter(3, 60_000);
    expect(limiter.check("s1")).toBe(true);
    expect(limiter.check("s1")).toBe(true);
    expect(limiter.check("s1")).toBe(true);
    expect(limiter.check("s1")).toBe(false); // 4 件目は拒否
  });

  it("接続（socketId）ごとにカウントが独立する", () => {
    const limiter = new WsRateLimiter(2, 60_000);
    expect(limiter.check("s1")).toBe(true);
    expect(limiter.check("s2")).toBe(true);
    expect(limiter.check("s1")).toBe(true);
    expect(limiter.check("s2")).toBe(true);
    expect(limiter.check("s1")).toBe(false);
    expect(limiter.check("s2")).toBe(false);
  });

  it("窓を経過すると古いカウントが外れ再度許可される", () => {
    jest.useFakeTimers();
    try {
      const start = new Date("2026-04-29T00:00:00Z");
      jest.setSystemTime(start);
      const limiter = new WsRateLimiter(2, 60_000);
      expect(limiter.check("s1")).toBe(true);
      expect(limiter.check("s1")).toBe(true);
      expect(limiter.check("s1")).toBe(false);

      // 61 秒進める → 古いタイムスタンプが窓外に出て再度許可される
      jest.setSystemTime(new Date(start.getTime() + 61_000));
      expect(limiter.check("s1")).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it("cleanup でバケットが完全削除されカウントがリセットされる（disconnect 時のメモリリーク防止）", () => {
    const limiter = new WsRateLimiter(1, 60_000);
    expect(limiter.check("s1")).toBe(true);
    expect(limiter.check("s1")).toBe(false);
    limiter.cleanup("s1");
    expect(limiter.check("s1")).toBe(true); // バケット消えたので再度カウント開始
  });
});
