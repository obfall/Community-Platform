import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { SkillsController } from "./skills.controller";
import { SkillsService } from "./skills.service";
import { FeatureEnabledGuard } from "@/common/guards";

/**
 * SkillsController のエンドポイント委譲テスト。
 *
 * FeatureEnabledGuard は override で bypass し、サービスへの引数受け渡しと
 * HTTP ステータス・DTO バリデーションのみを検証する。
 */
describe("SkillsController", () => {
  // UUID v4 形式
  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
  const TEST_SKILL_ID = "22222222-2222-4222-8222-222222222222";
  const TEST_BOOKING_ID = "33333333-3333-4333-8333-333333333333";
  const TEST_COMMENT_ID = "44444444-4444-4444-8444-444444444444";

  let app: INestApplication;
  let serviceMock: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    createBooking: jest.Mock;
    getBookings: jest.Mock;
    findBooking: jest.Mock;
    updateBookingStatus: jest.Mock;
    getMessages: jest.Mock;
    sendMessage: jest.Mock;
    getComments: jest.Mock;
    addComment: jest.Mock;
    deleteComment: jest.Mock;
  };

  beforeAll(async () => {
    serviceMock = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({ id: TEST_SKILL_ID }),
      create: jest.fn().mockResolvedValue({ id: TEST_SKILL_ID }),
      update: jest.fn().mockResolvedValue({ id: TEST_SKILL_ID }),
      remove: jest.fn().mockResolvedValue(undefined),
      createBooking: jest.fn().mockResolvedValue({ id: TEST_BOOKING_ID }),
      getBookings: jest.fn().mockResolvedValue([]),
      findBooking: jest.fn().mockResolvedValue({ id: TEST_BOOKING_ID }),
      updateBookingStatus: jest.fn().mockResolvedValue({ id: TEST_BOOKING_ID }),
      getMessages: jest.fn().mockResolvedValue([]),
      sendMessage: jest.fn().mockResolvedValue({ id: "m-1" }),
      getComments: jest.fn().mockResolvedValue([]),
      addComment: jest.fn().mockResolvedValue({ id: TEST_COMMENT_ID }),
      deleteComment: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SkillsController],
      providers: [{ provide: SkillsService, useValue: serviceMock }],
    })
      .overrideGuard(FeatureEnabledGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    // CurrentUser("id") が拾えるよう req.user を注入
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user?: { id: string; role: string } }).user = {
        id: TEST_USER_ID,
        role: "admin",
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

  describe("スキル出品 (CRUD)", () => {
    it("GET /skills は service.findAll をクエリと userId で呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(`/skills?format=online`);
      expect(res.status).toBe(200);
      expect(serviceMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ format: "online" }),
        TEST_USER_ID,
      );
    });

    it("GET /skills/:id は service.findOne を id, userId で呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(`/skills/${TEST_SKILL_ID}`);
      expect(res.status).toBe(200);
      expect(serviceMock.findOne).toHaveBeenCalledWith(TEST_SKILL_ID, TEST_USER_ID);
    });

    it("POST /skills は service.create を userId と dto で呼ぶ", async () => {
      const dto = { title: "新規", price: 1000, durationMinutes: 60 };
      const res = await request(app.getHttpServer()).post(`/skills`).send(dto);
      expect(res.status).toBe(201);
      expect(serviceMock.create).toHaveBeenCalledWith(TEST_USER_ID, expect.objectContaining(dto));
    });

    it("POST /skills は price 負数で 400（DTO バリデーション）", async () => {
      const res = await request(app.getHttpServer())
        .post(`/skills`)
        .send({ title: "x", price: -1, durationMinutes: 60 });
      expect(res.status).toBe(400);
      expect(serviceMock.create).not.toHaveBeenCalled();
    });

    it("POST /skills は durationMinutes が 0 で 400（@Min(1)）", async () => {
      const res = await request(app.getHttpServer())
        .post(`/skills`)
        .send({ title: "x", price: 1000, durationMinutes: 0 });
      expect(res.status).toBe(400);
    });

    it("PATCH /skills/:id は service.update を id, userId, data で呼ぶ", async () => {
      const data = { title: "更新", price: 2000 };
      const res = await request(app.getHttpServer()).patch(`/skills/${TEST_SKILL_ID}`).send(data);
      expect(res.status).toBe(200);
      expect(serviceMock.update).toHaveBeenCalledWith(
        TEST_SKILL_ID,
        TEST_USER_ID,
        expect.objectContaining(data),
      );
    });

    it("DELETE /skills/:id は 204 で service.remove を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).delete(`/skills/${TEST_SKILL_ID}`);
      expect(res.status).toBe(204);
      expect(serviceMock.remove).toHaveBeenCalledWith(TEST_SKILL_ID, TEST_USER_ID);
    });

    it("GET /skills/:id に UUID 形式でない値を渡すと 400", async () => {
      const res = await request(app.getHttpServer()).get(`/skills/not-a-uuid`);
      expect(res.status).toBe(400);
      expect(serviceMock.findOne).not.toHaveBeenCalled();
    });
  });

  describe("予約 (Bookings)", () => {
    it("GET /skills/bookings は service.getBookings を userId で呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(`/skills/bookings`);
      expect(res.status).toBe(200);
      expect(serviceMock.getBookings).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it("GET /skills/bookings/:bookingId は service.findBooking を bookingId, userId で呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(`/skills/bookings/${TEST_BOOKING_ID}`);
      expect(res.status).toBe(200);
      expect(serviceMock.findBooking).toHaveBeenCalledWith(TEST_BOOKING_ID, TEST_USER_ID);
    });

    it("POST /skills/:id/bookings は service.createBooking を listingId, userId, dto で呼ぶ", async () => {
      const dto = { message: "お願いします", scheduledAt: "2026-06-01T10:00:00Z" };
      const res = await request(app.getHttpServer())
        .post(`/skills/${TEST_SKILL_ID}/bookings`)
        .send(dto);
      expect(res.status).toBe(201);
      expect(serviceMock.createBooking).toHaveBeenCalledWith(
        TEST_SKILL_ID,
        TEST_USER_ID,
        expect.objectContaining(dto),
      );
    });

    it("PATCH /skills/bookings/:bookingId/status は status / comment を渡す", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/skills/bookings/${TEST_BOOKING_ID}/status`)
        .send({ status: "approved", comment: "OK" });
      expect(res.status).toBe(200);
      expect(serviceMock.updateBookingStatus).toHaveBeenCalledWith(
        TEST_BOOKING_ID,
        TEST_USER_ID,
        "approved",
        "OK",
      );
    });

    it("PATCH /skills/bookings/:bookingId/status は不正な status で 400（@IsIn）", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/skills/bookings/${TEST_BOOKING_ID}/status`)
        .send({ status: "invalid_status" });
      expect(res.status).toBe(400);
      expect(serviceMock.updateBookingStatus).not.toHaveBeenCalled();
    });
  });

  describe("取引メッセージ (Messages)", () => {
    it("GET /skills/bookings/:bookingId/messages は service.getMessages を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(
        `/skills/bookings/${TEST_BOOKING_ID}/messages`,
      );
      expect(res.status).toBe(200);
      expect(serviceMock.getMessages).toHaveBeenCalledWith(TEST_BOOKING_ID, TEST_USER_ID);
    });

    it("POST /skills/bookings/:bookingId/messages は body を渡す", async () => {
      const res = await request(app.getHttpServer())
        .post(`/skills/bookings/${TEST_BOOKING_ID}/messages`)
        .send({ body: "こんにちは" });
      expect(res.status).toBe(201);
      expect(serviceMock.sendMessage).toHaveBeenCalledWith(
        TEST_BOOKING_ID,
        TEST_USER_ID,
        "こんにちは",
      );
    });
  });

  describe("コメント (Comments)", () => {
    it("GET /skills/:id/comments は service.getComments を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(`/skills/${TEST_SKILL_ID}/comments`);
      expect(res.status).toBe(200);
      expect(serviceMock.getComments).toHaveBeenCalledWith(TEST_SKILL_ID);
    });

    it("POST /skills/:id/comments は body を渡す", async () => {
      const res = await request(app.getHttpServer())
        .post(`/skills/${TEST_SKILL_ID}/comments`)
        .send({ body: "質問です" });
      expect(res.status).toBe(201);
      expect(serviceMock.addComment).toHaveBeenCalledWith(TEST_SKILL_ID, TEST_USER_ID, "質問です");
    });

    it("DELETE /skills/comments/:commentId は 204 で service.deleteComment を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).delete(`/skills/comments/${TEST_COMMENT_ID}`);
      expect(res.status).toBe(204);
      expect(serviceMock.deleteComment).toHaveBeenCalledWith(TEST_COMMENT_ID, TEST_USER_ID);
    });
  });
});
