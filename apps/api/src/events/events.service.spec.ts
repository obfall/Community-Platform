jest.mock("@nestjs/bullmq", () => ({
  InjectQueue: () => () => undefined,
}));

import { EventsService } from "./events.service";

describe("EventsService", () => {
  let prismaMock: {
    event: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock };
    eventParticipant: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let service: EventsService;

  beforeEach(() => {
    prismaMock = {
      event: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      eventParticipant: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(),
    };
    service = new EventsService(prismaMock as never, {} as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({}, "admin");
      expect(prismaMock.event.findMany).toHaveBeenCalled();
      expect(prismaMock.event.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search 空文字なら通常一覧経路に dispatch される", async () => {
      await service.findAll({ search: "" }, "admin");
      expect(prismaMock.event.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "勉強会" }, "admin");
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" }, "admin");
      expect(prismaMock.event.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("findAll: role による status フィルタ", () => {
    it("admin は status クエリ未指定なら status を絞らず全件参照", async () => {
      await service.findAll({}, "admin");
      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.where.status).toBeUndefined();
    });

    it("admin が status を明示指定するとそのステータスで絞り込む", async () => {
      await service.findAll({ status: "draft" }, "admin");
      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("draft");
    });

    it("owner も admin と同様に全ステータス参照可", async () => {
      await service.findAll({ status: "ended" }, "owner");
      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("ended");
    });

    it("member は status クエリを無視して recruiting のみに強制される", async () => {
      await service.findAll({ status: "draft" }, "member");
      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("recruiting");
    });

    it("visitor も recruiting のみに強制される", async () => {
      await service.findAll({}, "visitor");
      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("recruiting");
    });
  });

  describe("findUpcoming: ホーム表示用の今後のイベント", () => {
    it("startAt が現在以降・isCalendarVisible・status=recruiting で絞り込む", async () => {
      await service.findUpcoming(3);

      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.where.deletedAt).toBeNull();
      expect(args.where.isCalendarVisible).toBe(true);
      expect(args.where.startAt.gte).toBeInstanceOf(Date);
      expect(args.where.status).toEqual({ in: ["recruiting"] });
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
      expect(result[0]!.venueName).toBe("from-relation");
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
      expect(result[0]!.venueName).toBe("manual-input");
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

  describe("findOne: role による status ガード", () => {
    const baseEvent = {
      id: "e1",
      title: "T",
      deletedAt: null,
      createdByUser: { id: "u1", name: "creator", profile: null },
      tickets: [],
      speakers: [],
      organizations: [],
      tags: [],
      _count: { participants: 0 },
    };

    it("admin は draft でも取得できる", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce({ ...baseEvent, status: "draft" });
      await expect(service.findOne("e1", "admin")).resolves.toMatchObject({ id: "e1" });
    });

    it("owner は ended でも取得できる", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce({ ...baseEvent, status: "ended" });
      await expect(service.findOne("e1", "owner")).resolves.toMatchObject({ id: "e1" });
    });

    it("member は recruiting なら取得できる", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce({ ...baseEvent, status: "recruiting" });
      await expect(service.findOne("e1", "member")).resolves.toMatchObject({ id: "e1" });
    });

    it("member が draft にアクセスすると NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce({ ...baseEvent, status: "draft" });
      await expect(service.findOne("e1", "member")).rejects.toThrow("イベントが見つかりません");
    });

    it("member が closed にアクセスすると NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce({ ...baseEvent, status: "closed" });
      await expect(service.findOne("e1", "member")).rejects.toThrow("イベントが見つかりません");
    });

    it("visitor が canceled にアクセスすると NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce({ ...baseEvent, status: "canceled" });
      await expect(service.findOne("e1", "visitor")).rejects.toThrow("イベントが見つかりません");
    });
  });

  describe("getCalendarEvents: role による status フィルタ", () => {
    it("admin はカレンダーで全ステータス表示", async () => {
      await service.getCalendarEvents("2026-01-01", "2026-12-31", "admin");
      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.where.status).toBeUndefined();
    });

    it("owner も全ステータス表示", async () => {
      await service.getCalendarEvents("2026-01-01", "2026-12-31", "owner");
      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.where.status).toBeUndefined();
    });

    it("member は recruiting のみ", async () => {
      await service.getCalendarEvents("2026-01-01", "2026-12-31", "member");
      const args = prismaMock.event.findMany.mock.calls[0][0];
      expect(args.where.status).toBe("recruiting");
    });
  });

  describe("create: organizations 一括登録", () => {
    let txMock: {
      event: { create: jest.Mock };
      eventOrganization: { createMany: jest.Mock; deleteMany: jest.Mock };
    };

    const baseEventDetail = {
      id: "new-event",
      deletedAt: null,
      status: "draft",
      createdByUser: { id: "u1", name: "creator", profile: null },
      tickets: [],
      speakers: [],
      organizations: [],
      tags: [],
      _count: { participants: 0 },
    };

    const baseCreateDto = {
      title: "T",
      startAt: "2026-06-01T10:00:00Z",
      endAt: "2026-06-01T12:00:00Z",
      locationType: "venue",
    };

    beforeEach(() => {
      txMock = {
        event: { create: jest.fn().mockResolvedValue({ id: "new-event" }) },
        eventOrganization: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };
      prismaMock.$transaction.mockImplementation((cb: (tx: typeof txMock) => Promise<unknown>) =>
        cb(txMock),
      );
      prismaMock.event.findUnique.mockResolvedValue(baseEventDetail);
    });

    it("organizations 未指定なら createMany は呼ばれない", async () => {
      await service.create("user-1", baseCreateDto as never);
      expect(txMock.event.create).toHaveBeenCalled();
      expect(txMock.eventOrganization.createMany).not.toHaveBeenCalled();
    });

    it("organizations: [] でも createMany は呼ばれない（length > 0 でガード）", async () => {
      await service.create("user-1", { ...baseCreateDto, organizations: [] } as never);
      expect(txMock.eventOrganization.createMany).not.toHaveBeenCalled();
    });

    it("organizations を渡すと sortOrder 付きで一括登録される", async () => {
      await service.create("user-1", {
        ...baseCreateDto,
        organizations: [
          { organizationName: "東京大学", role: "co_organizer" },
          { organizationName: "○○財団", role: "sponsor" },
        ],
      } as never);
      expect(txMock.eventOrganization.createMany).toHaveBeenCalledWith({
        data: [
          {
            eventId: "new-event",
            organizationName: "東京大学",
            role: "co_organizer",
            sortOrder: 0,
          },
          {
            eventId: "new-event",
            organizationName: "○○財団",
            role: "sponsor",
            sortOrder: 1,
          },
        ],
      });
    });
  });

  describe("update: organizations 全件置換セマンティクス", () => {
    let txMock: {
      event: { update: jest.Mock };
      eventOrganization: { createMany: jest.Mock; deleteMany: jest.Mock };
    };

    const baseEventDetail = {
      id: "e1",
      deletedAt: null,
      status: "draft",
      createdByUser: { id: "u1", name: "creator", profile: null },
      tickets: [],
      speakers: [],
      organizations: [],
      tags: [],
      _count: { participants: 0 },
    };

    beforeEach(() => {
      txMock = {
        event: { update: jest.fn().mockResolvedValue({ id: "e1" }) },
        eventOrganization: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };
      prismaMock.$transaction.mockImplementation((cb: (tx: typeof txMock) => Promise<unknown>) =>
        cb(txMock),
      );
      // 1 回目: update() 冒頭の存在チェック、2 回目: 末尾の findOne
      prismaMock.event.findUnique
        .mockResolvedValueOnce({ id: "e1", deletedAt: null })
        .mockResolvedValueOnce(baseEventDetail);
    });

    it("organizations: undefined なら deleteMany も createMany も呼ばれない", async () => {
      await service.update("e1", { title: "new title" });
      expect(txMock.eventOrganization.deleteMany).not.toHaveBeenCalled();
      expect(txMock.eventOrganization.createMany).not.toHaveBeenCalled();
    });

    it("organizations: [] なら全件削除のみ（createMany は呼ばれない）", async () => {
      await service.update("e1", { organizations: [] });
      expect(txMock.eventOrganization.deleteMany).toHaveBeenCalledWith({
        where: { eventId: "e1" },
      });
      expect(txMock.eventOrganization.createMany).not.toHaveBeenCalled();
    });

    it("organizations: [...] なら全件削除 + 新規挿入（sortOrder は index）", async () => {
      await service.update("e1", {
        organizations: [
          { organizationName: "A", role: "organizer" as never },
          { organizationName: "B", role: "sponsor" as never },
        ],
      });
      expect(txMock.eventOrganization.deleteMany).toHaveBeenCalled();
      expect(txMock.eventOrganization.createMany).toHaveBeenCalledWith({
        data: [
          { eventId: "e1", organizationName: "A", role: "organizer", sortOrder: 0 },
          { eventId: "e1", organizationName: "B", role: "sponsor", sortOrder: 1 },
        ],
      });
    });
  });
});
