import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { BoardTopicPostCommentsController } from "./board-topic-post-comments.controller";
import { BoardTopicPostCommentsService } from "./board-topic-post-comments.service";
import { FeatureEnabledGuard } from "@/common/guards";

describe("BoardTopicPostCommentsController", () => {
  let app: INestApplication;
  let serviceMock: {
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };

  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
  const TEST_POST_ID = "22222222-2222-4222-8222-222222222222";
  const TEST_COMMENT_ID = "33333333-3333-4333-8333-333333333333";

  beforeAll(async () => {
    serviceMock = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      create: jest.fn().mockResolvedValue({ id: TEST_COMMENT_ID }),
      update: jest.fn().mockResolvedValue({ id: TEST_COMMENT_ID }),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [BoardTopicPostCommentsController],
      providers: [{ provide: BoardTopicPostCommentsService, useValue: serviceMock }],
    })
      .overrideGuard(FeatureEnabledGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
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

  it("GET /board/topic-posts/:id/comments は service.findAll を呼ぶ", async () => {
    const res = await request(app.getHttpServer()).get(
      `/board/topic-posts/${TEST_POST_ID}/comments`,
    );
    expect(res.status).toBe(200);
    expect(serviceMock.findAll).toHaveBeenCalledWith(TEST_USER_ID, TEST_POST_ID, expect.anything());
  });

  it("POST /board/topic-posts/:id/comments は service.create を呼ぶ", async () => {
    const dto = { body: "コメント本文" };
    const res = await request(app.getHttpServer())
      .post(`/board/topic-posts/${TEST_POST_ID}/comments`)
      .send(dto);
    expect(res.status).toBe(201);
    expect(serviceMock.create).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_POST_ID,
      expect.objectContaining(dto),
    );
  });

  it("DELETE /board/topic-post-comments/:id は 204 で service.softDelete を呼ぶ", async () => {
    const res = await request(app.getHttpServer()).delete(
      `/board/topic-post-comments/${TEST_COMMENT_ID}`,
    );
    expect(res.status).toBe(204);
    expect(serviceMock.softDelete).toHaveBeenCalledWith(TEST_USER_ID, TEST_COMMENT_ID);
  });
});
