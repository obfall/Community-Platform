import { ErrorCode } from "@community-platform/shared";
import { AlbumsService } from "./albums.service";

type Jestify<T> = { [K in keyof T]: jest.Mock };

function makeDelegate<T extends string>(): Jestify<Record<T, unknown>> {
  return new Proxy(
    {},
    {
      get: (target: Record<string, jest.Mock>, prop: string) => {
        if (!target[prop]) target[prop] = jest.fn();
        return target[prop];
      },
    },
  ) as Jestify<Record<T, unknown>>;
}

describe("AlbumsService", () => {
  let prismaMock: {
    album: Jestify<Record<"findMany" | "findUnique" | "count" | "create" | "update", unknown>>;
    albumPhoto: Jestify<Record<"count" | "createMany" | "findUnique" | "delete", unknown>>;
    file: Jestify<Record<"findUnique", unknown>>;
    category: Jestify<Record<"findMany" | "create", unknown>>;
    $queryRaw: jest.Mock;
  };
  let cacheMock: { getOrSet: jest.Mock; invalidate: jest.Mock };
  let service: AlbumsService;

  beforeEach(() => {
    prismaMock = {
      album: makeDelegate(),
      albumPhoto: makeDelegate(),
      file: makeDelegate(),
      category: makeDelegate(),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    // よく使うデフォルト戻り値
    prismaMock.album.findMany.mockResolvedValue([]);
    prismaMock.album.count.mockResolvedValue(0);
    prismaMock.albumPhoto.count.mockResolvedValue(0);
    prismaMock.albumPhoto.createMany.mockResolvedValue({ count: 0 });

    cacheMock = {
      getOrSet: jest.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
      invalidate: jest.fn().mockResolvedValue(undefined),
    };
    service = new AlbumsService(prismaMock as never, cacheMock as never);
  });

  // ============================================================================
  // findAll: 経路分岐
  // ============================================================================
  describe("findAll: search の有無で経路が分岐する", () => {
    const memberUser = { id: "u-1", role: "member" };

    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({}, memberUser);
      expect(prismaMock.album.findMany).toHaveBeenCalled();
      expect(prismaMock.album.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "写真" }, memberUser);
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" }, memberUser);
      expect(prismaMock.album.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("categoryId を渡すと where 条件に反映される", async () => {
      await service.findAll({ categoryId: "cat-1" }, memberUser);
      expect(prismaMock.album.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: "cat-1" }),
        }),
      );
    });
  });

  // ============================================================================
  // findAll: 可視性
  // ============================================================================
  describe("findAll: 可視性（published は全員 / draft は作成者と admin/owner のみ）", () => {
    const memberUser = { id: "u-1", role: "member" };
    const adminUser = { id: "u-3", role: "admin" };
    const ownerUser = { id: "u-4", role: "owner" };

    it("member の一覧は『published OR 作成者本人』で絞り込む", async () => {
      await service.findAll({}, memberUser);
      expect(prismaMock.album.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: [{ publishStatus: "published" }, { createdByUserId: "u-1" }],
          }),
        }),
      );
    });

    it("admin の一覧は publishStatus による絞り込みをかけない（全件表示）", async () => {
      await service.findAll({}, adminUser);
      const call = prismaMock.album.findMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
      };
      expect(call.where).not.toHaveProperty("OR");
      expect(call.where).not.toHaveProperty("publishStatus");
      expect(call.where).toEqual(expect.objectContaining({ deletedAt: null }));
    });

    it("owner も admin と同様に全件表示", async () => {
      await service.findAll({}, ownerUser);
      const call = prismaMock.album.findMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
      };
      expect(call.where).not.toHaveProperty("OR");
      expect(call.where).not.toHaveProperty("publishStatus");
    });
  });

  // ============================================================================
  // findOne: 詳細
  // ============================================================================
  describe("findOne: アルバム詳細", () => {
    const memberUser = { id: "u-1", role: "member" };
    const otherUser = { id: "u-2", role: "member" };
    const adminUser = { id: "u-3", role: "admin" };

    it("published なアルバムは誰でも閲覧できる", async () => {
      const album = {
        id: "a-1",
        deletedAt: null,
        publishStatus: "published",
        createdByUserId: "u-1",
        title: "t",
      };
      prismaMock.album.findUnique.mockResolvedValue(album);

      const result = await service.findOne("a-1", otherUser);
      expect(result).toBe(album);
    });

    it("存在しない場合は NOT_FOUND の BusinessException を投げる", async () => {
      prismaMock.album.findUnique.mockResolvedValue(null);
      await expect(service.findOne("a-1", memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("論理削除済み（deletedAt が立っている）の場合も NOT_FOUND", async () => {
      prismaMock.album.findUnique.mockResolvedValue({ id: "a-1", deletedAt: new Date() });
      await expect(service.findOne("a-1", memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("draft アルバムは作成者本人なら閲覧できる", async () => {
      const album = {
        id: "a-1",
        deletedAt: null,
        publishStatus: "draft",
        createdByUserId: "u-1",
      };
      prismaMock.album.findUnique.mockResolvedValue(album);

      const result = await service.findOne("a-1", memberUser);
      expect(result).toBe(album);
    });

    it("draft アルバムは admin / owner なら他人のものでも閲覧できる", async () => {
      const album = {
        id: "a-1",
        deletedAt: null,
        publishStatus: "draft",
        createdByUserId: "u-1",
      };
      prismaMock.album.findUnique.mockResolvedValue(album);

      const result = await service.findOne("a-1", adminUser);
      expect(result).toBe(album);
    });

    it("draft アルバムを作成者でも管理者でもない一般ユーザーが取得しようとすると NOT_FOUND（存在を漏らさない）", async () => {
      prismaMock.album.findUnique.mockResolvedValue({
        id: "a-1",
        deletedAt: null,
        publishStatus: "draft",
        createdByUserId: "u-1",
      });
      await expect(service.findOne("a-1", otherUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("unpublished アルバムも同様に作成者・admin・owner 以外には NOT_FOUND", async () => {
      prismaMock.album.findUnique.mockResolvedValue({
        id: "a-1",
        deletedAt: null,
        publishStatus: "unpublished",
        createdByUserId: "u-1",
      });
      await expect(service.findOne("a-1", otherUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ============================================================================
  // create: 作成
  // ============================================================================
  describe("create: アルバム作成", () => {
    it("dto を Prisma.create に渡し、publishStatus 未指定なら draft で作成する", async () => {
      prismaMock.album.create.mockResolvedValue({ id: "a-1" });
      await service.create("u-1", { title: "新規" });

      expect(prismaMock.album.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "新規",
          createdByUserId: "u-1",
          publishStatus: "draft",
        }),
      });
    });

    it("publishStatus が指定されていればその値で作成する", async () => {
      prismaMock.album.create.mockResolvedValue({ id: "a-1" });
      await service.create("u-1", { title: "t", publishStatus: "published" });

      expect(prismaMock.album.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ publishStatus: "published" }),
      });
    });
  });

  // ============================================================================
  // update: 更新
  // ============================================================================
  describe("update: アルバム更新", () => {
    const memberUser = { id: "u-1", role: "member" };
    const otherUser = { id: "u-2", role: "member" };
    const adminUser = { id: "u-3", role: "admin" };
    const baseAlbum = { id: "a-1", deletedAt: null, createdByUserId: "u-1", title: "old" };

    it("存在しない場合は NOT_FOUND", async () => {
      prismaMock.album.findUnique.mockResolvedValue(null);
      await expect(service.update("a-1", { title: "new" }, memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("作成者本人なら更新できる", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.album.update.mockResolvedValue({ ...baseAlbum, title: "new" });

      await service.update("a-1", { title: "new" }, memberUser);
      expect(prismaMock.album.update).toHaveBeenCalledWith({
        where: { id: "a-1" },
        data: { title: "new" },
      });
    });

    it("admin / owner なら他人のアルバムでも更新できる", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.album.update.mockResolvedValue(baseAlbum);

      await service.update("a-1", { title: "new" }, adminUser);
      expect(prismaMock.album.update).toHaveBeenCalled();
    });

    it("他人 (member) が更新しようとすると FORBIDDEN", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      await expect(service.update("a-1", { title: "new" }, otherUser)).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
      expect(prismaMock.album.update).not.toHaveBeenCalled();
    });

    it("data の undefined フィールドは Prisma.update の data から除外される", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.album.update.mockResolvedValue(baseAlbum);

      await service.update("a-1", { description: "desc" }, memberUser);
      expect(prismaMock.album.update).toHaveBeenCalledWith({
        where: { id: "a-1" },
        data: { description: "desc" },
      });
    });
  });

  // ============================================================================
  // remove: 削除
  // ============================================================================
  describe("remove: アルバム削除（論理削除）", () => {
    const memberUser = { id: "u-1", role: "member" };
    const otherUser = { id: "u-2", role: "member" };
    const baseAlbum = { id: "a-1", deletedAt: null, createdByUserId: "u-1" };

    it("存在しない場合は NOT_FOUND", async () => {
      prismaMock.album.findUnique.mockResolvedValue(null);
      await expect(service.remove("a-1", memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("作成者本人なら deletedAt を埋めて update する", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.album.update.mockResolvedValue(baseAlbum);

      await service.remove("a-1", memberUser);
      expect(prismaMock.album.update).toHaveBeenCalledWith({
        where: { id: "a-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("他人 (member) が削除しようとすると FORBIDDEN", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      await expect(service.remove("a-1", otherUser)).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
      expect(prismaMock.album.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // addPhotos: 写真追加
  // ============================================================================
  describe("addPhotos: 写真追加", () => {
    const memberUser = { id: "u-1", role: "member" };
    const otherUser = { id: "u-2", role: "member" };
    const adminUser = { id: "u-3", role: "admin" };
    const baseAlbum = { id: "a-1", deletedAt: null, createdByUserId: "u-1" };

    it("アルバムが無ければ NOT_FOUND", async () => {
      prismaMock.album.findUnique.mockResolvedValue(null);
      await expect(service.addPhotos("a-1", memberUser, [{ fileId: "f-1" }])).rejects.toMatchObject(
        {
          code: ErrorCode.NOT_FOUND,
        },
      );
    });

    it("論理削除済みアルバムなら NOT_FOUND", async () => {
      prismaMock.album.findUnique.mockResolvedValue({ ...baseAlbum, deletedAt: new Date() });
      await expect(service.addPhotos("a-1", memberUser, [{ fileId: "f-1" }])).rejects.toMatchObject(
        {
          code: ErrorCode.NOT_FOUND,
        },
      );
    });

    it("作成者ではない一般ユーザーが追加しようとすると FORBIDDEN（IDOR 対策）", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      await expect(service.addPhotos("a-1", otherUser, [{ fileId: "f-1" }])).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
      expect(prismaMock.albumPhoto.createMany).not.toHaveBeenCalled();
    });

    it("admin / owner なら他人のアルバムにも追加できる", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.albumPhoto.count.mockResolvedValue(1);
      prismaMock.album.update.mockResolvedValue({});

      await service.addPhotos("a-1", adminUser, [{ fileId: "f-x" }]);
      expect(prismaMock.albumPhoto.createMany).toHaveBeenCalled();
    });

    it("既存写真が無い場合は最初の写真をカバー画像として登録する", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.albumPhoto.count.mockResolvedValue(0);
      prismaMock.file.findUnique.mockResolvedValue({ publicUrl: "https://x/y.jpg" });
      prismaMock.album.update.mockResolvedValue({});

      const result = await service.addPhotos("a-1", memberUser, [
        { fileId: "f-1" },
        { fileId: "f-2" },
      ]);

      expect(prismaMock.albumPhoto.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ fileId: "f-1", sortOrder: 0, uploadedByUserId: "u-1" }),
          expect.objectContaining({ fileId: "f-2", sortOrder: 1, uploadedByUserId: "u-1" }),
        ]),
      });
      expect(prismaMock.album.update).toHaveBeenCalledWith({
        where: { id: "a-1" },
        data: { photoCount: 2, coverPhotoUrl: "https://x/y.jpg" },
      });
      expect(result).toEqual({ count: 2 });
    });

    it("既存写真がある場合は coverPhotoUrl は更新せず photoCount のみ加算する", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.albumPhoto.count.mockResolvedValue(3);
      prismaMock.album.update.mockResolvedValue({});

      await service.addPhotos("a-1", memberUser, [{ fileId: "f-x" }]);

      expect(prismaMock.file.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.album.update).toHaveBeenCalledWith({
        where: { id: "a-1" },
        data: { photoCount: 4 },
      });
    });

    it("sortOrder は既存写真数 + 配列 index の連番になる", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.albumPhoto.count.mockResolvedValue(5);
      prismaMock.album.update.mockResolvedValue({});

      await service.addPhotos("a-1", memberUser, [{ fileId: "f-1" }, { fileId: "f-2" }]);

      expect(prismaMock.albumPhoto.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ fileId: "f-1", sortOrder: 5 }),
          expect.objectContaining({ fileId: "f-2", sortOrder: 6 }),
        ],
      });
    });
  });

  // ============================================================================
  // removePhoto: 写真削除
  // ============================================================================
  describe("removePhoto: 写真削除", () => {
    const memberUser = { id: "u-1", role: "member" };
    const otherUser = { id: "u-2", role: "member" };
    const adminUser = { id: "u-3", role: "admin" };
    const baseAlbum = { id: "a-1", deletedAt: null, createdByUserId: "u-1" };

    it("アルバムが無ければ NOT_FOUND", async () => {
      prismaMock.album.findUnique.mockResolvedValue(null);
      await expect(service.removePhoto("a-1", "p-1", memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
      expect(prismaMock.albumPhoto.findUnique).not.toHaveBeenCalled();
    });

    it("作成者ではない一般ユーザーが削除しようとすると FORBIDDEN（破壊的 IDOR 対策）", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      await expect(service.removePhoto("a-1", "p-1", otherUser)).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
      expect(prismaMock.albumPhoto.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.albumPhoto.delete).not.toHaveBeenCalled();
    });

    it("admin / owner なら他人のアルバムの写真も削除できる", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.albumPhoto.findUnique.mockResolvedValue({ id: "p-1", albumId: "a-1" });
      prismaMock.albumPhoto.delete.mockResolvedValue({});
      prismaMock.album.update.mockResolvedValue({});

      await service.removePhoto("a-1", "p-1", adminUser);
      expect(prismaMock.albumPhoto.delete).toHaveBeenCalled();
    });

    it("写真が存在しないなら NOT_FOUND", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.albumPhoto.findUnique.mockResolvedValue(null);
      await expect(service.removePhoto("a-1", "p-1", memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("写真が別アルバム所属だと NOT_FOUND（誤参照防止）", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.albumPhoto.findUnique.mockResolvedValue({ id: "p-1", albumId: "other-album" });
      await expect(service.removePhoto("a-1", "p-1", memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
      expect(prismaMock.albumPhoto.delete).not.toHaveBeenCalled();
    });

    it("正常時は写真を delete して photoCount を decrement する", async () => {
      prismaMock.album.findUnique.mockResolvedValue(baseAlbum);
      prismaMock.albumPhoto.findUnique.mockResolvedValue({ id: "p-1", albumId: "a-1" });
      prismaMock.albumPhoto.delete.mockResolvedValue({});
      prismaMock.album.update.mockResolvedValue({});

      await service.removePhoto("a-1", "p-1", memberUser);
      expect(prismaMock.albumPhoto.delete).toHaveBeenCalledWith({ where: { id: "p-1" } });
      expect(prismaMock.album.update).toHaveBeenCalledWith({
        where: { id: "a-1" },
        data: { photoCount: { decrement: 1 } },
      });
    });
  });

  // ============================================================================
  // getCategories / createCategory
  // ============================================================================
  describe("getCategories: カテゴリ一覧", () => {
    it("CacheService.getOrSet 経由で album スコープの category を引く", async () => {
      const fakeRows = [{ id: "c-1", name: "風景" }];
      prismaMock.category.findMany.mockResolvedValue(fakeRows);

      const result = await service.getCategories();
      expect(cacheMock.getOrSet).toHaveBeenCalledWith(
        "master:categories:album:all",
        expect.any(Function),
        expect.any(Number),
      );
      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { scope: "album", isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      expect(result).toBe(fakeRows);
    });
  });

  describe("createCategory: カテゴリ作成", () => {
    it("scope=album で作成し、カテゴリキャッシュを invalidate する", async () => {
      const created = { id: "c-1", name: "風景", scope: "album" };
      prismaMock.category.create.mockResolvedValue(created);

      const result = await service.createCategory("風景");
      expect(prismaMock.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ scope: "album", name: "風景" }),
      });
      expect(cacheMock.invalidate).toHaveBeenCalledWith("master:categories:album:");
      expect(result).toBe(created);
    });
  });
});
