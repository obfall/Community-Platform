import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { BoardLikesController } from "./board-likes.controller";
import { BoardLikesService } from "./board-likes.service";
import { FeatureEnabledGuard } from "@/common/guards";

describe("BoardLikesController", () => {
  let app: INestApplication;
  let serviceMock: {
    toggleTopicLike: jest.Mock;
    toggleTopicPostLike: jest.Mock;
    toggleTopicPostCommentLike: jest.Mock;
  };

  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
  const TEST_TOPIC_ID = "22222222-2222-4222-8222-222222222222";
  const TEST_POST_ID = "33333333-3333-4333-8333-333333333333";
  const TEST_COMMENT_ID = "44444444-4444-4444-8444-444444444444";

  beforeAll(async () => {
    serviceMock = {
      toggleTopicLike: jest.fn().mockResolvedValue({ liked: true, likeCount: 1 }),
      toggleTopicPostLike: jest.fn().mockResolvedValue({ liked: true, likeCount: 1 }),
      toggleTopicPostCommentLike: jest.fn().mockResolvedValue({ liked: true, likeCount: 1 }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [BoardLikesController],
      providers: [{ provide: BoardLikesService, useValue: serviceMock }],
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

  it("POST /board/topics/:id/like は service.toggleTopicLike を呼ぶ", async () => {
    const res = await request(app.getHttpServer()).post(`/board/topics/${TEST_TOPIC_ID}/like`);
    expect(res.status).toBe(201);
    expect(serviceMock.toggleTopicLike).toHaveBeenCalledWith(TEST_USER_ID, TEST_TOPIC_ID);
  });

  it("POST /board/topic-posts/:id/like は service.toggleTopicPostLike を呼ぶ", async () => {
    const res = await request(app.getHttpServer()).post(`/board/topic-posts/${TEST_POST_ID}/like`);
    expect(res.status).toBe(201);
    expect(serviceMock.toggleTopicPostLike).toHaveBeenCalledWith(TEST_USER_ID, TEST_POST_ID);
  });

  it("POST /board/topic-post-comments/:id/like は service.toggleTopicPostCommentLike を呼ぶ", async () => {
    const res = await request(app.getHttpServer()).post(
      `/board/topic-post-comments/${TEST_COMMENT_ID}/like`,
    );
    expect(res.status).toBe(201);
    expect(serviceMock.toggleTopicPostCommentLike).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_COMMENT_ID,
    );
  });
});
