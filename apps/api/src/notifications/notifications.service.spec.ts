import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  let prismaMock: {
    notification: { findMany: jest.Mock; count: jest.Mock };
  };
  let service: NotificationsService;

  beforeEach(() => {
    prismaMock = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new NotificationsService(prismaMock as never);
  });

  describe("findAll: 通知一覧の取得", () => {
    it("userId で絞り込む（必須条件）", async () => {
      await service.findAll("user-1", {});

      const args = prismaMock.notification.findMany.mock.calls[0][0];
      expect(args.where.userId).toBe("user-1");
    });

    it("unreadOnly: true で isRead: false が条件に入る", async () => {
      await service.findAll("user-1", { unreadOnly: true });

      const args = prismaMock.notification.findMany.mock.calls[0][0];
      expect(args.where.isRead).toBe(false);
    });

    it("unreadOnly: false または未指定では isRead は条件に入らない", async () => {
      await service.findAll("user-1", { unreadOnly: false });
      const args = prismaMock.notification.findMany.mock.calls[0][0];
      expect("isRead" in args.where).toBe(false);

      await service.findAll("user-1", {});
      const args2 = prismaMock.notification.findMany.mock.calls[1][0];
      expect("isRead" in args2.where).toBe(false);
    });

    it("type が配列なら type: { in: [...] } で絞り込む", async () => {
      await service.findAll("user-1", { type: ["announcement", "event_announcement"] });

      const args = prismaMock.notification.findMany.mock.calls[0][0];
      expect(args.where.type).toEqual({ in: ["announcement", "event_announcement"] });
    });

    it("type が空配列なら type 条件は入らない", async () => {
      await service.findAll("user-1", { type: [] });

      const args = prismaMock.notification.findMany.mock.calls[0][0];
      expect("type" in args.where).toBe(false);
    });

    it("createdAt 降順で取得する", async () => {
      await service.findAll("user-1", {});

      const args = prismaMock.notification.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual({ createdAt: "desc" });
    });

    it("page / limit のデフォルトは 1 / 20、ページネーション meta が返る", async () => {
      prismaMock.notification.count.mockResolvedValueOnce(45);

      const result = await service.findAll("user-1", {});

      expect(result.meta).toEqual({
        total: 45,
        page: 1,
        limit: 20,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      });

      const args = prismaMock.notification.findMany.mock.calls[0][0];
      expect(args.skip).toBe(0);
      expect(args.take).toBe(20);
    });

    it("page=2 では skip が (page-1)*limit、hasPreviousPage が true", async () => {
      prismaMock.notification.count.mockResolvedValueOnce(45);

      const result = await service.findAll("user-1", { page: 2, limit: 20 });

      const args = prismaMock.notification.findMany.mock.calls[0][0];
      expect(args.skip).toBe(20);
      expect(result.meta.hasPreviousPage).toBe(true);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it("actor.profile.avatarUrl を avatar 平坦化して返す", async () => {
      prismaMock.notification.findMany.mockResolvedValueOnce([
        {
          id: "n1",
          type: "announcement",
          title: "T",
          body: null,
          referenceType: null,
          referenceId: null,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
          actor: { id: "u1", name: "Taro", profile: { avatarUrl: "https://x/a.png" } },
        },
      ]);

      const result = await service.findAll("user-1", {});
      expect(result.data[0].actor).toEqual({
        id: "u1",
        name: "Taro",
        avatarUrl: "https://x/a.png",
      });
    });

    it("actor が null なら null のまま返す", async () => {
      prismaMock.notification.findMany.mockResolvedValueOnce([
        {
          id: "n1",
          type: "announcement",
          title: "T",
          body: null,
          referenceType: null,
          referenceId: null,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
          actor: null,
        },
      ]);

      const result = await service.findAll("user-1", {});
      expect(result.data[0].actor).toBeNull();
    });
  });
});
