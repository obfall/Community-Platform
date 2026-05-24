import { BusinessException } from "@/common/exceptions";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  let prismaMock: {
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    notificationPreference: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let service: NotificationsService;

  beforeEach(() => {
    prismaMock = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "n-1" }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest
          .fn()
          .mockResolvedValue({ id: "n-1", isRead: true, readAt: new Date("2026-01-01") }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      notificationPreference: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
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
      expect(result.data[0]!.actor).toEqual({
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
      expect(result.data[0]!.actor).toBeNull();
    });
  });

  describe("create: 通知作成", () => {
    it("prisma.notification.create に data がそのまま渡る", async () => {
      const data = {
        userId: "user-1",
        type: "announcement",
        title: "新着のお知らせ",
        body: "本文",
        referenceType: "broadcast",
        referenceId: "ref-1",
        actorUserId: "actor-1",
      };

      await service.create(data);

      expect(prismaMock.notification.create).toHaveBeenCalledWith({ data });
    });
  });

  describe("createMany: 通知一括作成", () => {
    it("prisma.notification.createMany に data 配列がそのまま渡る", async () => {
      const items = [
        { userId: "user-1", type: "announcement", title: "1件目" },
        { userId: "user-2", type: "announcement", title: "2件目" },
      ];

      await service.createMany(items);

      expect(prismaMock.notification.createMany).toHaveBeenCalledWith({ data: items });
    });
  });

  describe("getUnreadCount: 未読数取得", () => {
    it("userId + isRead: false で count し、{ count } 形式で返す", async () => {
      prismaMock.notification.count.mockResolvedValueOnce(7);

      const result = await service.getUnreadCount("user-1");

      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId: "user-1", isRead: false },
      });
      expect(result).toEqual({ count: 7 });
    });
  });

  describe("markAsRead: 通知の既読化", () => {
    it("自分の通知なら isRead: true / readAt を更新して返す", async () => {
      prismaMock.notification.findUnique.mockResolvedValueOnce({
        id: "n-1",
        userId: "user-1",
      });

      const result = await service.markAsRead("user-1", "n-1");

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: "n-1" },
        data: expect.objectContaining({ isRead: true, readAt: expect.any(Date) }),
        select: { id: true, isRead: true, readAt: true },
      });
      expect(result.isRead).toBe(true);
    });

    it("該当通知が存在しない場合は BusinessException(NOT_FOUND) を投げる", async () => {
      prismaMock.notification.findUnique.mockResolvedValueOnce(null);

      await expect(service.markAsRead("user-1", "n-missing")).rejects.toBeInstanceOf(
        BusinessException,
      );
      expect(prismaMock.notification.update).not.toHaveBeenCalled();
    });

    it("他ユーザーの通知に対しては BusinessException(NOT_FOUND) を投げる（情報漏洩防止）", async () => {
      prismaMock.notification.findUnique.mockResolvedValueOnce({
        id: "n-1",
        userId: "other-user",
      });

      await expect(service.markAsRead("user-1", "n-1")).rejects.toBeInstanceOf(BusinessException);
      expect(prismaMock.notification.update).not.toHaveBeenCalled();
    });
  });

  describe("markAllAsRead: 全通知の既読化", () => {
    it("自ユーザーの未読のみを一括更新し、件数を返す", async () => {
      prismaMock.notification.updateMany.mockResolvedValueOnce({ count: 5 });

      const result = await service.markAllAsRead("user-1");

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", isRead: false },
        data: expect.objectContaining({ isRead: true, readAt: expect.any(Date) }),
      });
      expect(result).toEqual({ updatedCount: 5 });
    });
  });

  describe("getPreferences: 通知設定一覧の取得", () => {
    it("userId で絞り込み、設定項目を返す", async () => {
      const prefs = [
        {
          id: "p-1",
          notificationType: "board_comment",
          emailEnabled: true,
          inAppEnabled: true,
          lineEnabled: false,
        },
      ];
      prismaMock.notificationPreference.findMany.mockResolvedValueOnce(prefs);

      const result = await service.getPreferences("user-1");

      expect(prismaMock.notificationPreference.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        select: {
          id: true,
          notificationType: true,
          emailEnabled: true,
          inAppEnabled: true,
          lineEnabled: true,
        },
      });
      expect(result).toEqual(prefs);
    });
  });

  describe("updatePreferences: 通知設定の一括更新", () => {
    it("各 preference を upsert（複合ユニーク keys）で更新し、配列で返す", async () => {
      const dto = {
        preferences: [
          {
            notificationType: "board_comment",
            emailEnabled: true,
            inAppEnabled: false,
            lineEnabled: false,
          },
          {
            notificationType: "announcement",
            emailEnabled: false,
            inAppEnabled: true,
            lineEnabled: true,
          },
        ],
      };
      prismaMock.notificationPreference.upsert
        .mockResolvedValueOnce({ id: "p-1", ...dto.preferences[0] })
        .mockResolvedValueOnce({ id: "p-2", ...dto.preferences[1] });

      const result = await service.updatePreferences("user-1", dto);

      expect(prismaMock.notificationPreference.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.notificationPreference.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: {
            userId_notificationType: {
              userId: "user-1",
              notificationType: "board_comment",
            },
          },
        }),
      );
      expect(result).toHaveLength(2);
    });
  });
});
