jest.mock("@nestjs/bullmq", () => ({
  InjectQueue: () => () => undefined,
}));

import { EventsService } from "./events.service";

describe("EventsService", () => {
  let prismaMock: {
    event: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    eventTicket: { findUnique: jest.Mock };
    eventParticipant: { findMany: jest.Mock; findFirst: jest.Mock };
    eventApplicationQuestion: { findMany: jest.Mock };
    eventDiscountCode: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let notificationsMock: { create: jest.Mock; createMany: jest.Mock };
  let service: EventsService;

  beforeEach(() => {
    prismaMock = {
      event: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      eventTicket: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      eventParticipant: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      eventApplicationQuestion: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      eventDiscountCode: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(),
    };
    notificationsMock = {
      create: jest.fn().mockResolvedValue(undefined),
      createMany: jest.fn().mockResolvedValue(undefined),
    };
    service = new EventsService(prismaMock as never, notificationsMock as never);
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

  describe("tags: 検索用 tags_text 同期と upsert", () => {
    type TagTxMock = {
      event: { create: jest.Mock; update: jest.Mock };
      eventOrganization: { createMany: jest.Mock; deleteMany: jest.Mock };
      eventTag: { createMany: jest.Mock; deleteMany: jest.Mock };
      tag: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    };

    let txMock: TagTxMock;

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
        event: {
          create: jest.fn().mockResolvedValue({ id: "new-event" }),
          update: jest.fn().mockResolvedValue({ id: "new-event" }),
        },
        eventOrganization: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        eventTag: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        tag: {
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
      };
      prismaMock.$transaction.mockImplementation((cb: (tx: TagTxMock) => Promise<unknown>) =>
        cb(txMock),
      );
    });

    describe("create でのタグ upsert", () => {
      beforeEach(() => {
        prismaMock.event.findUnique.mockResolvedValue(baseEventDetail);
      });

      it("tags 未指定なら tag.findFirst も eventTag.* も呼ばれない", async () => {
        await service.create("user-1", {
          title: "T",
          startAt: "2026-06-01T10:00:00Z",
          endAt: "2026-06-01T12:00:00Z",
          locationType: "venue",
        } as never);
        expect(txMock.tag.findFirst).not.toHaveBeenCalled();
        expect(txMock.eventTag.createMany).not.toHaveBeenCalled();
      });

      it("既存タグは findFirst で再利用、新規タグは create される", async () => {
        // "勉強会" は既存、"初心者" は新規（findFirst→null→create）
        txMock.tag.findFirst
          .mockResolvedValueOnce({ id: "tag-existing" })
          .mockResolvedValueOnce(null);
        txMock.tag.findUnique.mockResolvedValueOnce(null);
        txMock.tag.create.mockResolvedValueOnce({ id: "tag-new" });

        await service.create("user-1", {
          title: "T",
          startAt: "2026-06-01T10:00:00Z",
          endAt: "2026-06-01T12:00:00Z",
          locationType: "venue",
          tags: ["勉強会", "初心者"],
        } as never);

        expect(txMock.tag.findFirst).toHaveBeenCalledTimes(2);
        expect(txMock.tag.create).toHaveBeenCalledWith({
          data: { name: "初心者", slug: "初心者" },
          select: { id: true },
        });
        expect(txMock.eventTag.createMany).toHaveBeenCalledWith({
          data: [
            { eventId: "new-event", tagId: "tag-existing" },
            { eventId: "new-event", tagId: "tag-new" },
          ],
          skipDuplicates: true,
        });
      });

      it("tags_text は タグ名を sort してスペース連結", async () => {
        txMock.tag.findFirst
          .mockResolvedValueOnce({ id: "t1" })
          .mockResolvedValueOnce({ id: "t2" });

        await service.create("user-1", {
          title: "T",
          startAt: "2026-06-01T10:00:00Z",
          endAt: "2026-06-01T12:00:00Z",
          locationType: "venue",
          tags: ["技術", "初心者"],
        } as never);

        expect(txMock.event.update).toHaveBeenCalledWith({
          where: { id: "new-event" },
          data: { tagsText: "初心者 技術" },
        });
      });

      it("空文字・重複は除外される", async () => {
        txMock.tag.findFirst.mockResolvedValue({ id: "t1" });

        await service.create("user-1", {
          title: "T",
          startAt: "2026-06-01T10:00:00Z",
          endAt: "2026-06-01T12:00:00Z",
          locationType: "venue",
          tags: ["技術", "技術", "  ", ""],
        } as never);

        expect(txMock.tag.findFirst).toHaveBeenCalledTimes(1);
        expect(txMock.event.update).toHaveBeenCalledWith({
          where: { id: "new-event" },
          data: { tagsText: "技術" },
        });
      });

      it("slug 衝突時は -2 を付与した slug で create", async () => {
        txMock.tag.findFirst.mockResolvedValueOnce(null);
        // slug "技術" は既存、 "技術-2" は空き
        txMock.tag.findUnique
          .mockResolvedValueOnce({ id: "other-tag" })
          .mockResolvedValueOnce(null);
        txMock.tag.create.mockResolvedValueOnce({ id: "tag-new" });

        await service.create("user-1", {
          title: "T",
          startAt: "2026-06-01T10:00:00Z",
          endAt: "2026-06-01T12:00:00Z",
          locationType: "venue",
          tags: ["技術"],
        } as never);

        expect(txMock.tag.create).toHaveBeenCalledWith({
          data: { name: "技術", slug: "技術-2" },
          select: { id: true },
        });
      });
    });

    describe("update でのタグ全件置換", () => {
      beforeEach(() => {
        prismaMock.event.findUnique
          .mockResolvedValueOnce({ id: "e1", deletedAt: null })
          .mockResolvedValueOnce(baseEventDetail);
      });

      it("tags: undefined なら eventTag も tag も触らない", async () => {
        await service.update("e1", { title: "new title" });
        expect(txMock.eventTag.deleteMany).not.toHaveBeenCalled();
        expect(txMock.tag.findFirst).not.toHaveBeenCalled();
      });

      it("tags: [] なら EventTag 全削除 + tags_text='' に同期", async () => {
        await service.update("e1", { tags: [] });
        expect(txMock.eventTag.deleteMany).toHaveBeenCalledWith({
          where: { eventId: "e1" },
        });
        expect(txMock.eventTag.createMany).not.toHaveBeenCalled();
        expect(txMock.event.update).toHaveBeenCalledWith({
          where: { id: "e1" },
          data: { tagsText: "" },
        });
      });

      it("tags: [...] なら全件置換 + tags_text 同期", async () => {
        txMock.tag.findFirst.mockResolvedValue({ id: "t1" });

        await service.update("e1", { tags: ["技術"] });
        expect(txMock.eventTag.deleteMany).toHaveBeenCalled();
        expect(txMock.eventTag.createMany).toHaveBeenCalledWith({
          data: [{ eventId: "e1", tagId: "t1" }],
          skipDuplicates: true,
        });
        expect(txMock.event.update).toHaveBeenCalledWith({
          where: { id: "e1" },
          data: { tagsText: "技術" },
        });
      });
    });
  });

  describe("speakers: 一括登録と全件置換", () => {
    type SpeakerTxMock = {
      event: { create: jest.Mock; update: jest.Mock };
      eventOrganization: { createMany: jest.Mock; deleteMany: jest.Mock };
      eventSpeaker: { createMany: jest.Mock; deleteMany: jest.Mock };
    };

    let txMock: SpeakerTxMock;

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
        event: {
          create: jest.fn().mockResolvedValue({ id: "new-event" }),
          update: jest.fn().mockResolvedValue({ id: "e1" }),
        },
        eventOrganization: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        eventSpeaker: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };
      prismaMock.$transaction.mockImplementation((cb: (tx: SpeakerTxMock) => Promise<unknown>) =>
        cb(txMock),
      );
    });

    describe("create での speakers 一括登録", () => {
      beforeEach(() => {
        prismaMock.event.findUnique.mockResolvedValue(baseEventDetail);
      });

      it("speakers 未指定なら eventSpeaker.createMany は呼ばれない", async () => {
        await service.create("user-1", {
          title: "T",
          startAt: "2026-06-01T10:00:00Z",
          endAt: "2026-06-01T12:00:00Z",
          locationType: "venue",
        } as never);
        expect(txMock.eventSpeaker.createMany).not.toHaveBeenCalled();
      });

      it("speakers を渡すと sortOrder + userId 含めて一括登録される（外部講師 + 会員）", async () => {
        await service.create("user-1", {
          title: "T",
          startAt: "2026-06-01T10:00:00Z",
          endAt: "2026-06-01T12:00:00Z",
          locationType: "venue",
          speakers: [
            { name: "山田 先生", title: "教授", role: "speaker" },
            { name: "鈴木 さん", role: "co_speaker", userId: "user-2" },
          ],
        } as never);
        expect(txMock.eventSpeaker.createMany).toHaveBeenCalledWith({
          data: [
            {
              eventId: "new-event",
              name: "山田 先生",
              title: "教授",
              role: "speaker",
              userId: undefined,
              sortOrder: 0,
            },
            {
              eventId: "new-event",
              name: "鈴木 さん",
              title: undefined,
              role: "co_speaker",
              userId: "user-2",
              sortOrder: 1,
            },
          ],
        });
      });
    });

    describe("update での speakers 全件置換", () => {
      beforeEach(() => {
        prismaMock.event.findUnique
          .mockResolvedValueOnce({ id: "e1", deletedAt: null })
          .mockResolvedValueOnce(baseEventDetail);
      });

      it("speakers: undefined なら deleteMany も createMany も呼ばれない", async () => {
        await service.update("e1", { title: "new title" });
        expect(txMock.eventSpeaker.deleteMany).not.toHaveBeenCalled();
        expect(txMock.eventSpeaker.createMany).not.toHaveBeenCalled();
      });

      it("speakers: [] なら全件削除のみ", async () => {
        await service.update("e1", { speakers: [] });
        expect(txMock.eventSpeaker.deleteMany).toHaveBeenCalledWith({
          where: { eventId: "e1" },
        });
        expect(txMock.eventSpeaker.createMany).not.toHaveBeenCalled();
      });

      it("speakers: [...] なら全件削除 + 新規挿入（sortOrder は index）", async () => {
        await service.update("e1", {
          speakers: [{ name: "A", role: "speaker" as never }],
        });
        expect(txMock.eventSpeaker.deleteMany).toHaveBeenCalled();
        expect(txMock.eventSpeaker.createMany).toHaveBeenCalledWith({
          data: [
            {
              eventId: "e1",
              name: "A",
              title: undefined,
              role: "speaker",
              userId: undefined,
              sortOrder: 0,
            },
          ],
        });
      });
    });
  });

  describe("findAll: pgroonga 検索経路の role 制御", () => {
    // searchByPgroonga 内で組み立てる WHERE 句は Prisma.sql テンプレートリテラル。
    // 非 admin/owner のときに `status = 'recruiting'::"EventStatus"` が SQL リテラルとして
    // 埋め込まれることを、$queryRaw に渡された Prisma.Sql の `.sql` 文字列で検証する。
    const sqlOf = (call: unknown[]): string => {
      const first = call[0] as { sql?: string; strings?: readonly string[] };
      // Prisma.Sql は `.sql` getter を持つが、フォールバックとして strings.join もケア。
      return first.sql ?? (first.strings ? first.strings.join("?") : "");
    };

    it("admin が search すると WHERE 句に recruiting 強制は入らない", async () => {
      await service.findAll({ search: "勉強会" }, "admin");
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      const sqlText = sqlOf(prismaMock.$queryRaw.mock.calls[0]);
      expect(sqlText).not.toMatch(/'recruiting'::"EventStatus"/);
    });

    it("admin が status を明示すると status 条件が SQL に含まれる（値はパラメータ）", async () => {
      await service.findAll({ search: "勉強会", status: "draft" }, "admin");
      const sqlObj = prismaMock.$queryRaw.mock.calls[0][0] as {
        sql: string;
        values: unknown[];
      };
      expect(sqlObj.sql).toMatch(/status =/);
      expect(sqlObj.values).toEqual(expect.arrayContaining(["draft"]));
    });

    it("member が search すると WHERE 句に status='recruiting' リテラルが強制される", async () => {
      await service.findAll({ search: "勉強会" }, "member");
      const sqlText = sqlOf(prismaMock.$queryRaw.mock.calls[0]);
      expect(sqlText).toMatch(/status = 'recruiting'::"EventStatus"/);
    });

    it("member が status='draft' を指定しても recruiting に強制される（status パラメータは積まれない）", async () => {
      await service.findAll({ search: "勉強会", status: "draft" }, "member");
      const sqlObj = prismaMock.$queryRaw.mock.calls[0][0] as {
        sql: string;
        values: unknown[];
      };
      expect(sqlObj.sql).toMatch(/status = 'recruiting'::"EventStatus"/);
      // member 経路では status の値はバインドされず、リテラルだけが入る
      expect(sqlObj.values).not.toContain("draft");
    });

    it("visitor も recruiting に強制される", async () => {
      await service.findAll({ search: "勉強会" }, "visitor");
      const sqlText = sqlOf(prismaMock.$queryRaw.mock.calls[0]);
      expect(sqlText).toMatch(/status = 'recruiting'::"EventStatus"/);
    });
  });

  describe("findOne: not-found 系", () => {
    it("findUnique が null を返したら NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne("missing", "admin")).rejects.toThrow("イベントが見つかりません");
    });

    it("deletedAt が立っていれば admin でも NotFoundException（論理削除）", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce({
        id: "e1",
        deletedAt: new Date(),
        status: "recruiting",
      });
      await expect(service.findOne("e1", "admin")).rejects.toThrow("イベントが見つかりません");
    });
  });

  describe("participate: 事前バリデーション", () => {
    type ParticipateTxMock = {
      eventParticipant: { create: jest.Mock };
      eventParticipantAnswer: { createMany: jest.Mock };
      eventTicket: { update: jest.Mock };
      event: { update: jest.Mock };
      eventDiscountCode: { update: jest.Mock };
    };

    const baseTicket = {
      id: "ticket-1",
      isActive: true,
      capacity: 10,
      soldCount: 0,
      purchaseLimit: 3,
    };

    const baseEvent = (over: Partial<Record<string, unknown>> = {}) => ({
      id: "e1",
      title: "勉強会",
      status: "recruiting",
      deletedAt: null,
      registrationDeadlineAt: null,
      createdByUserId: "owner-1",
      tickets: [baseTicket],
      applicationFormConfig: null,
      ...over,
    });

    const baseDto = { ticketId: "ticket-1" };

    it("イベントが存在しなければ NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(null);
      await expect(service.participate("e1", "user-1", baseDto as never)).rejects.toThrow(
        "イベントが見つかりません",
      );
    });

    it("既に有効な申込（キャンセル以外）がある場合は BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent());
      prismaMock.eventParticipant.findFirst.mockResolvedValueOnce({
        id: "p-existing",
        status: "applied",
      });
      await expect(service.participate("e1", "user-1", baseDto as never)).rejects.toThrow(
        "すでにこのイベントに申込済み",
      );
    });

    it("status≠recruiting なら BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent({ status: "draft" }));
      await expect(service.participate("e1", "user-1", baseDto as never)).rejects.toThrow(
        "現在募集していません",
      );
    });

    it("申込締切を過ぎていたら BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(
        baseEvent({ registrationDeadlineAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.participate("e1", "user-1", baseDto as never)).rejects.toThrow(
        "申込締切を過ぎています",
      );
    });

    it("ticketId が無いと BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent());
      await expect(
        service.participate("e1", "user-1", { ticketId: "unknown" } as never),
      ).rejects.toThrow("チケットが見つかりません");
    });

    it("チケットが isActive=false なら販売停止扱い", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(
        baseEvent({ tickets: [{ ...baseTicket, isActive: false }] }),
      );
      await expect(service.participate("e1", "user-1", baseDto as never)).rejects.toThrow(
        "販売停止中",
      );
    });

    it("定員超過で BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(
        baseEvent({ tickets: [{ ...baseTicket, capacity: 5, soldCount: 5 }] }),
      );
      await expect(
        service.participate("e1", "user-1", { ticketId: "ticket-1", quantity: 1 } as never),
      ).rejects.toThrow("定員に達しています");
    });

    it("quantity が purchaseLimit を超えると BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent());
      await expect(
        service.participate("e1", "user-1", { ticketId: "ticket-1", quantity: 5 } as never),
      ).rejects.toThrow("購入上限");
    });

    it("applicationFormConfig が required を要求しているのに値が空なら BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(
        baseEvent({
          applicationFormConfig: {
            askName: "required",
            askNameKana: "off",
            askAffiliation: "off",
            askGender: "off",
            askAge: "off",
            askOccupation: "off",
            askNationality: "off",
          },
        }),
      );
      await expect(
        service.participate("e1", "user-1", { ticketId: "ticket-1" } as never),
      ).rejects.toThrow("氏名は必須です");
    });

    it("カスタム質問が必須なのに answers に無いと BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent());
      prismaMock.eventApplicationQuestion.findMany.mockResolvedValueOnce([
        { id: "q1", label: "参加目的", isRequired: true, questionType: "text", options: null },
      ]);
      await expect(
        service.participate("e1", "user-1", { ticketId: "ticket-1" } as never),
      ).rejects.toThrow("「参加目的」は必須です");
    });

    it("radio/select/checkbox の回答が選択肢外なら BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent());
      prismaMock.eventApplicationQuestion.findMany.mockResolvedValueOnce([
        {
          id: "q1",
          label: "希望時間",
          isRequired: false,
          questionType: "radio",
          options: [{ value: "morning" }, { value: "afternoon" }],
        },
      ]);
      await expect(
        service.participate("e1", "user-1", {
          ticketId: "ticket-1",
          answers: [{ questionId: "q1", answer: "evening" }],
        } as never),
      ).rejects.toThrow("無効な選択肢");
    });

    it("無効な割引コードを渡すと BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent());
      prismaMock.eventDiscountCode.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.participate("e1", "user-1", {
          ticketId: "ticket-1",
          discountCode: "INVALID",
        } as never),
      ).rejects.toThrow("無効な割引コード");
    });

    it("割引コードが期限切れだと BadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent());
      prismaMock.eventDiscountCode.findFirst.mockResolvedValueOnce({
        id: "d1",
        expiresAt: new Date(Date.now() - 1000),
        usageLimit: null,
        usedCount: 0,
      });
      await expect(
        service.participate("e1", "user-1", {
          ticketId: "ticket-1",
          discountCode: "EXPIRED",
        } as never),
      ).rejects.toThrow("有効期限が切れて");
    });

    it("割引コードの使用回数上限に達しているとBadRequestException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent());
      prismaMock.eventDiscountCode.findFirst.mockResolvedValueOnce({
        id: "d1",
        expiresAt: null,
        usageLimit: 5,
        usedCount: 5,
      });
      await expect(
        service.participate("e1", "user-1", {
          ticketId: "ticket-1",
          discountCode: "USED-UP",
        } as never),
      ).rejects.toThrow("使用回数上限");
    });

    it("バリデーション全通過なら participant.create が呼ばれて通知も走る", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent());
      const txMock: ParticipateTxMock = {
        eventParticipant: {
          create: jest.fn().mockResolvedValue({ id: "p1" }),
        },
        eventParticipantAnswer: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        eventTicket: {
          update: jest.fn().mockResolvedValue({}),
        },
        event: {
          update: jest.fn().mockResolvedValue({ participantCount: 1 }),
        },
        eventDiscountCode: {
          update: jest.fn().mockResolvedValue({}),
        },
      };
      prismaMock.$transaction.mockImplementationOnce(
        (cb: (tx: ParticipateTxMock) => Promise<unknown>) => cb(txMock),
      );

      prismaMock.user.findMany.mockResolvedValueOnce([
        { id: "admin-1" },
        { id: "admin-2" },
        { id: "owner-1" }, // 作成者と重複（dedupe される想定）
      ]);
      prismaMock.user.findUnique.mockResolvedValueOnce({ name: "申込者" });

      const result = await service.participate("e1", "user-1", baseDto as never);
      expect(result).toEqual({ id: "p1" });
      expect(txMock.eventParticipant.create).toHaveBeenCalled();
      expect(txMock.eventTicket.update).toHaveBeenCalledWith({
        where: { id: "ticket-1" },
        data: { soldCount: { increment: 1 } },
      });
      // 申込者本人への通知
      expect(notificationsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          type: "event_application",
        }),
      );
      // 作成者 + admin 全員に対する通知（createMany で一括、申込者本人除外、重複排除）
      expect(notificationsMock.createMany).toHaveBeenCalledTimes(1);
      const adminNotifications = notificationsMock.createMany.mock.calls[0][0] as Array<{
        userId: string;
        type: string;
        actorUserId: string;
      }>;
      const recipientIds = adminNotifications.map((n) => n.userId).sort();
      expect(recipientIds).toEqual(["admin-1", "admin-2", "owner-1"]);
      expect(adminNotifications[0]?.type).toBe("event_application_received");
      expect(adminNotifications[0]?.actorUserId).toBe("user-1");
    });

    it("申込者が作成者かつ admin の場合は admin 通知をスキップ", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(baseEvent({ createdByUserId: "user-1" }));
      const txMock: ParticipateTxMock = {
        eventParticipant: { create: jest.fn().mockResolvedValue({ id: "p1" }) },
        eventParticipantAnswer: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
        eventTicket: { update: jest.fn().mockResolvedValue({}) },
        event: { update: jest.fn().mockResolvedValue({ participantCount: 1 }) },
        eventDiscountCode: { update: jest.fn().mockResolvedValue({}) },
      };
      prismaMock.$transaction.mockImplementationOnce(
        (cb: (tx: ParticipateTxMock) => Promise<unknown>) => cb(txMock),
      );
      // admin 一覧にも自分しかいない場合 (申込者本人を除外すると 0 件)
      prismaMock.user.findMany.mockResolvedValueOnce([{ id: "user-1" }]);

      await service.participate("e1", "user-1", baseDto as never);
      expect(notificationsMock.createMany).not.toHaveBeenCalled();
    });
  });

  describe("duplicate: イベント複製", () => {
    type DuplicateTxMock = {
      event: { create: jest.Mock };
      eventTicket: { createMany: jest.Mock };
      eventApplicationFormConfig: { create: jest.Mock };
      eventApplicationQuestion: { createMany: jest.Mock };
      eventSpeaker: { createMany: jest.Mock };
      eventOrganization: { createMany: jest.Mock };
      eventTag: { createMany: jest.Mock; deleteMany: jest.Mock };
      tag: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    };

    const sourceDetail = {
      id: "src",
      title: "元イベント",
      description: "desc",
      locationType: "venue",
      venueId: "v1",
      venueName: null,
      venueAddress: null,
      onlineUrl: null,
      startAt: new Date("2026-06-01T10:00:00Z"),
      endAt: new Date("2026-06-01T12:00:00Z"),
      registrationDeadlineAt: null,
      ticketSaleStartAt: null,
      allowMultiTicketPurchase: false,
      acceptedPaymentMethods: null,
      planningRole: null,
      eventTypes: ["セミナー・ワークショップ"],
      accessInfo: null,
      participationMethod: null,
      contactInfo: null,
      cancellationPolicy: null,
      language: "ja",
      isAttendeeVisible: false,
      coverImageUrl: null,
      requiredRankId: null,
      isCalendarVisible: true,
      deletedAt: null,
      tickets: [
        {
          ticketName: "一般",
          price: 1000,
          currency: "JPY",
          capacity: 10,
          purchaseLimit: 1,
          sortOrder: 0,
          isActive: true,
        },
      ],
      applicationFormConfig: {
        notifyOnCapacityReached: true,
        notifyOnRemainingThreshold: null,
        completionMessageApp: "ありがとう",
        completionMessageEmail: null,
        askName: "required",
        askNameKana: "off",
        askAffiliation: "off",
        askGender: "off",
        askAge: "off",
        askOccupation: "off",
        askNationality: "off",
        reminderEnabled: false,
        reminderHoursBefore: 24,
        reminderMessage: null,
      },
      applicationQuestions: [
        {
          label: "参加目的",
          description: null,
          questionType: "text",
          options: null,
          isRequired: true,
          sortOrder: 0,
        },
      ],
      speakers: [
        {
          userId: null,
          name: "山田 先生",
          title: "教授",
          role: "speaker",
          sortOrder: 0,
        },
      ],
      organizations: [
        {
          organizationName: "東京大学",
          role: "co_organizer",
          sortOrder: 0,
        },
      ],
      tags: [{ tag: { id: "t1", name: "勉強会", slug: "勉強会" } }],
    };

    const newDetailReturn = {
      id: "new-event",
      title: "元イベント（コピー）",
      deletedAt: null,
      status: "draft",
      createdByUser: { id: "user-1", name: "u", profile: null },
      tickets: [],
      speakers: [],
      organizations: [],
      tags: [],
      _count: { participants: 0 },
    };

    let txMock: DuplicateTxMock;

    beforeEach(() => {
      txMock = {
        event: {
          create: jest.fn().mockResolvedValue({ id: "new-event" }),
        },
        eventTicket: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
        eventApplicationFormConfig: { create: jest.fn().mockResolvedValue({}) },
        eventApplicationQuestion: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
        eventSpeaker: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
        eventOrganization: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
        eventTag: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        tag: {
          findFirst: jest.fn().mockResolvedValue({ id: "t1" }),
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: "t1" }),
        },
      };
      // event.update は syncEventTags 内で tagsText 同期用に呼ばれる
      (txMock.event as unknown as { update: jest.Mock }).update = jest.fn().mockResolvedValue({});
      prismaMock.$transaction.mockImplementation((cb: (tx: DuplicateTxMock) => Promise<unknown>) =>
        cb(txMock),
      );
    });

    it("複製元が存在しなければ NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce(null);
      await expect(service.duplicate("missing", "user-1")).rejects.toThrow(
        "イベントが見つかりません",
      );
    });

    it("複製元が論理削除済みなら NotFoundException", async () => {
      prismaMock.event.findUnique.mockResolvedValueOnce({ ...sourceDetail, deletedAt: new Date() });
      await expect(service.duplicate("src", "user-1")).rejects.toThrow("イベントが見つかりません");
    });

    it("title に「（コピー）」が付き、status=draft、参加者数 0 で作成される", async () => {
      // 1 回目: duplicate() 冒頭の findUnique（source）
      // 2 回目: 末尾の findOne(newEvent.id, "admin")
      prismaMock.event.findUnique
        .mockResolvedValueOnce(sourceDetail)
        .mockResolvedValueOnce(newDetailReturn);

      await service.duplicate("src", "user-1");

      const createArgs = txMock.event.create.mock.calls[0][0];
      expect(createArgs.data.title).toBe("元イベント（コピー）");
      expect(createArgs.data.status).toBe("draft");
      expect(createArgs.data.participantCount).toBe(0);
      expect(createArgs.data.createdByUserId).toBe("user-1");
    });

    it("tickets / questions / speakers / organizations が複製される", async () => {
      prismaMock.event.findUnique
        .mockResolvedValueOnce(sourceDetail)
        .mockResolvedValueOnce(newDetailReturn);

      await service.duplicate("src", "user-1");

      expect(txMock.eventTicket.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            eventId: "new-event",
            ticketName: "一般",
            soldCount: 0,
          }),
        ],
      });
      expect(txMock.eventApplicationFormConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: "new-event",
          askName: "required",
        }),
      });
      expect(txMock.eventApplicationQuestion.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            eventId: "new-event",
            label: "参加目的",
            isRequired: true,
          }),
        ],
      });
      expect(txMock.eventSpeaker.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            eventId: "new-event",
            name: "山田 先生",
            role: "speaker",
          }),
        ],
      });
      expect(txMock.eventOrganization.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            eventId: "new-event",
            organizationName: "東京大学",
            role: "co_organizer",
          }),
        ],
      });
    });

    it("tags は syncEventTags 経由で EventTag が貼られ tags_text も同期される", async () => {
      prismaMock.event.findUnique
        .mockResolvedValueOnce(sourceDetail)
        .mockResolvedValueOnce(newDetailReturn);

      await service.duplicate("src", "user-1");

      expect(txMock.eventTag.createMany).toHaveBeenCalledWith({
        data: [{ eventId: "new-event", tagId: "t1" }],
        skipDuplicates: true,
      });
      const updateMock = (txMock.event as unknown as { update: jest.Mock }).update;
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: "new-event" },
        data: { tagsText: "勉強会" },
      });
    });

    it("複製元が空コレクションなら対応する createMany は呼ばれない", async () => {
      prismaMock.event.findUnique
        .mockResolvedValueOnce({
          ...sourceDetail,
          tickets: [],
          applicationFormConfig: null,
          applicationQuestions: [],
          speakers: [],
          organizations: [],
          tags: [],
        })
        .mockResolvedValueOnce(newDetailReturn);

      await service.duplicate("src", "user-1");

      expect(txMock.eventTicket.createMany).not.toHaveBeenCalled();
      expect(txMock.eventApplicationFormConfig.create).not.toHaveBeenCalled();
      expect(txMock.eventApplicationQuestion.createMany).not.toHaveBeenCalled();
      expect(txMock.eventSpeaker.createMany).not.toHaveBeenCalled();
      expect(txMock.eventOrganization.createMany).not.toHaveBeenCalled();
      expect(txMock.eventTag.createMany).not.toHaveBeenCalled();
    });
  });
});
