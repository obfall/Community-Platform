// ApplicationFormController → ApplicationFormService → EventsService → @nestjs/bullmq の連鎖を
// 切るためのモック。bullmq は ESM の uuid に依存しており jest が転ぶ。
jest.mock("@nestjs/bullmq", () => ({
  InjectQueue: () => () => undefined,
}));

import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { ApplicationFormController } from "./application-form.controller";
import { ApplicationFormService } from "./application-form.service";
import { FeatureEnabledGuard, RolesGuard } from "@/common/guards";

describe("ApplicationFormController", () => {
  let app: INestApplication;
  let serviceMock: {
    getForm: jest.Mock;
    getFormPublic: jest.Mock;
    upsertConfig: jest.Mock;
    createQuestion: jest.Mock;
    updateQuestion: jest.Mock;
    deleteQuestion: jest.Mock;
    reorderQuestions: jest.Mock;
  };

  const EVENT_ID = "11111111-1111-4111-8111-111111111111";
  const QUESTION_ID = "22222222-2222-4222-8222-222222222222";
  const USER_ID = "33333333-3333-4333-8333-333333333333";
  const BASE = `/events/${EVENT_ID}/application-form`;

  beforeAll(async () => {
    serviceMock = {
      getForm: jest.fn().mockResolvedValue({ config: null, questions: [] }),
      getFormPublic: jest.fn().mockResolvedValue({ config: {}, questions: [] }),
      upsertConfig: jest.fn().mockResolvedValue({ eventId: EVENT_ID }),
      createQuestion: jest.fn().mockResolvedValue({ id: QUESTION_ID }),
      updateQuestion: jest.fn().mockResolvedValue({ id: QUESTION_ID }),
      deleteQuestion: jest.fn().mockResolvedValue(undefined),
      reorderQuestions: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ApplicationFormController],
      providers: [{ provide: ApplicationFormService, useValue: serviceMock }],
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
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user?: { id: string; role: string } }).user = {
        id: USER_ID,
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

  describe("GET /events/:eventId/application-form", () => {
    it("service.getForm に eventId を渡す", async () => {
      const res = await request(app.getHttpServer()).get(BASE);
      expect(res.status).toBe(200);
      expect(serviceMock.getForm).toHaveBeenCalledWith(EVENT_ID);
    });

    it("eventId が UUID でない場合は 400 になり service は呼ばれない", async () => {
      const res = await request(app.getHttpServer()).get(`/events/not-uuid/application-form`);
      expect(res.status).toBe(400);
      expect(serviceMock.getForm).not.toHaveBeenCalled();
    });
  });

  describe("GET /events/:eventId/application-form/public", () => {
    it("service.getFormPublic に eventId を渡す", async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}/public`);
      expect(res.status).toBe(200);
      expect(serviceMock.getFormPublic).toHaveBeenCalledWith(EVENT_ID);
    });
  });

  describe("PUT /events/:eventId/application-form/config", () => {
    it("service.upsertConfig に eventId と dto を渡す", async () => {
      const dto = { askName: "required", reminderEnabled: true, reminderHoursBefore: 24 };
      const res = await request(app.getHttpServer()).put(`${BASE}/config`).send(dto);
      expect(res.status).toBe(200);
      expect(serviceMock.upsertConfig).toHaveBeenCalledWith(EVENT_ID, expect.objectContaining(dto));
    });

    it("未許可フィールドは whitelist で剥がされる（forbidNonWhitelisted で 400）", async () => {
      const res = await request(app.getHttpServer())
        .put(`${BASE}/config`)
        .send({ askName: "required", unknownField: "x" });
      expect(res.status).toBe(400);
      expect(serviceMock.upsertConfig).not.toHaveBeenCalled();
    });

    it("askName に enum 外の値を渡すと 400", async () => {
      const res = await request(app.getHttpServer())
        .put(`${BASE}/config`)
        .send({ askName: "invalid" });
      expect(res.status).toBe(400);
      expect(serviceMock.upsertConfig).not.toHaveBeenCalled();
    });
  });

  describe("POST /events/:eventId/application-form/questions", () => {
    it("service.createQuestion に eventId と dto を渡す", async () => {
      const dto = { label: "好きな色", questionType: "text" };
      const res = await request(app.getHttpServer()).post(`${BASE}/questions`).send(dto);
      expect(res.status).toBe(201);
      expect(serviceMock.createQuestion).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining(dto),
      );
    });

    it("questionType が enum 外なら 400", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/questions`)
        .send({ label: "x", questionType: "invalid" });
      expect(res.status).toBe(400);
      expect(serviceMock.createQuestion).not.toHaveBeenCalled();
    });

    it("options 配列の各要素がネスト検証される（value/label 欠落で 400）", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/questions`)
        .send({ label: "x", questionType: "radio", options: [{ value: "a" }] });
      expect(res.status).toBe(400);
      expect(serviceMock.createQuestion).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /events/:eventId/application-form/questions/reorder", () => {
    it("service.reorderQuestions に eventId と items を渡す", async () => {
      const dto = {
        items: [
          { id: QUESTION_ID, sortOrder: 0 },
          { id: "44444444-4444-4444-8444-444444444444", sortOrder: 1 },
        ],
      };
      const res = await request(app.getHttpServer()).patch(`${BASE}/questions/reorder`).send(dto);
      expect(res.status).toBe(200);
      expect(serviceMock.reorderQuestions).toHaveBeenCalledWith(
        EVENT_ID,
        expect.objectContaining({ items: dto.items }),
      );
    });

    it("items の id が UUID でなければ 400", async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/questions/reorder`)
        .send({ items: [{ id: "not-uuid", sortOrder: 0 }] });
      expect(res.status).toBe(400);
      expect(serviceMock.reorderQuestions).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /events/:eventId/application-form/questions/:questionId", () => {
    it("service.updateQuestion に questionId と dto を渡す（eventId は引数に取らない）", async () => {
      const dto = { label: "更新", isRequired: true };
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/questions/${QUESTION_ID}`)
        .send(dto);
      expect(res.status).toBe(200);
      expect(serviceMock.updateQuestion).toHaveBeenCalledWith(
        QUESTION_ID,
        expect.objectContaining(dto),
      );
    });

    it("questionId が UUID でなければ 400", async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/questions/not-uuid`)
        .send({ label: "x" });
      expect(res.status).toBe(400);
      expect(serviceMock.updateQuestion).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /events/:eventId/application-form/questions/:questionId", () => {
    it("204 No Content を返し service.deleteQuestion を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).delete(`${BASE}/questions/${QUESTION_ID}`);
      expect(res.status).toBe(204);
      expect(serviceMock.deleteQuestion).toHaveBeenCalledWith(QUESTION_ID);
    });
  });
});
