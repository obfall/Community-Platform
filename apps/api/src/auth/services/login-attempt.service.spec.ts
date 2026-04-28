import { LoginAttemptService } from "./login-attempt.service";

describe("LoginAttemptService", () => {
  let prismaMock: { loginHistory: { count: jest.Mock; findFirst: jest.Mock } };
  let service: LoginAttemptService;

  beforeEach(() => {
    prismaMock = {
      loginHistory: {
        count: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    service = new LoginAttemptService(prismaMock as never);
  });

  describe("isLocked: ロック判定", () => {
    it("失敗回数が閾値未満ならロックされていない", async () => {
      prismaMock.loginHistory.count.mockResolvedValue(4);
      await expect(service.isLocked("u1")).resolves.toBe(false);
    });

    it("失敗回数が閾値（5回）に達したらロック中になる", async () => {
      prismaMock.loginHistory.count.mockResolvedValue(5);
      await expect(service.isLocked("u1")).resolves.toBe(true);
    });

    it("ロック窓（直近15分）内の失敗のみをカウント対象にする", async () => {
      prismaMock.loginHistory.count.mockResolvedValue(0);
      await service.isLocked("u1");
      const where = prismaMock.loginHistory.count.mock.calls[0]?.[0]?.where;
      expect(where).toMatchObject({ userId: "u1", status: "failure" });
      expect(where.createdAt.gte).toBeInstanceOf(Date);
    });
  });

  describe("getRemainingLockSeconds: ロック解除までの残り秒数", () => {
    it("窓内に失敗が無ければ 0 を返す", async () => {
      prismaMock.loginHistory.findFirst.mockResolvedValue(null);
      await expect(service.getRemainingLockSeconds("u1")).resolves.toBe(0);
    });

    it("最古の失敗から 15 分後までの残り秒数を返す（10分前なら約300秒）", async () => {
      const tenMinAgo = new Date(Date.now() - 10 * 60_000);
      prismaMock.loginHistory.findFirst.mockResolvedValue({ createdAt: tenMinAgo });

      const remaining = await service.getRemainingLockSeconds("u1");
      // 実行時間の端数調整があるので 290〜310 秒の範囲で許容
      expect(remaining).toBeGreaterThan(290);
      expect(remaining).toBeLessThan(310);
    });

    it("最古の失敗が既に窓外まで古い場合は 0 にクランプ（防御的処理）", async () => {
      const twentyMinAgo = new Date(Date.now() - 20 * 60_000);
      prismaMock.loginHistory.findFirst.mockResolvedValue({ createdAt: twentyMinAgo });

      const remaining = await service.getRemainingLockSeconds("u1");
      expect(remaining).toBe(0);
    });
  });
});
