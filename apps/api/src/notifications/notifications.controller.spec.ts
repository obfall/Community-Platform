import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { FeatureEnabledGuard } from "@/common/guards/feature-enabled.guard";

/**
 * NotificationsController のエンドポイント委譲テスト。
 *
 * FeatureEnabledGuard は override で bypass し、サービスへの引数受け渡しと
 * HTTP ステータス・DTO バリデーションのみを検証する。
 */
describe("NotificationsController", () => {
  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
  const TEST_NOTIFICATION_ID = "22222222-2222-4222-8222-222222222222";

  let app: INestApplication;
  let serviceMock: {
    findAll: jest.Mock;
    getUnreadCount: jest.Mock;
    getPreferences: jest.Mock;
    markAllAsRead: jest.Mock;
    markAsRead: jest.Mock;
    updatePreferences: jest.Mock;
  };

  beforeAll(async () => {
    serviceMock = {
      findAll: jest.fn().mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
      getUnreadCount: jest.fn().mockResolvedValue({ count: 0 }),
      getPreferences: jest.fn().mockResolvedValue([]),
      markAllAsRead: jest.fn().mockResolvedValue({ updatedCount: 0 }),
      markAsRead: jest
        .fn()
        .mockResolvedValue({ id: TEST_NOTIFICATION_ID, isRead: true, readAt: new Date() }),
      updatePreferences: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: serviceMock }],
    })
      .overrideGuard(FeatureEnabledGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    // CurrentUser("id") が拾えるよう req.user を注入
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user?: { id: string; role: string } }).user = {
        id: TEST_USER_ID,
        role: "member",
      };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    Object.values(serviceMock).forEach((m) => m.mockClear());
  });

  describe("GET /notifications: 通知一覧", () => {
    it("クエリ無しで service.findAll が userId, 空クエリで呼ばれる", async () => {
      const res = await request(app.getHttpServer()).get(`/notifications`);
      expect(res.status).toBe(200);
      expect(serviceMock.findAll).toHaveBeenCalledWith(TEST_USER_ID, expect.any(Object));
    });

    it("unreadOnly=true / page / limit が DTO 経由で渡る", async () => {
      const res = await request(app.getHttpServer()).get(
        `/notifications?unreadOnly=true&page=2&limit=10`,
      );
      expect(res.status).toBe(200);
      expect(serviceMock.findAll).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({ unreadOnly: true, page: 2, limit: 10 }),
      );
    });

    it("unreadOnly=false（文字列）は false として渡る（過去バグ再発防止）", async () => {
      const res = await request(app.getHttpServer()).get(`/notifications?unreadOnly=false`);
      expect(res.status).toBe(200);
      const call = serviceMock.findAll.mock.calls[0]![1] as { unreadOnly?: boolean };
      expect(call.unreadOnly).toBe(false);
    });

    it("type=a,b はカンマ区切りで配列化されて渡る", async () => {
      const res = await request(app.getHttpServer()).get(
        `/notifications?type=announcement,event_announcement`,
      );
      expect(res.status).toBe(200);
      expect(serviceMock.findAll).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({ type: ["announcement", "event_announcement"] }),
      );
    });

    it("limit が文字列で 0 だと 400（PaginationQueryDto の @Min(1)）", async () => {
      const res = await request(app.getHttpServer()).get(`/notifications?limit=0`);
      expect(res.status).toBe(400);
      expect(serviceMock.findAll).not.toHaveBeenCalled();
    });
  });

  describe("GET /notifications/unread-count: 未読数", () => {
    it("service.getUnreadCount が userId で呼ばれる", async () => {
      const res = await request(app.getHttpServer()).get(`/notifications/unread-count`);
      expect(res.status).toBe(200);
      expect(serviceMock.getUnreadCount).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  describe("GET /notifications/preferences: 通知設定一覧", () => {
    it("service.getPreferences が userId で呼ばれる", async () => {
      const res = await request(app.getHttpServer()).get(`/notifications/preferences`);
      expect(res.status).toBe(200);
      expect(serviceMock.getPreferences).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  describe("PATCH /notifications/read-all: 全既読化", () => {
    it("service.markAllAsRead が userId で呼ばれる", async () => {
      const res = await request(app.getHttpServer()).patch(`/notifications/read-all`);
      expect(res.status).toBe(200);
      expect(serviceMock.markAllAsRead).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  describe("PATCH /notifications/:id/read: 単一既読化", () => {
    it("service.markAsRead が userId, id で呼ばれる", async () => {
      const res = await request(app.getHttpServer()).patch(
        `/notifications/${TEST_NOTIFICATION_ID}/read`,
      );
      expect(res.status).toBe(200);
      expect(serviceMock.markAsRead).toHaveBeenCalledWith(TEST_USER_ID, TEST_NOTIFICATION_ID);
    });

    it("UUID 形式でない id は 400（ParseUUIDPipe）", async () => {
      const res = await request(app.getHttpServer()).patch(`/notifications/not-a-uuid/read`);
      expect(res.status).toBe(400);
      expect(serviceMock.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe("PUT /notifications/preferences: 通知設定の一括更新", () => {
    it("preferences 配列を service.updatePreferences に渡す", async () => {
      const dto = {
        preferences: [
          {
            notificationType: "board_comment",
            emailEnabled: true,
            inAppEnabled: true,
            lineEnabled: false,
          },
        ],
      };
      const res = await request(app.getHttpServer()).put(`/notifications/preferences`).send(dto);
      expect(res.status).toBe(200);
      expect(serviceMock.updatePreferences).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining(dto),
      );
    });

    it("preferences が配列でないと 400（@IsArray）", async () => {
      const res = await request(app.getHttpServer())
        .put(`/notifications/preferences`)
        .send({ preferences: "not-array" });
      expect(res.status).toBe(400);
      expect(serviceMock.updatePreferences).not.toHaveBeenCalled();
    });

    it("preferences が空配列でも 200（バリデーション上は許可）", async () => {
      const res = await request(app.getHttpServer())
        .put(`/notifications/preferences`)
        .send({ preferences: [] });
      expect(res.status).toBe(200);
      expect(serviceMock.updatePreferences).toHaveBeenCalledWith(TEST_USER_ID, {
        preferences: [],
      });
    });
  });
});
