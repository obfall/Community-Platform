import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { VenuesController } from "./venues.controller";
import { VenuesService } from "./venues.service";
import { FeatureEnabledGuard, RolesGuard } from "@/common/guards";

/**
 * VenuesController のエンドポイント委譲テスト。
 *
 * FeatureEnabledGuard / RolesGuard は override で bypass し、サービスへの引数受け渡しと
 * HTTP ステータス・DTO バリデーションのみを検証する。
 */
describe("VenuesController", () => {
  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
  const TEST_VENUE_ID = "22222222-2222-4222-8222-222222222222";
  const TEST_SPACE_ID = "33333333-3333-4333-8333-333333333333";
  const TEST_RESERVATION_ID = "44444444-4444-4444-8444-444444444444";

  let app: INestApplication;
  let serviceMock: {
    findAllVenues: jest.Mock;
    findOneVenue: jest.Mock;
    createVenue: jest.Mock;
    updateVenue: jest.Mock;
    removeVenue: jest.Mock;
    createSpace: jest.Mock;
    getReservations: jest.Mock;
    getVenueReservations: jest.Mock;
    createReservation: jest.Mock;
    cancelReservation: jest.Mock;
  };

  beforeAll(async () => {
    serviceMock = {
      findAllVenues: jest.fn().mockResolvedValue([]),
      findOneVenue: jest.fn().mockResolvedValue({ id: TEST_VENUE_ID }),
      createVenue: jest.fn().mockResolvedValue({ id: TEST_VENUE_ID }),
      updateVenue: jest.fn().mockResolvedValue({ id: TEST_VENUE_ID }),
      removeVenue: jest.fn().mockResolvedValue(undefined),
      createSpace: jest.fn().mockResolvedValue({ id: TEST_SPACE_ID }),
      getReservations: jest.fn().mockResolvedValue([]),
      getVenueReservations: jest.fn().mockResolvedValue([]),
      createReservation: jest.fn().mockResolvedValue({ id: TEST_RESERVATION_ID }),
      cancelReservation: jest.fn().mockResolvedValue({ id: TEST_RESERVATION_ID }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [VenuesController],
      providers: [{ provide: VenuesService, useValue: serviceMock }],
    })
      .overrideGuard(FeatureEnabledGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
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

  describe("施設 CRUD", () => {
    it("GET /venues は service.findAllVenues をクエリで呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(`/venues?publishStatus=draft`);
      expect(res.status).toBe(200);
      expect(serviceMock.findAllVenues).toHaveBeenCalledWith(
        expect.objectContaining({ publishStatus: "draft" }),
      );
    });

    it("GET /venues は search を service に渡す", async () => {
      const res = await request(app.getHttpServer()).get(
        `/venues?search=${encodeURIComponent("会議室")}`,
      );
      expect(res.status).toBe(200);
      expect(serviceMock.findAllVenues).toHaveBeenCalledWith(
        expect.objectContaining({ search: "会議室" }),
      );
    });

    it("GET /venues/:id は service.findOneVenue を id で呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(`/venues/${TEST_VENUE_ID}`);
      expect(res.status).toBe(200);
      expect(serviceMock.findOneVenue).toHaveBeenCalledWith(TEST_VENUE_ID);
    });

    it("GET /venues/:id は UUID 形式でない値で 400", async () => {
      const res = await request(app.getHttpServer()).get(`/venues/not-a-uuid`);
      expect(res.status).toBe(400);
      expect(serviceMock.findOneVenue).not.toHaveBeenCalled();
    });

    it("POST /venues は service.createVenue を userId と dto で呼ぶ", async () => {
      const dto = { name: "新規会場", capacity: 30 };
      const res = await request(app.getHttpServer()).post(`/venues`).send(dto);
      expect(res.status).toBe(201);
      expect(serviceMock.createVenue).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining(dto),
      );
    });

    it("POST /venues は name が無いと 400（DTO バリデーション）", async () => {
      const res = await request(app.getHttpServer()).post(`/venues`).send({ capacity: 10 });
      expect(res.status).toBe(400);
      expect(serviceMock.createVenue).not.toHaveBeenCalled();
    });

    it("POST /venues は capacity が 0 で 400（@Min(1)）", async () => {
      const res = await request(app.getHttpServer())
        .post(`/venues`)
        .send({ name: "x", capacity: 0 });
      expect(res.status).toBe(400);
    });

    it("PATCH /venues/:id は service.updateVenue を id と data で呼ぶ", async () => {
      const data = { name: "更新後" };
      const res = await request(app.getHttpServer()).patch(`/venues/${TEST_VENUE_ID}`).send(data);
      expect(res.status).toBe(200);
      expect(serviceMock.updateVenue).toHaveBeenCalledWith(
        TEST_VENUE_ID,
        expect.objectContaining(data),
      );
    });

    it("DELETE /venues/:id は 204 で service.removeVenue を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).delete(`/venues/${TEST_VENUE_ID}`);
      expect(res.status).toBe(204);
      expect(serviceMock.removeVenue).toHaveBeenCalledWith(TEST_VENUE_ID);
    });
  });

  describe("スペース", () => {
    it("POST /venues/:id/spaces は service.createSpace を venueId, dto で呼ぶ", async () => {
      const dto = { name: "会議室A", capacity: 10 };
      const res = await request(app.getHttpServer())
        .post(`/venues/${TEST_VENUE_ID}/spaces`)
        .send(dto);
      expect(res.status).toBe(201);
      expect(serviceMock.createSpace).toHaveBeenCalledWith(
        TEST_VENUE_ID,
        expect.objectContaining(dto),
      );
    });

    it("POST /venues/:id/spaces は name が無いと 400", async () => {
      const res = await request(app.getHttpServer())
        .post(`/venues/${TEST_VENUE_ID}/spaces`)
        .send({ capacity: 5 });
      expect(res.status).toBe(400);
      expect(serviceMock.createSpace).not.toHaveBeenCalled();
    });
  });

  describe("予約", () => {
    it("GET /venues/spaces/:spaceId/reservations は service.getReservations を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(
        `/venues/spaces/${TEST_SPACE_ID}/reservations`,
      );
      expect(res.status).toBe(200);
      expect(serviceMock.getReservations).toHaveBeenCalledWith(TEST_SPACE_ID);
    });

    it("GET /venues/:id/reservations は service.getVenueReservations を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(`/venues/${TEST_VENUE_ID}/reservations`);
      expect(res.status).toBe(200);
      expect(serviceMock.getVenueReservations).toHaveBeenCalledWith(TEST_VENUE_ID);
    });

    it("POST /venues/spaces/:spaceId/reservations は service.createReservation を呼ぶ", async () => {
      const dto = {
        title: "打ち合わせ",
        startAt: "2026-06-01T10:00:00.000Z",
        endAt: "2026-06-01T11:00:00.000Z",
      };
      const res = await request(app.getHttpServer())
        .post(`/venues/spaces/${TEST_SPACE_ID}/reservations`)
        .send(dto);
      expect(res.status).toBe(201);
      expect(serviceMock.createReservation).toHaveBeenCalledWith(
        TEST_SPACE_ID,
        TEST_USER_ID,
        expect.objectContaining(dto),
      );
    });

    it("POST /venues/spaces/:spaceId/reservations は startAt が不正な日付文字列で 400（@IsDateString）", async () => {
      const res = await request(app.getHttpServer())
        .post(`/venues/spaces/${TEST_SPACE_ID}/reservations`)
        .send({ startAt: "not-a-date", endAt: "2026-06-01T11:00:00.000Z" });
      expect(res.status).toBe(400);
      expect(serviceMock.createReservation).not.toHaveBeenCalled();
    });

    it("PATCH /venues/reservations/:reservationId/cancel は service.cancelReservation を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).patch(
        `/venues/reservations/${TEST_RESERVATION_ID}/cancel`,
      );
      expect(res.status).toBe(200);
      expect(serviceMock.cancelReservation).toHaveBeenCalledWith(TEST_RESERVATION_ID, TEST_USER_ID);
    });
  });
});
