import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { BoardTopicsController } from "./board-topics.controller";
import { BoardTopicsService } from "./board-topics.service";
import { FeatureEnabledGuard, RolesGuard } from "@/common/guards";

/**
 * BoardTopicsController のエンドポイント委譲テスト。
 *
 * - Guard は override で bypass（FeatureEnabled / Roles の挙動は別レベルでテスト）
 * - CurrentUser デコレータ用に req.user を middleware で注入
 * - サービスへの引数受け渡しと HTTP ステータスのみ検証する
 */
describe("BoardTopicsController", () => {
  let app: INestApplication;
  let serviceMock: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    reorder: jest.Mock;
    togglePin: jest.Mock;
  };

  // UUID v4 形式（13 桁目=4、19 桁目=8/9/a/b）
  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
  const TEST_TOPIC_ID = "22222222-2222-4222-8222-222222222222";
  const TEST_CATEGORY_ID = "33333333-3333-4333-8333-333333333333";

  beforeAll(async () => {
    serviceMock = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({ id: TEST_TOPIC_ID }),
      create: jest.fn().mockResolvedValue({ id: TEST_TOPIC_ID }),
      update: jest.fn().mockResolvedValue({ id: TEST_TOPIC_ID }),
      softDelete: jest.fn().mockResolvedValue(undefined),
      reorder: jest.fn().mockResolvedValue(undefined),
      togglePin: jest.fn().mockResolvedValue({ isPinned: true }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [BoardTopicsController],
      providers: [{ provide: BoardTopicsService, useValue: serviceMock }],
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

  it("GET /board/topics は service.findAll を userId とクエリで呼ぶ", async () => {
    const res = await request(app.getHttpServer()).get(
      `/board/topics?categoryId=${TEST_CATEGORY_ID}`,
    );
    expect(res.status).toBe(200);
    expect(serviceMock.findAll).toHaveBeenCalledWith(TEST_USER_ID, expect.anything());
  });

  it("POST /board/topics は service.create を userId と dto で呼ぶ", async () => {
    const dto = {
      title: "テスト",
      body: "本文",
      categoryId: TEST_CATEGORY_ID,
      publishStatus: "published",
    };
    const res = await request(app.getHttpServer()).post("/board/topics").send(dto);
    expect(res.status).toBe(201);
    expect(serviceMock.create).toHaveBeenCalledWith(TEST_USER_ID, expect.objectContaining(dto));
  });

  it("PATCH /board/topics/:id/pin は service.togglePin を呼ぶ", async () => {
    const res = await request(app.getHttpServer()).patch(`/board/topics/${TEST_TOPIC_ID}/pin`);
    expect(res.status).toBe(200);
    expect(serviceMock.togglePin).toHaveBeenCalledWith(TEST_TOPIC_ID);
  });

  it("DELETE /board/topics/:id は 204 で service.softDelete を呼ぶ", async () => {
    const res = await request(app.getHttpServer()).delete(`/board/topics/${TEST_TOPIC_ID}`);
    expect(res.status).toBe(204);
    expect(serviceMock.softDelete).toHaveBeenCalledWith(TEST_USER_ID, TEST_TOPIC_ID);
  });

  it("PATCH /board/topics/:id に UUID 形式でない値を渡すと 400", async () => {
    const res = await request(app.getHttpServer())
      .patch("/board/topics/not-a-uuid")
      .send({ title: "x" });
    expect(res.status).toBe(400);
  });
});
