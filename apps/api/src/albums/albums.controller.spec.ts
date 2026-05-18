import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { AlbumsController } from "./albums.controller";
import { AlbumsService } from "./albums.service";
import { FeatureEnabledGuard, RolesGuard } from "@/common/guards";

/**
 * AlbumsController のエンドポイント委譲テスト。
 *
 * - 基本ケース: FeatureEnabled / Roles はどちらも override で bypass し、サービスへの引数受け渡しと HTTP ステータスのみ検証
 * - createCategory の RolesGuard 動作は別 describe で override せず実機の挙動を確認する
 * - CurrentUser デコレータ用に req.user を middleware で注入
 */
describe("AlbumsController", () => {
  // UUID v4 形式
  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
  const TEST_ALBUM_ID = "22222222-2222-4222-8222-222222222222";
  const TEST_CATEGORY_ID = "33333333-3333-4333-8333-333333333333";
  const TEST_FILE_ID = "44444444-4444-4444-8444-444444444444";
  const TEST_PHOTO_ID = "55555555-5555-4555-8555-555555555555";

  describe("Guard を bypass した委譲テスト", () => {
    let app: INestApplication;
    let serviceMock: {
      findAll: jest.Mock;
      findOne: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      remove: jest.Mock;
      addPhotos: jest.Mock;
      removePhoto: jest.Mock;
      getCategories: jest.Mock;
      createCategory: jest.Mock;
    };

    beforeAll(async () => {
      serviceMock = {
        findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
        findOne: jest.fn().mockResolvedValue({ id: TEST_ALBUM_ID }),
        create: jest.fn().mockResolvedValue({ id: TEST_ALBUM_ID }),
        update: jest.fn().mockResolvedValue({ id: TEST_ALBUM_ID }),
        remove: jest.fn().mockResolvedValue(undefined),
        addPhotos: jest.fn().mockResolvedValue({ count: 1 }),
        removePhoto: jest.fn().mockResolvedValue(undefined),
        getCategories: jest.fn().mockResolvedValue([]),
        createCategory: jest.fn().mockResolvedValue({ id: TEST_CATEGORY_ID, name: "風景" }),
      };

      const moduleRef = await Test.createTestingModule({
        controllers: [AlbumsController],
        providers: [{ provide: AlbumsService, useValue: serviceMock }],
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

    it("GET /albums は service.findAll をクエリと currentUser で呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(
        `/albums?categoryId=${TEST_CATEGORY_ID}&search=hi`,
      );
      expect(res.status).toBe(200);
      expect(serviceMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: TEST_CATEGORY_ID, search: "hi" }),
        expect.objectContaining({ id: TEST_USER_ID, role: "admin" }),
      );
    });

    it("GET /albums/categories は service.getCategories を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(`/albums/categories`);
      expect(res.status).toBe(200);
      expect(serviceMock.getCategories).toHaveBeenCalled();
    });

    it("POST /albums/categories は dto.name で service.createCategory を呼ぶ", async () => {
      const res = await request(app.getHttpServer())
        .post(`/albums/categories`)
        .send({ name: "風景" });
      expect(res.status).toBe(201);
      expect(serviceMock.createCategory).toHaveBeenCalledWith("風景");
    });

    it("POST /albums/categories は空 name で 400（DTO バリデーション）", async () => {
      const res = await request(app.getHttpServer()).post(`/albums/categories`).send({ name: "" });
      expect(res.status).toBe(400);
      expect(serviceMock.createCategory).not.toHaveBeenCalled();
    });

    it("GET /albums/:id は service.findOne を id, currentUser で呼ぶ", async () => {
      const res = await request(app.getHttpServer()).get(`/albums/${TEST_ALBUM_ID}`);
      expect(res.status).toBe(200);
      expect(serviceMock.findOne).toHaveBeenCalledWith(
        TEST_ALBUM_ID,
        expect.objectContaining({ id: TEST_USER_ID, role: "admin" }),
      );
    });

    it("POST /albums は service.create を currentUser.id と dto で呼ぶ", async () => {
      const dto = { title: "新規", description: "desc" };
      const res = await request(app.getHttpServer()).post(`/albums`).send(dto);
      expect(res.status).toBe(201);
      expect(serviceMock.create).toHaveBeenCalledWith(TEST_USER_ID, expect.objectContaining(dto));
    });

    it("PATCH /albums/:id は service.update を id, dto, currentUser で呼ぶ", async () => {
      const dto = { title: "更新", publishStatus: "published" };
      const res = await request(app.getHttpServer()).patch(`/albums/${TEST_ALBUM_ID}`).send(dto);
      expect(res.status).toBe(200);
      expect(serviceMock.update).toHaveBeenCalledWith(
        TEST_ALBUM_ID,
        expect.objectContaining(dto),
        expect.objectContaining({ id: TEST_USER_ID, role: "admin" }),
      );
    });

    it("PATCH /albums/:id は publishStatus が enum 外なら 400（DTO バリデーション）", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/albums/${TEST_ALBUM_ID}`)
        .send({ publishStatus: "invalid_status" });
      expect(res.status).toBe(400);
      expect(serviceMock.update).not.toHaveBeenCalled();
    });

    it("DELETE /albums/:id は 204 で service.remove を呼ぶ", async () => {
      const res = await request(app.getHttpServer()).delete(`/albums/${TEST_ALBUM_ID}`);
      expect(res.status).toBe(204);
      expect(serviceMock.remove).toHaveBeenCalledWith(
        TEST_ALBUM_ID,
        expect.objectContaining({ id: TEST_USER_ID, role: "admin" }),
      );
    });

    it("POST /albums/:id/photos は service.addPhotos を albumId, currentUser, photos で呼ぶ", async () => {
      const photos = [{ fileId: TEST_FILE_ID, title: "夕焼け" }];
      const res = await request(app.getHttpServer())
        .post(`/albums/${TEST_ALBUM_ID}/photos`)
        .send({ photos });
      expect(res.status).toBe(201);
      expect(serviceMock.addPhotos).toHaveBeenCalledWith(
        TEST_ALBUM_ID,
        expect.objectContaining({ id: TEST_USER_ID, role: "admin" }),
        expect.arrayContaining([expect.objectContaining({ fileId: TEST_FILE_ID })]),
      );
    });

    it("POST /albums/:id/photos は fileId が UUID でないと 400", async () => {
      const res = await request(app.getHttpServer())
        .post(`/albums/${TEST_ALBUM_ID}/photos`)
        .send({ photos: [{ fileId: "not-uuid" }] });
      expect(res.status).toBe(400);
      expect(serviceMock.addPhotos).not.toHaveBeenCalled();
    });

    it("POST /albums/:id/photos は photos が空配列だと 400", async () => {
      const res = await request(app.getHttpServer())
        .post(`/albums/${TEST_ALBUM_ID}/photos`)
        .send({ photos: [] });
      expect(res.status).toBe(400);
      expect(serviceMock.addPhotos).not.toHaveBeenCalled();
    });

    it("DELETE /albums/:id/photos/:photoId は 204 で service.removePhoto を albumId, photoId, currentUser で呼ぶ", async () => {
      const res = await request(app.getHttpServer()).delete(
        `/albums/${TEST_ALBUM_ID}/photos/${TEST_PHOTO_ID}`,
      );
      expect(res.status).toBe(204);
      expect(serviceMock.removePhoto).toHaveBeenCalledWith(
        TEST_ALBUM_ID,
        TEST_PHOTO_ID,
        expect.objectContaining({ id: TEST_USER_ID, role: "admin" }),
      );
    });

    it("GET /albums/:id に UUID 形式でない値を渡すと 400", async () => {
      const res = await request(app.getHttpServer()).get(`/albums/not-a-uuid`);
      expect(res.status).toBe(400);
      expect(serviceMock.findOne).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // RolesGuard の挙動確認: createCategory は admin / owner 限定
  // ============================================================================
  describe("createCategory の RolesGuard: 一般メンバーは 403", () => {
    let app: INestApplication;
    const serviceMock = {
      createCategory: jest.fn().mockResolvedValue({ id: TEST_CATEGORY_ID, name: "風景" }),
    };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [AlbumsController],
        providers: [{ provide: AlbumsService, useValue: serviceMock }],
      })
        .overrideGuard(FeatureEnabledGuard)
        .useValue({ canActivate: () => true })
        // RolesGuard は override せず、実機の Reflector ベースの判定を効かせる
        .compile();

      app = moduleRef.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
      );
      // member ロールで認証されていることにする
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

    it("member は POST /albums/categories で 403", async () => {
      const res = await request(app.getHttpServer())
        .post(`/albums/categories`)
        .send({ name: "風景" });
      expect(res.status).toBe(403);
      expect(serviceMock.createCategory).not.toHaveBeenCalled();
    });
  });
});
