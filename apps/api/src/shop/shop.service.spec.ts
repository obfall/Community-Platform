import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ShopService } from "./shop.service";

describe("ShopService", () => {
  let prismaMock: {
    product: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    order: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      groupBy: jest.Mock;
      aggregate: jest.Mock;
    };
    user: { findUnique: jest.Mock };
    permissionSetting: { findMany: jest.Mock; findUnique: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let notificationsMock: { create: jest.Mock };
  let cacheMock: { getOrSet: jest.Mock; invalidate: jest.Mock };
  let service: ShopService;

  beforeEach(() => {
    prismaMock = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      order: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: "order-1", items: [] }),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ name: "買い手太郎" }) },
      permissionSetting: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(),
    };
    notificationsMock = { create: jest.fn().mockResolvedValue(undefined) };
    cacheMock = { getOrSet: jest.fn(), invalidate: jest.fn() };
    service = new ShopService(prismaMock as never, notificationsMock as never, cacheMock as never);
  });

  describe("findAllProducts: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAllProducts({});
      expect(prismaMock.product.findMany).toHaveBeenCalled();
      expect(prismaMock.product.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAllProducts({ search: "商品" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら通常一覧経路", async () => {
      await service.findAllProducts({ search: "+()[]" });
      expect(prismaMock.product.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("getShopCapabilities: ロール別の出品・管理可否", () => {
    it("owner はデフォルト権限で商品作成・全体管理が可能", async () => {
      prismaMock.permissionSetting.findMany.mockResolvedValue([]);
      const caps = await service.getShopCapabilities("owner");
      expect(caps).toEqual({ canCreateProduct: true, canManageAllProducts: true });
    });

    it("member はデフォルト権限で商品作成は可能だが全体管理はできない", async () => {
      prismaMock.permissionSetting.findMany.mockResolvedValue([]);
      const caps = await service.getShopCapabilities("member");
      expect(caps).toEqual({ canCreateProduct: true, canManageAllProducts: false });
    });

    it("DB のカスタム権限設定を尊重する（member の作成権限を剥奪し owner/admin のみに）", async () => {
      prismaMock.permissionSetting.findMany.mockResolvedValue([
        { action: "create_product", allowedRoles: ["owner", "admin"] },
      ]);
      const caps = await service.getShopCapabilities("member");
      expect(caps.canCreateProduct).toBe(false);
      expect(caps.canManageAllProducts).toBe(false);
    });
  });

  describe("createOrder: 販売期間バリデーションと金額計算", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

    it("販売開始前の商品は注文できない（BadRequestException）", async () => {
      prismaMock.product.findMany.mockResolvedValue([
        {
          id: "p1",
          name: "未来商品",
          price: 1000,
          sellerUserId: "s1",
          saleStartAt: future,
          saleEndAt: null,
        },
      ]);
      await expect(
        service.createOrder("buyer-1", { items: [{ productId: "p1", quantity: 1 }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });

    it("販売終了済みの商品は注文できない（BadRequestException）", async () => {
      prismaMock.product.findMany.mockResolvedValue([
        {
          id: "p1",
          name: "終了商品",
          price: 1000,
          sellerUserId: "s1",
          saleStartAt: null,
          saleEndAt: past,
        },
      ]);
      await expect(
        service.createOrder("buyer-1", { items: [{ productId: "p1", quantity: 1 }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("正常時は totalAmount を 単価×数量 で計算して order.create に渡す", async () => {
      prismaMock.product.findMany.mockResolvedValue([
        {
          id: "p1",
          name: "通常商品",
          price: 1000,
          sellerUserId: "s1",
          saleStartAt: null,
          saleEndAt: null,
        },
      ]);
      await service.createOrder("buyer-1", { items: [{ productId: "p1", quantity: 3 }] });
      const arg = prismaMock.order.create.mock.calls[0][0];
      expect(arg.data.totalAmount).toBe(3000);
      expect(arg.data.buyerUserId).toBe("buyer-1");
      expect(arg.data.sellerUserId).toBe("s1");
    });

    it("注文成立後に販売者へ購入申込通知を送る", async () => {
      prismaMock.product.findMany.mockResolvedValue([
        {
          id: "p1",
          name: "通常商品",
          price: 1000,
          sellerUserId: "s1",
          saleStartAt: null,
          saleEndAt: null,
        },
      ]);
      await service.createOrder("buyer-1", { items: [{ productId: "p1", quantity: 1 }] });
      expect(notificationsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "s1", type: "shop_order_requested" }),
      );
    });

    it("通知が失敗しても注文自体は成立する", async () => {
      prismaMock.product.findMany.mockResolvedValue([
        {
          id: "p1",
          name: "通常商品",
          price: 1000,
          sellerUserId: "s1",
          saleStartAt: null,
          saleEndAt: null,
        },
      ]);
      notificationsMock.create.mockRejectedValue(new Error("通知エラー"));
      const order = await service.createOrder("buyer-1", {
        items: [{ productId: "p1", quantity: 1 }],
      });
      expect(order).toEqual({ id: "order-1", items: [] });
    });
  });

  describe("updateOrderStatus: 権限と遷移ルール", () => {
    function mockTransaction(updated: unknown) {
      prismaMock.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
        cb({
          order: { update: jest.fn().mockResolvedValue(updated) },
          product: { update: jest.fn().mockResolvedValue({}) },
        }),
      );
    }

    it("販売者は in_progress → in_negotiation に遷移できる", async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: "o1",
        status: "in_progress",
        buyerUserId: "b1",
        sellerUserId: "s1",
        items: [],
      });
      mockTransaction({ id: "o1", status: "in_negotiation" });
      const result = await service.updateOrderStatus("o1", "s1", "member", "in_negotiation");
      expect(result).toEqual({ id: "o1", status: "in_negotiation" });
    });

    it("無関係なユーザーはステータスを変更できない（ForbiddenException）", async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: "o1",
        status: "in_progress",
        buyerUserId: "b1",
        sellerUserId: "s1",
        items: [],
      });
      await expect(
        service.updateOrderStatus("o1", "stranger", "member", "in_negotiation"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("許可されていない遷移は BadRequestException（completed からは遷移不可）", async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: "o1",
        status: "completed",
        buyerUserId: "b1",
        sellerUserId: "s1",
        items: [],
      });
      await expect(
        service.updateOrderStatus("o1", "s1", "member", "in_progress"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("買い手は in_progress の注文をキャンセルできる", async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: "o1",
        status: "in_progress",
        buyerUserId: "b1",
        sellerUserId: "s1",
        items: [],
      });
      mockTransaction({ id: "o1", status: "canceled" });
      const result = await service.updateOrderStatus("o1", "b1", "member", "canceled");
      expect(result).toEqual({ id: "o1", status: "canceled" });
    });

    it("買い手は in_negotiation の注文はキャンセルできない（ForbiddenException）", async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: "o1",
        status: "in_negotiation",
        buyerUserId: "b1",
        sellerUserId: "s1",
        items: [],
      });
      await expect(
        service.updateOrderStatus("o1", "b1", "member", "canceled"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    describe("ステータス変更時の通知", () => {
      const fullUpdated = (status: string) => ({
        id: "o1",
        status,
        buyer: { id: "b1", name: "買い手太郎" },
        seller: { id: "s1", name: "販売者花子" },
        items: [{ productName: "商品X" }],
      });

      it("販売者が取引を開始すると買い手に shop_order_negotiating が送られる", async () => {
        prismaMock.order.findUnique.mockResolvedValue({
          id: "o1",
          status: "in_progress",
          buyerUserId: "b1",
          sellerUserId: "s1",
          items: [],
        });
        mockTransaction(fullUpdated("in_negotiation"));

        await service.updateOrderStatus("o1", "s1", "member", "in_negotiation");

        expect(notificationsMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "b1",
            type: "shop_order_negotiating",
            referenceType: "shop_order",
            referenceId: "o1",
            actorUserId: "s1",
          }),
        );
      });

      it("買い手がキャンセルすると販売者に shop_order_canceled が送られる", async () => {
        prismaMock.order.findUnique.mockResolvedValue({
          id: "o1",
          status: "in_progress",
          buyerUserId: "b1",
          sellerUserId: "s1",
          items: [],
        });
        mockTransaction(fullUpdated("canceled"));

        await service.updateOrderStatus("o1", "b1", "member", "canceled");

        expect(notificationsMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "s1",
            type: "shop_order_canceled",
            actorUserId: "b1",
          }),
        );
      });

      it("販売者が取引を完了すると買い手に shop_order_completed が送られる", async () => {
        prismaMock.order.findUnique.mockResolvedValue({
          id: "o1",
          status: "in_negotiation",
          buyerUserId: "b1",
          sellerUserId: "s1",
          items: [],
        });
        mockTransaction(fullUpdated("completed"));

        await service.updateOrderStatus("o1", "s1", "member", "completed");

        expect(notificationsMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "b1",
            type: "shop_order_completed",
          }),
        );
      });

      it("通知に失敗してもステータス更新は成功する", async () => {
        prismaMock.order.findUnique.mockResolvedValue({
          id: "o1",
          status: "in_progress",
          buyerUserId: "b1",
          sellerUserId: "s1",
          items: [],
        });
        mockTransaction(fullUpdated("in_negotiation"));
        notificationsMock.create.mockRejectedValue(new Error("通知エラー"));

        const result = await service.updateOrderStatus("o1", "s1", "member", "in_negotiation");
        expect(result.status).toBe("in_negotiation");
      });
    });
  });

  describe("updateProduct / removeProduct: 所有者・管理権限チェック", () => {
    it("出品者でも管理権限でもないユーザーは編集できない（ForbiddenException）", async () => {
      prismaMock.product.findUnique.mockResolvedValue({ sellerUserId: "owner-1", deletedAt: null });
      await expect(
        service.updateProduct("intruder", "member", "p1", { name: "改ざん" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("出品者本人は自分の商品を編集できる", async () => {
      prismaMock.product.findUnique.mockResolvedValue({ sellerUserId: "owner-1", deletedAt: null });
      await service.updateProduct("owner-1", "member", "p1", { name: "修正後" });
      expect(prismaMock.product.update).toHaveBeenCalled();
    });

    it("出品者でも管理権限でもないユーザーは削除できない（ForbiddenException）", async () => {
      prismaMock.product.findUnique.mockResolvedValue({ sellerUserId: "owner-1", deletedAt: null });
      await expect(service.removeProduct("intruder", "member", "p1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe("getAllOrders: 全注文（システム全体）", () => {
    it("status 未指定なら where は undefined（全件取得）", async () => {
      await service.getAllOrders();
      const arg = prismaMock.order.findMany.mock.calls[0][0];
      expect(arg.where).toBeUndefined();
    });

    it("status 指定でその status に絞り込まれる", async () => {
      await service.getAllOrders("completed");
      const arg = prismaMock.order.findMany.mock.calls[0][0];
      expect(arg.where).toEqual({ status: "completed" });
    });
  });

  describe("getSystemSummary: システム全体の売上サマリー", () => {
    it("売上合計は completed のみを集計し、件数はステータス別に展開される", async () => {
      prismaMock.order.groupBy.mockResolvedValue([
        { status: "in_progress", _count: { _all: 2 } },
        { status: "completed", _count: { _all: 5 } },
        { status: "canceled", _count: { _all: 1 } },
      ]);
      prismaMock.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 12345 } });

      const summary = await service.getSystemSummary();
      expect(summary).toEqual({
        totalRevenue: 12345,
        orderCount: 8,
        inProgressCount: 2,
        inNegotiationCount: 0,
        completedCount: 5,
        canceledCount: 1,
      });
      // aggregate は completed のみ
      const aggArg = prismaMock.order.aggregate.mock.calls[0][0];
      expect(aggArg.where).toEqual(expect.objectContaining({ status: "completed" }));
    });
  });
});
