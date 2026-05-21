import { ErrorCode } from "@community-platform/shared";
import { VenuesService } from "./venues.service";

type Jestify<T> = { [K in keyof T]: jest.Mock };

function makeDelegate<T extends string>(): Jestify<Record<T, unknown>> {
  return new Proxy(
    {},
    {
      get: (target: Record<string, jest.Mock>, prop: string) => {
        if (!target[prop]) target[prop] = jest.fn();
        return target[prop];
      },
    },
  ) as Jestify<Record<T, unknown>>;
}

describe("VenuesService", () => {
  let prismaMock: {
    venue: Jestify<Record<"findMany" | "findUnique" | "create" | "update", unknown>>;
    venueImage: Jestify<Record<"deleteMany" | "createMany", unknown>>;
    space: Jestify<Record<"create" | "findUnique", unknown>>;
    reservation: Jestify<
      Record<"findMany" | "findUnique" | "findFirst" | "create" | "update", unknown>
    >;
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let service: VenuesService;

  beforeEach(() => {
    prismaMock = {
      venue: makeDelegate(),
      venueImage: makeDelegate(),
      space: makeDelegate(),
      reservation: makeDelegate(),
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(prismaMock)),
    };
    prismaMock.venue.findMany.mockResolvedValue([]);
    prismaMock.venueImage.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.venueImage.createMany.mockResolvedValue({ count: 0 });
    service = new VenuesService(prismaMock as never);
  });

  // ============================================================================
  // findAllVenues: 経路分岐
  // ============================================================================
  describe("findAllVenues: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany）が呼ばれる", async () => {
      await service.findAllVenues({});
      expect(prismaMock.venue.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAllVenues({ search: "会議室" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAllVenues({ search: "+()[]{}" });
      expect(prismaMock.venue.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("findAllVenues: publishStatus による絞り込み", () => {
    it("publishStatus 未指定なら deletedAt のみで絞り込む", async () => {
      await service.findAllVenues({});
      const args = prismaMock.venue.findMany.mock.calls[0]![0] as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual(expect.objectContaining({ deletedAt: null }));
      expect(args.where.publishStatus).toBeUndefined();
    });

    it("publishStatus='all' なら絞り込まない", async () => {
      await service.findAllVenues({ publishStatus: "all" });
      const args = prismaMock.venue.findMany.mock.calls[0]![0] as {
        where: Record<string, unknown>;
      };
      expect(args.where.publishStatus).toBeUndefined();
    });

    it("publishStatus='draft' を指定すれば where.publishStatus に反映", async () => {
      await service.findAllVenues({ publishStatus: "draft" });
      const args = prismaMock.venue.findMany.mock.calls[0]![0] as {
        where: Record<string, unknown>;
      };
      expect(args.where.publishStatus).toBe("draft");
    });
  });

  describe("findAllVenues: 検索ヒット時の整形後 shape", () => {
    it("配列の各要素に titleHighlighted / snippetHighlighted が付与される", async () => {
      const id = "33333333-3333-3333-3333-333333333333";
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id,
            score: 1,
            titleHighlighted: "<span>会場</span>",
            snippetHighlighted: "<span>説明</span>",
          },
        ])
        .mockResolvedValueOnce([{ count: 1n }]);
      prismaMock.venue.findMany.mockResolvedValueOnce([
        {
          id,
          name: "会場",
          description: "説明",
          publishStatus: "published",
          _count: { spaces: 0 },
          images: [],
        },
      ]);
      const result = (await service.findAllVenues({ search: "会場" })) as Array<{
        id: string;
        titleHighlighted?: string;
        snippetHighlighted?: string;
      }>;
      expect(result[0]).toEqual(
        expect.objectContaining({
          id,
          titleHighlighted: "<span>会場</span>",
          snippetHighlighted: "<span>説明</span>",
        }),
      );
    });
  });

  // ============================================================================
  // findOneVenue
  // ============================================================================
  describe("findOneVenue: 施設詳細", () => {
    const venue = {
      id: "v-1",
      deletedAt: null,
      name: "会議室",
      venueTypes: [],
      publishStatus: "published",
      spaces: [],
      images: [],
      events: [],
    };

    it("存在する施設はそのまま返す", async () => {
      prismaMock.venue.findUnique.mockResolvedValue(venue);
      const result = await service.findOneVenue("v-1");
      expect(result).toBe(venue);
    });

    it("存在しなければ NOT_FOUND の BusinessException を投げる", async () => {
      prismaMock.venue.findUnique.mockResolvedValue(null);
      await expect(service.findOneVenue("missing")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("削除済み（deletedAt あり）も NOT_FOUND", async () => {
      prismaMock.venue.findUnique.mockResolvedValue({ ...venue, deletedAt: new Date() });
      await expect(service.findOneVenue("v-1")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ============================================================================
  // createVenue
  // ============================================================================
  describe("createVenue: 施設登録", () => {
    it("publishStatus 未指定なら 'draft' で作成する", async () => {
      prismaMock.venue.create.mockResolvedValue({ id: "v-new" });
      await service.createVenue("u-1", { name: "新規会場" });
      const args = prismaMock.venue.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(args.data.name).toBe("新規会場");
      expect(args.data.publishStatus).toBe("draft");
      expect(args.data.createdByUserId).toBe("u-1");
      expect(args.data.venueTypes).toEqual([]);
    });

    it("publishStatus が指定されていればその値で作成する", async () => {
      prismaMock.venue.create.mockResolvedValue({ id: "v-new" });
      await service.createVenue("u-1", { name: "公開会場", publishStatus: "published" });
      const args = prismaMock.venue.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(args.data.publishStatus).toBe("published");
    });

    it("imageFileIds が指定されていれば images.create に紐付ける（先頭が isPrimary=true）", async () => {
      prismaMock.venue.create.mockResolvedValue({ id: "v-new" });
      await service.createVenue("u-1", {
        name: "画像付き会場",
        imageFileIds: ["f-1", "f-2"],
      });
      const args = prismaMock.venue.create.mock.calls[0]![0] as {
        data: {
          images?: { create: Array<{ fileId: string; sortOrder: number; isPrimary: boolean }> };
        };
      };
      expect(args.data.images?.create).toEqual([
        { fileId: "f-1", sortOrder: 0, isPrimary: true },
        { fileId: "f-2", sortOrder: 1, isPrimary: false },
      ]);
    });

    it("imageFileIds が空配列なら images キーを生成しない", async () => {
      prismaMock.venue.create.mockResolvedValue({ id: "v-new" });
      await service.createVenue("u-1", { name: "画像なし", imageFileIds: [] });
      const args = prismaMock.venue.create.mock.calls[0]![0] as {
        data: { images?: unknown };
      };
      expect(args.data.images).toBeUndefined();
    });
  });

  // ============================================================================
  // updateVenue
  // ============================================================================
  describe("updateVenue: 施設更新", () => {
    const venue = { id: "v-1", deletedAt: null };

    it("存在しない施設は NOT_FOUND", async () => {
      prismaMock.venue.findUnique.mockResolvedValue(null);
      await expect(service.updateVenue("v-1", { name: "x" })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("削除済み施設は NOT_FOUND", async () => {
      prismaMock.venue.findUnique.mockResolvedValue({ ...venue, deletedAt: new Date() });
      await expect(service.updateVenue("v-1", { name: "x" })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("imageFileIds 指定時は既存画像を全削除してから差し替える", async () => {
      prismaMock.venue.findUnique.mockResolvedValue(venue);
      prismaMock.venue.update.mockResolvedValue(venue);
      await service.updateVenue("v-1", { imageFileIds: ["f-1", "f-2"] });
      expect(prismaMock.venueImage.deleteMany).toHaveBeenCalledWith({ where: { venueId: "v-1" } });
      const createArgs = prismaMock.venueImage.createMany.mock.calls[0]![0] as {
        data: Array<{ fileId: string; isPrimary: boolean }>;
      };
      expect(createArgs.data).toEqual([
        { venueId: "v-1", fileId: "f-1", sortOrder: 0, isPrimary: true },
        { venueId: "v-1", fileId: "f-2", sortOrder: 1, isPrimary: false },
      ]);
    });

    it("imageFileIds=[] でも deleteMany は走るが createMany は呼ばれない", async () => {
      prismaMock.venue.findUnique.mockResolvedValue(venue);
      prismaMock.venue.update.mockResolvedValue(venue);
      await service.updateVenue("v-1", { imageFileIds: [] });
      expect(prismaMock.venueImage.deleteMany).toHaveBeenCalled();
      expect(prismaMock.venueImage.createMany).not.toHaveBeenCalled();
    });

    it("imageFileIds 未指定なら画像系の delete/create は呼ばない", async () => {
      prismaMock.venue.findUnique.mockResolvedValue(venue);
      prismaMock.venue.update.mockResolvedValue(venue);
      await service.updateVenue("v-1", { name: "更新後" });
      expect(prismaMock.venueImage.deleteMany).not.toHaveBeenCalled();
      expect(prismaMock.venueImage.createMany).not.toHaveBeenCalled();
    });

    it("undefined のフィールドは Prisma.update.data から除外される", async () => {
      prismaMock.venue.findUnique.mockResolvedValue(venue);
      prismaMock.venue.update.mockResolvedValue(venue);
      await service.updateVenue("v-1", { name: "更新後" });
      const args = prismaMock.venue.update.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(args.data).toEqual({ name: "更新後" });
    });
  });

  // ============================================================================
  // removeVenue
  // ============================================================================
  describe("removeVenue: 施設削除（論理削除）", () => {
    it("deletedAt を埋めて update する", async () => {
      prismaMock.venue.update.mockResolvedValue({});
      await service.removeVenue("v-1");
      const args = prismaMock.venue.update.mock.calls[0]![0] as {
        where: { id: string };
        data: { deletedAt: Date };
      };
      expect(args.where.id).toBe("v-1");
      expect(args.data.deletedAt).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // createSpace
  // ============================================================================
  describe("createSpace: スペース作成", () => {
    it("dto + venueId を space.create に渡し、publishStatus は 'published' 固定", async () => {
      prismaMock.space.create.mockResolvedValue({ id: "sp-new" });
      await service.createSpace("v-1", { name: "会議室A", capacity: 10 });
      const args = prismaMock.space.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(args.data.venueId).toBe("v-1");
      expect(args.data.name).toBe("会議室A");
      expect(args.data.capacity).toBe(10);
      expect(args.data.spaceTypes).toEqual([]);
      expect(args.data.publishStatus).toBe("published");
    });

    it("spaceTypes が指定されていればその値で作成する", async () => {
      prismaMock.space.create.mockResolvedValue({ id: "sp-new" });
      await service.createSpace("v-1", { name: "S", spaceTypes: ["conference_room_large"] });
      const args = prismaMock.space.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(args.data.spaceTypes).toEqual(["conference_room_large"]);
    });
  });

  // ============================================================================
  // getReservations / getVenueReservations
  // ============================================================================
  describe("getReservations: スペース内予約一覧", () => {
    it("spaceId で findMany を呼び、startAt 昇順", async () => {
      prismaMock.reservation.findMany.mockResolvedValue([]);
      await service.getReservations("sp-1");
      expect(prismaMock.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { spaceId: "sp-1" },
          orderBy: { startAt: "asc" },
        }),
      );
    });
  });

  describe("getVenueReservations: 施設内全予約一覧", () => {
    it("venueId 配下の非キャンセル予約のみを返す", async () => {
      prismaMock.reservation.findMany.mockResolvedValue([]);
      await service.getVenueReservations("v-1");
      const args = prismaMock.reservation.findMany.mock.calls[0]![0] as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual(
        expect.objectContaining({
          space: { venueId: "v-1", deletedAt: null },
          status: { not: "canceled" },
        }),
      );
    });
  });

  // ============================================================================
  // createReservation
  // ============================================================================
  describe("createReservation: 予約作成", () => {
    const reservableSpace = { id: "sp-1", deletedAt: null, isReservable: true };
    const validDto = {
      title: "打ち合わせ",
      startAt: "2026-06-01T10:00:00.000Z",
      endAt: "2026-06-01T11:00:00.000Z",
    };

    it("スペースが存在しなければ NOT_FOUND", async () => {
      prismaMock.space.findUnique.mockResolvedValue(null);
      await expect(service.createReservation("sp-1", "u-1", validDto)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("スペースが削除済みなら NOT_FOUND", async () => {
      prismaMock.space.findUnique.mockResolvedValue({ ...reservableSpace, deletedAt: new Date() });
      await expect(service.createReservation("sp-1", "u-1", validDto)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("スペースが予約不可（isReservable=false）なら NOT_FOUND", async () => {
      prismaMock.space.findUnique.mockResolvedValue({ ...reservableSpace, isReservable: false });
      await expect(service.createReservation("sp-1", "u-1", validDto)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("重複予約があれば CONFLICT", async () => {
      prismaMock.space.findUnique.mockResolvedValue(reservableSpace);
      prismaMock.reservation.findFirst.mockResolvedValue({ id: "r-existing" });
      await expect(service.createReservation("sp-1", "u-1", validDto)).rejects.toMatchObject({
        code: ErrorCode.CONFLICT,
      });
    });

    it("重複なしなら create を呼び、startAt / endAt は Date に変換される", async () => {
      prismaMock.space.findUnique.mockResolvedValue(reservableSpace);
      prismaMock.reservation.findFirst.mockResolvedValue(null);
      prismaMock.reservation.create.mockResolvedValue({ id: "r-new" });
      await service.createReservation("sp-1", "u-1", validDto);
      const args = prismaMock.reservation.create.mock.calls[0]![0] as {
        data: { spaceId: string; userId: string; startAt: Date; endAt: Date };
      };
      expect(args.data.spaceId).toBe("sp-1");
      expect(args.data.userId).toBe("u-1");
      expect(args.data.startAt).toBeInstanceOf(Date);
      expect(args.data.endAt).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // cancelReservation
  // ============================================================================
  describe("cancelReservation: 予約キャンセル", () => {
    it("予約が存在しなければ NOT_FOUND", async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(null);
      await expect(service.cancelReservation("r-1", "u-1")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("他人の予約をキャンセルしようとすると FORBIDDEN", async () => {
      prismaMock.reservation.findUnique.mockResolvedValue({ id: "r-1", userId: "u-other" });
      await expect(service.cancelReservation("r-1", "u-1")).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
    });

    it("予約者本人ならステータスを 'canceled' に更新する", async () => {
      prismaMock.reservation.findUnique.mockResolvedValue({ id: "r-1", userId: "u-1" });
      prismaMock.reservation.update.mockResolvedValue({ id: "r-1", status: "canceled" });
      await service.cancelReservation("r-1", "u-1");
      expect(prismaMock.reservation.update).toHaveBeenCalledWith({
        where: { id: "r-1" },
        data: { status: "canceled" },
      });
    });
  });
});
