import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { SkillsService } from "./skills.service";

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

describe("SkillsService", () => {
  let prismaMock: {
    skillListing: Jestify<
      Record<"findMany" | "count" | "findUnique" | "create" | "update", unknown>
    >;
    skillBooking: Jestify<Record<"findMany" | "findUnique" | "create" | "update", unknown>>;
    skillMessage: Jestify<Record<"findMany" | "create", unknown>>;
    skillComment: Jestify<Record<"findMany" | "findUnique" | "create" | "update", unknown>>;
    user: Jestify<Record<"findUnique", unknown>>;
    $queryRaw: jest.Mock;
  };
  let notificationsMock: { create: jest.Mock };
  let service: SkillsService;

  beforeEach(() => {
    prismaMock = {
      skillListing: makeDelegate(),
      skillBooking: makeDelegate(),
      skillMessage: makeDelegate(),
      skillComment: makeDelegate(),
      user: makeDelegate(),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    prismaMock.skillListing.findMany.mockResolvedValue([]);
    prismaMock.skillListing.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({ role: "member" });

    notificationsMock = { create: jest.fn().mockResolvedValue(undefined) };
    service = new SkillsService(prismaMock as never, notificationsMock as never);
  });

  // ============================================================================
  // findAll: 経路分岐
  // ============================================================================
  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({});
      expect(prismaMock.skillListing.findMany).toHaveBeenCalled();
      expect(prismaMock.skillListing.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "プログラミング" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" });
      expect(prismaMock.skillListing.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("findAll: 可視性（一般は active 固定 / admin・owner は全 status）", () => {
    it("未認証ユーザーは status='active' で絞り込まれる", async () => {
      await service.findAll({});
      const args = prismaMock.skillListing.findMany.mock.calls[0]![0];
      expect(args.where.status).toBe("active");
    });

    it("admin は status 未指定なら絞り込まない（全 status 表示）", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ role: "admin" });
      await service.findAll({}, "u-admin");
      const args = prismaMock.skillListing.findMany.mock.calls[0]![0];
      expect(args.where.status).toBeUndefined();
    });

    it("admin が status を指定すればその status で絞る", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ role: "admin" });
      await service.findAll({ status: "draft" }, "u-admin");
      const args = prismaMock.skillListing.findMany.mock.calls[0]![0];
      expect(args.where.status).toBe("draft");
    });
  });

  // ============================================================================
  // findOne
  // ============================================================================
  describe("findOne: スキル詳細", () => {
    const listing = {
      id: "s-1",
      providerUserId: "u-owner",
      status: "active",
      deletedAt: null,
      provider: { id: "u-owner", name: "Owner", profile: null },
    };

    it("active なスキルは誰でも閲覧できる", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(listing);
      const result = await service.findOne("s-1");
      expect(result.id).toBe("s-1");
    });

    it("存在しなければ NotFoundException", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
    });

    it("削除済み（deletedAt あり）も NotFoundException", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue({ ...listing, deletedAt: new Date() });
      await expect(service.findOne("s-1")).rejects.toThrow(NotFoundException);
    });

    it("active 以外を一般ユーザー（非作成者）が見ようとすると NotFoundException（存在を漏らさない）", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue({ ...listing, status: "draft" });
      await expect(service.findOne("s-1", "u-other")).rejects.toThrow(NotFoundException);
    });

    it("active 以外でも作成者本人なら閲覧できる", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue({ ...listing, status: "draft" });
      const result = await service.findOne("s-1", "u-owner");
      expect(result.id).toBe("s-1");
    });

    it("active 以外でも admin / owner なら閲覧できる", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue({ ...listing, status: "draft" });
      prismaMock.user.findUnique.mockResolvedValue({ role: "admin" });
      const result = await service.findOne("s-1", "u-admin");
      expect(result.id).toBe("s-1");
    });
  });

  // ============================================================================
  // create / update / remove
  // ============================================================================
  describe("create: スキル出品", () => {
    it("dto を prisma.create に渡し、format 未指定なら 'online' で作成する", async () => {
      prismaMock.skillListing.create.mockResolvedValue({ id: "s-new" });
      await service.create("u-1", {
        title: "Java 入門",
        price: 1000,
        durationMinutes: 60,
      });
      const args = prismaMock.skillListing.create.mock.calls[0]![0];
      expect(args.data.title).toBe("Java 入門");
      expect(args.data.format).toBe("online");
      expect(args.data.providerUserId).toBe("u-1");
    });

    it("dto.format が指定されていればその値で作成する", async () => {
      prismaMock.skillListing.create.mockResolvedValue({ id: "s-new" });
      await service.create("u-1", {
        title: "対面相談",
        price: 2000,
        durationMinutes: 30,
        format: "offline",
      });
      const args = prismaMock.skillListing.create.mock.calls[0]![0];
      expect(args.data.format).toBe("offline");
    });
  });

  describe("update: スキル更新", () => {
    const listing = { id: "s-1", providerUserId: "u-owner", deletedAt: null };

    it("存在しない場合は NotFoundException", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(null);
      await expect(service.update("s-1", "u-owner", { title: "x" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("作成者本人なら更新できる", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(listing);
      prismaMock.skillListing.update.mockResolvedValue({ ...listing, title: "更新後" });
      await service.update("s-1", "u-owner", { title: "更新後" });
      expect(prismaMock.skillListing.update).toHaveBeenCalled();
    });

    it("admin / owner なら他人のスキルでも更新できる", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(listing);
      prismaMock.skillListing.update.mockResolvedValue(listing);
      prismaMock.user.findUnique.mockResolvedValue({ role: "owner" });
      await service.update("s-1", "u-admin", { title: "更新" });
      expect(prismaMock.skillListing.update).toHaveBeenCalled();
    });

    it("他人 (member) が更新しようとすると ForbiddenException", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(listing);
      prismaMock.user.findUnique.mockResolvedValue({ role: "member" });
      await expect(service.update("s-1", "u-other", { title: "x" })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("data の undefined フィールドは Prisma.update の data から除外される", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(listing);
      prismaMock.skillListing.update.mockResolvedValue(listing);
      await service.update("s-1", "u-owner", { title: "更新" });
      const args = prismaMock.skillListing.update.mock.calls[0]![0];
      expect(args.data).toEqual({ title: "更新" });
    });
  });

  describe("remove: スキル削除（論理削除）", () => {
    const listing = { id: "s-1", providerUserId: "u-owner", deletedAt: null };

    it("存在しない場合は NotFoundException", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(null);
      await expect(service.remove("s-1", "u-owner")).rejects.toThrow(NotFoundException);
    });

    it("作成者本人なら deletedAt を埋めて update する", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(listing);
      prismaMock.skillListing.update.mockResolvedValue(listing);
      await service.remove("s-1", "u-owner");
      const args = prismaMock.skillListing.update.mock.calls[0]![0];
      expect(args.data.deletedAt).toBeInstanceOf(Date);
    });

    it("他人 (member) が削除しようとすると ForbiddenException", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(listing);
      prismaMock.user.findUnique.mockResolvedValue({ role: "member" });
      await expect(service.remove("s-1", "u-other")).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // createBooking
  // ============================================================================
  describe("createBooking: 予約リクエスト", () => {
    const activeListing = {
      id: "s-1",
      providerUserId: "u-owner",
      status: "active",
      deletedAt: null,
      title: "Java 入門",
    };

    it("active でないスキルへの予約は NotFoundException", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue({ ...activeListing, status: "draft" });
      await expect(service.createBooking("s-1", "u-req", {})).rejects.toThrow(NotFoundException);
    });

    it("自分のスキルへの予約は BadRequestException", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(activeListing);
      await expect(service.createBooking("s-1", "u-owner", {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("成功時は予約作成・bookingCount のインクリメント・提供者への通知が呼ばれる", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(activeListing);
      prismaMock.skillBooking.create.mockResolvedValue({ id: "b-1" });
      prismaMock.skillListing.update.mockResolvedValue(activeListing);

      await service.createBooking("s-1", "u-req", { message: "お願いします" });

      expect(prismaMock.skillBooking.create).toHaveBeenCalled();
      const updateArgs = prismaMock.skillListing.update.mock.calls[0]![0];
      expect(updateArgs.data.bookingCount).toEqual({ increment: 1 });
      expect(notificationsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u-owner",
          type: "skill_booking_requested",
        }),
      );
    });
  });

  // ============================================================================
  // updateBookingStatus
  // ============================================================================
  describe("updateBookingStatus: 予約ステータス変更", () => {
    const booking = { id: "b-1", providerUserId: "u-owner", requesterUserId: "u-req" };

    it("予約が存在しなければ NotFoundException", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(null);
      await expect(service.updateBookingStatus("b-1", "u-owner", "approved")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("リクエスターが approved/rejected/completed を行うと ForbiddenException", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(booking);
      await expect(service.updateBookingStatus("b-1", "u-req", "approved")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("提供者は approved に変更でき、相手（リクエスター）に通知が飛ぶ", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(booking);
      prismaMock.skillBooking.update.mockResolvedValue({ ...booking, status: "approved" });

      await service.updateBookingStatus("b-1", "u-owner", "approved");

      expect(notificationsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u-req", type: "skill_booking_approved" }),
      );
    });

    it("リクエスターは canceled に変更可能", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(booking);
      prismaMock.skillBooking.update.mockResolvedValue({ ...booking, status: "canceled" });

      await service.updateBookingStatus("b-1", "u-req", "canceled");
      expect(prismaMock.skillBooking.update).toHaveBeenCalled();
      const args = prismaMock.skillBooking.update.mock.calls[0]![0];
      expect(args.data.canceledAt).toBeInstanceOf(Date);
    });

    it("admin は他人の予約の approved/rejected/completed を全て操作できる", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(booking);
      prismaMock.skillBooking.update.mockResolvedValue({ ...booking, status: "completed" });
      prismaMock.user.findUnique.mockResolvedValue({ role: "admin" });

      await service.updateBookingStatus("b-1", "u-admin", "completed");
      const args = prismaMock.skillBooking.update.mock.calls[0]![0];
      expect(args.data.completedAt).toBeInstanceOf(Date);
    });

    it("comment が指定されると skillMessage.create も呼ばれる", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(booking);
      prismaMock.skillBooking.update.mockResolvedValue(booking);

      await service.updateBookingStatus("b-1", "u-owner", "rejected", "都合により");

      expect(prismaMock.skillMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bookingId: "b-1", body: "都合により" }),
        }),
      );
    });

    it("comment が空白だけなら skillMessage.create は呼ばれない", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(booking);
      prismaMock.skillBooking.update.mockResolvedValue(booking);

      await service.updateBookingStatus("b-1", "u-owner", "rejected", "   ");
      expect(prismaMock.skillMessage.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // getMessages / sendMessage / findBooking / getBookings
  // ============================================================================
  describe("getBookings: 予約一覧取得", () => {
    it("一般ユーザーは自身が provider または requester の予約だけを取得する", async () => {
      prismaMock.skillBooking.findMany.mockResolvedValue([]);
      await service.getBookings("u-1");
      const args = prismaMock.skillBooking.findMany.mock.calls[0]![0];
      expect(args.where).toEqual({
        OR: [{ requesterUserId: "u-1" }, { providerUserId: "u-1" }],
      });
    });

    it("admin は全予約を取得する（where の絞り込みなし）", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ role: "admin" });
      prismaMock.skillBooking.findMany.mockResolvedValue([]);
      await service.getBookings("u-admin");
      const args = prismaMock.skillBooking.findMany.mock.calls[0]![0];
      expect(args.where).toEqual({});
    });
  });

  describe("findBooking: 予約詳細", () => {
    const booking = { id: "b-1", providerUserId: "u-owner", requesterUserId: "u-req" };

    it("提供者本人なら閲覧できる", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(booking);
      const result = await service.findBooking("b-1", "u-owner");
      expect(result.id).toBe("b-1");
    });

    it("無関係なユーザーは ForbiddenException", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(booking);
      await expect(service.findBooking("b-1", "u-stranger")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getMessages / sendMessage", () => {
    const booking = { id: "b-1", providerUserId: "u-owner", requesterUserId: "u-req" };

    it("getMessages: 無関係なユーザーは ForbiddenException", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(booking);
      await expect(service.getMessages("b-1", "u-stranger")).rejects.toThrow(ForbiddenException);
    });

    it("sendMessage: 関係者ならメッセージを作成し、相手に通知する", async () => {
      prismaMock.skillBooking.findUnique.mockResolvedValue(booking);
      prismaMock.skillMessage.create.mockResolvedValue({ id: "m-1" });

      await service.sendMessage("b-1", "u-owner", "おはよう");

      expect(prismaMock.skillMessage.create).toHaveBeenCalled();
      expect(notificationsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u-req", type: "skill_message" }),
      );
    });
  });

  // ============================================================================
  // Comments
  // ============================================================================
  describe("addComment / deleteComment", () => {
    const activeListing = {
      id: "s-1",
      providerUserId: "u-owner",
      status: "active",
      deletedAt: null,
    };

    it("addComment: active なスキルなら一般ユーザーでもコメントできる", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue(activeListing);
      prismaMock.skillComment.create.mockResolvedValue({ id: "c-1" });
      await service.addComment("s-1", "u-1", "質問です");
      expect(prismaMock.skillComment.create).toHaveBeenCalled();
    });

    it("addComment: active 以外のスキルへ一般ユーザーがコメントすると NotFoundException", async () => {
      prismaMock.skillListing.findUnique.mockResolvedValue({ ...activeListing, status: "draft" });
      await expect(service.addComment("s-1", "u-other", "x")).rejects.toThrow(NotFoundException);
    });

    it("deleteComment: コメント投稿者本人なら削除できる", async () => {
      prismaMock.skillComment.findUnique.mockResolvedValue({
        id: "c-1",
        authorUserId: "u-1",
        skillListing: { providerUserId: "u-owner" },
        deletedAt: null,
      });
      prismaMock.skillComment.update.mockResolvedValue(undefined);
      await service.deleteComment("c-1", "u-1");
      expect(prismaMock.skillComment.update).toHaveBeenCalled();
    });

    it("deleteComment: 出品者（providerUserId）もコメント削除できる", async () => {
      prismaMock.skillComment.findUnique.mockResolvedValue({
        id: "c-1",
        authorUserId: "u-1",
        skillListing: { providerUserId: "u-owner" },
        deletedAt: null,
      });
      prismaMock.skillComment.update.mockResolvedValue(undefined);
      await service.deleteComment("c-1", "u-owner");
      expect(prismaMock.skillComment.update).toHaveBeenCalled();
    });

    it("deleteComment: 無関係な一般ユーザーは ForbiddenException", async () => {
      prismaMock.skillComment.findUnique.mockResolvedValue({
        id: "c-1",
        authorUserId: "u-1",
        skillListing: { providerUserId: "u-owner" },
        deletedAt: null,
      });
      await expect(service.deleteComment("c-1", "u-stranger")).rejects.toThrow(ForbiddenException);
    });
  });
});
