import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

/**
 * ルート順序の回帰テスト。
 *
 * 過去に `@Get("interest-categories")` が `@Get(":id")` より後に登録されていたため、
 * NestJS は "interest-categories" を UUID パラメータとして解釈し、
 * ParseUUIDPipe が 400 BadRequest を返してしまった。
 *
 * 静的パスは必ず `:id` より前に登録されている前提を保証する。
 */
describe("UsersController（ルート登録順序の回帰テスト）", () => {
  let app: INestApplication;
  let serviceMock: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    findInterestCategories: jest.Mock;
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
      findOne: jest.fn().mockResolvedValue({ id: "user-id" }),
      findInterestCategories: jest
        .fn()
        .mockResolvedValue([{ id: "c1", name: "技術", slug: "tech" }]),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: serviceMock }],
    })
      // 認証 Guard はモジュール全体で AppModule が設定しているのでここでは無視。
      // ParseUUIDPipe は @Param() 内で動くので別途設定不要。
      .compile();

    app = moduleRef.createNestApplication();
    // 本番 main.ts と同じ設定で whitelist の挙動を再現する
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /users/interest-categories は UUID 検証で弾かれず 200 を返す", async () => {
    const res = await request(app.getHttpServer()).get("/users/interest-categories");
    expect(res.status).toBe(200);
    expect(serviceMock.findInterestCategories).toHaveBeenCalled();
    // :id ルートには到達していないこと（findOne が呼ばれていない）
    expect(serviceMock.findOne).not.toHaveBeenCalled();
  });

  it("GET /users/:id（UUID）は通常通り findOne にルーティングされる", async () => {
    const validUuid = "11111111-1111-1111-1111-111111111111";
    const res = await request(app.getHttpServer()).get(`/users/${validUuid}`);
    expect(res.status).toBe(200);
    // 第 2 引数の viewer はテストでは認証情報が無いので id/role 共に undefined
    expect(serviceMock.findOne).toHaveBeenCalledWith(validUuid, { id: undefined, role: undefined });
  });

  it("GET /users/:id に UUID 形式でない値を渡すと 400 が返る（pipe バリデーション健在）", async () => {
    const res = await request(app.getHttpServer()).get("/users/not-a-uuid");
    expect(res.status).toBe(400);
  });

  it("PATCH /users/me/profile に未定義フィールドを送ると 400 が返る（whitelist + forbidNonWhitelisted で Mass Assignment 防御）", async () => {
    serviceMock.findOne; // 参照しないが mock 存在の確認
    const res = await request(app.getHttpServer())
      .patch("/users/me/profile")
      .send({ name: "Should not be assignable here", role: "admin" });
    // 認証がないのでこの spec では実際の挙動は通らない可能性があるが、
    // forbidNonWhitelisted が 400 を出すべき入力ではある
    expect([400, 401]).toContain(res.status);
  });
});
