import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { BoardCategoriesController } from "./board-categories.controller";
import { BoardCategoriesService } from "./board-categories.service";
import { FeatureEnabledGuard, RolesGuard } from "@/common/guards";

describe("BoardCategoriesController", () => {
  let app: INestApplication;
  let serviceMock: {
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    reorder: jest.Mock;
    softDelete: jest.Mock;
  };

  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
  const TEST_CATEGORY_ID = "22222222-2222-4222-8222-222222222222";

  beforeAll(async () => {
    serviceMock = {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: TEST_CATEGORY_ID }),
      update: jest.fn().mockResolvedValue({ id: TEST_CATEGORY_ID }),
      reorder: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [BoardCategoriesController],
      providers: [{ provide: BoardCategoriesService, useValue: serviceMock }],
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

  it("GET /board/categories は service.findAll を呼ぶ", async () => {
    const res = await request(app.getHttpServer()).get("/board/categories");
    expect(res.status).toBe(200);
    expect(serviceMock.findAll).toHaveBeenCalled();
  });

  it("POST /board/categories は service.create を userId と dto で呼ぶ", async () => {
    const dto = { name: "お知らせ", allowTopicCreation: true };
    const res = await request(app.getHttpServer()).post("/board/categories").send(dto);
    expect(res.status).toBe(201);
    expect(serviceMock.create).toHaveBeenCalledWith(TEST_USER_ID, expect.objectContaining(dto));
  });

  it("DELETE /board/categories/:id は 204 で service.softDelete を呼ぶ", async () => {
    const res = await request(app.getHttpServer()).delete(`/board/categories/${TEST_CATEGORY_ID}`);
    expect(res.status).toBe(204);
    expect(serviceMock.softDelete).toHaveBeenCalledWith(TEST_CATEGORY_ID);
  });

  it("PATCH /board/categories/reorder は service.reorder を items 配列で呼ぶ", async () => {
    const items = [{ id: TEST_CATEGORY_ID, sortOrder: 0 }];
    const res = await request(app.getHttpServer())
      .patch("/board/categories/reorder")
      .send({ items });
    expect(res.status).toBe(200);
    expect(serviceMock.reorder).toHaveBeenCalledWith(items);
  });
});
