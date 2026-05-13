import { SchedulesService } from "./schedules.service";

describe("SchedulesService", () => {
  let prismaMock: {
    schedule: { findMany: jest.Mock };
  };
  let service: SchedulesService;

  beforeEach(() => {
    prismaMock = {
      schedule: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new SchedulesService(prismaMock as never);
  });

  describe("findAll: 自分のスケジュール取得", () => {
    it("userId と deletedAt: null で絞り込む（必須条件）", async () => {
      await service.findAll("user-1");

      const args = prismaMock.schedule.findMany.mock.calls[0][0];
      expect(args.where.userId).toBe("user-1");
      expect(args.where.deletedAt).toBeNull();
    });

    it("startAt と endAt が指定されたら overlap 判定で AND を組む", async () => {
      const from = "2026-05-13T00:00:00.000Z";
      const to = "2026-05-20T00:00:00.000Z";

      await service.findAll("user-1", from, to);

      const args = prismaMock.schedule.findMany.mock.calls[0][0];
      expect(args.where.AND).toEqual([
        { endAt: { gte: new Date(from) } },
        { startAt: { lte: new Date(to) } },
      ]);
    });

    it("startAt のみ・endAt のみでは AND は組まない（両方揃った時だけ）", async () => {
      await service.findAll("user-1", "2026-05-13T00:00:00.000Z");
      const args1 = prismaMock.schedule.findMany.mock.calls[0][0];
      expect("AND" in args1.where).toBe(false);

      await service.findAll("user-1", undefined, "2026-05-20T00:00:00.000Z");
      const args2 = prismaMock.schedule.findMany.mock.calls[1][0];
      expect("AND" in args2.where).toBe(false);
    });

    it("startAt 昇順で取得する", async () => {
      await service.findAll("user-1");

      const args = prismaMock.schedule.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual({ startAt: "asc" });
    });
  });
});
