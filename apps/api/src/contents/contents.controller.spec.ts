import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { ContentsController } from "./contents.controller";
import { ContentsService } from "./contents.service";
import { FeatureEnabledGuard } from "@/common/guards";

/**
 * ContentsController のエンドポイント委譲テスト。
 *
 * - Guard は override で bypass（FeatureEnabled の挙動は別レベルでテスト）
 * - CurrentUser デコレータ用に req.user を middleware で注入
 * - サービスへの引数受け渡しと HTTP ステータスのみ検証する
 */
describe("ContentsController", () => {
  let app: INestApplication;
  let serviceMock: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  // UUID v4 形式
  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
  const TEST_CONTENT_ID = "22222222-2222-4222-8222-222222222222";

  beforeAll(async () => {
    serviceMock = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({ id: TEST_CONTENT_ID }),
      create: jest.fn().mockResolvedValue({ id: TEST_CONTENT_ID }),
      update: jest.fn().mockResolvedValue({ id: TEST_CONTENT_ID }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ContentsController],
      providers: [{ provide: ContentsService, useValue: serviceMock }],
    })
      .overrideGuard(FeatureEnabledGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    // CurrentUser("id") / CurrentUser() が拾えるよう req.user を注入
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

  it("GET /contents は service.findAll をクエリと currentUser で呼ぶ", async () => {
    const res = await request(app.getHttpServer()).get(
      `/contents?contentType=meal_drink&search=hi`,
    );
    expect(res.status).toBe(200);
    expect(serviceMock.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "meal_drink", search: "hi" }),
      expect.objectContaining({ id: TEST_USER_ID, role: "admin" }),
    );
  });

  it("GET /contents/:id は service.findOne を id, currentUser で呼ぶ", async () => {
    const res = await request(app.getHttpServer()).get(`/contents/${TEST_CONTENT_ID}`);
    expect(res.status).toBe(200);
    expect(serviceMock.findOne).toHaveBeenCalledWith(
      TEST_CONTENT_ID,
      expect.objectContaining({ id: TEST_USER_ID, role: "admin" }),
    );
  });

  it("GET /contents/:id に UUID 形式でない値を渡すと 400", async () => {
    const res = await request(app.getHttpServer()).get(`/contents/not-a-uuid`);
    expect(res.status).toBe(400);
    expect(serviceMock.findOne).not.toHaveBeenCalled();
  });

  it("POST /contents は service.create を userId と dto で呼ぶ", async () => {
    const dto = { name: "新規", contentType: "meal_drink" };
    const res = await request(app.getHttpServer()).post(`/contents`).send(dto);
    expect(res.status).toBe(201);
    expect(serviceMock.create).toHaveBeenCalledWith(TEST_USER_ID, expect.objectContaining(dto));
  });

  it("PATCH /contents/:id は service.update を id, body, currentUser で呼ぶ", async () => {
    const dto = { name: "更新", publishStatus: "published" };
    const res = await request(app.getHttpServer()).patch(`/contents/${TEST_CONTENT_ID}`).send(dto);
    expect(res.status).toBe(200);
    expect(serviceMock.update).toHaveBeenCalledWith(
      TEST_CONTENT_ID,
      expect.objectContaining(dto),
      expect.objectContaining({ id: TEST_USER_ID, role: "admin" }),
    );
  });

  it("DELETE /contents/:id は 204 で service.remove を呼ぶ", async () => {
    const res = await request(app.getHttpServer()).delete(`/contents/${TEST_CONTENT_ID}`);
    expect(res.status).toBe(204);
    expect(serviceMock.remove).toHaveBeenCalledWith(
      TEST_CONTENT_ID,
      expect.objectContaining({ id: TEST_USER_ID, role: "admin" }),
    );
  });

  it("share/:token エンドポイントは廃止されており 404 を返す", async () => {
    const res = await request(app.getHttpServer()).get(`/contents/share/some-token`);
    // ルーティングが存在しない場合、`/contents/:id` 側で UUID 検証に引っかかり 400 になる
    // どちらにせよ 200 で本物のレスポンスを返してはならない
    expect([400, 404]).toContain(res.status);
  });
});
