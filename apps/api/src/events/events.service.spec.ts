jest.mock("@nestjs/bullmq", () => ({
  InjectQueue: () => () => undefined,
}));

import { EventsService } from "./events.service";

describe("EventsService", () => {
  let prismaMock: {
    event: { findMany: jest.Mock; count: jest.Mock };
    eventParticipant: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: EventsService;

  beforeEach(() => {
    prismaMock = {
      event: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      eventParticipant: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new EventsService(prismaMock as never, {} as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({});
      expect(prismaMock.event.findMany).toHaveBeenCalled();
      expect(prismaMock.event.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search 空文字なら通常一覧経路に dispatch される", async () => {
      await service.findAll({ search: "" });
      expect(prismaMock.event.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "勉強会" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" });
      expect(prismaMock.event.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("findUpcoming: ホーム表示用の今後のイベント", () => {
    it("startAt が現在以降・isCalendarVisible・status in (recruiting, closed) で絞り込む", async () => {
      await service.findUpcoming(3);

      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.where.deletedAt).toBeNull();
      expect(args.where.isCalendarVisible).toBe(true);
      expect(args.where.startAt.gte).toBeInstanceOf(Date);
      expect(args.where.status).toEqual({ in: ["recruiting", "closed"] });
    });

    it("startAt の昇順で limit 件まで取得する", async () => {
      await service.findUpcoming(5);

      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual({ startAt: "asc" });
      expect(args.take).toBe(5);
    });

    it("venue リレーション優先で venueName を解決する", async () => {
      prismaMock.event.findMany.mockResolvedValueOnce([
        {
          id: "e1",
          title: "T",
          startAt: new Date(),
          endAt: new Date(),
          locationType: "offline",
          status: "recruiting",
          coverImageUrl: null,
          venueName: "fallback",
          venue: { name: "from-relation" },
        },
      ]);

      const result = await service.findUpcoming(3);
      expect(result[0].venueName).toBe("from-relation");
    });

    it("venue リレーションが null なら venueName 列にフォールバックする", async () => {
      prismaMock.event.findMany.mockResolvedValueOnce([
        {
          id: "e1",
          title: "T",
          startAt: new Date(),
          endAt: new Date(),
          locationType: "online",
          status: "recruiting",
          coverImageUrl: null,
          venueName: "manual-input",
          venue: null,
        },
      ]);

      const result = await service.findUpcoming(3);
      expect(result[0].venueName).toBe("manual-input");
    });
  });

  describe("findMyUpcoming: 自分が参加予定のイベント", () => {
    it("userId と canceled 以外のステータスで絞り込み、endAt は now 以降・startAt は窓内", async () => {
      await service.findMyUpcoming("user-1", 7);

      const args = prismaMock.eventParticipant.findMany.mock.calls[0][0];
      expect(args.where.userId).toBe("user-1");
      expect(args.where.status).toEqual({ not: "canceled" });
      expect(args.where.event.deletedAt).toBeNull();
      expect(args.where.event.status).toEqual({ not: "canceled" });
      expect(args.where.event.endAt.gte).toBeInstanceOf(Date);
      expect(args.where.event.startAt.lte).toBeInstanceOf(Date);
    });

    it("days 引数の日数だけ窓を取る（startAt.lte = now + days）", async () => {
      const before = Date.now();
      await service.findMyUpcoming("user-1", 7);
      const after = Date.now();

      const args = prismaMock.eventParticipant.findMany.mock.calls[0][0];
      const startLte = args.where.event.startAt.lte.getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(startLte).toBeGreaterThanOrEqual(before + sevenDays);
      expect(startLte).toBeLessThanOrEqual(after + sevenDays);
    });

    it("event.startAt 昇順で取得する", async () => {
      await service.findMyUpcoming("user-1", 7);
      const args = prismaMock.eventParticipant.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual({ event: { startAt: "asc" } });
    });

    it("venue リレーション優先で venueName を解決する", async () => {
      prismaMock.eventParticipant.findMany.mockResolvedValueOnce([
        {
          status: "applied",
          event: {
            id: "e1",
            title: "T",
            startAt: new Date(),
            endAt: new Date(),
            locationType: "offline",
            venueName: "fallback",
            venue: { name: "from-relation" },
          },
        },
      ]);

      const result = await service.findMyUpcoming("user-1", 7);
      expect(result[0]).toMatchObject({
        eventId: "e1",
        venueName: "from-relation",
        participantStatus: "applied",
      });
    });
  });
});
