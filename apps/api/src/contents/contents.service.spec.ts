import { ErrorCode } from "@community-platform/shared";
import { ContentsService } from "./contents.service";

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

describe("ContentsService", () => {
  let prismaMock: {
    content: Jestify<Record<"findMany" | "findUnique" | "count" | "create" | "update", unknown>>;
    $queryRaw: jest.Mock;
  };
  let service: ContentsService;

  beforeEach(() => {
    prismaMock = {
      content: makeDelegate(),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    // よく使うデフォルト戻り値
    prismaMock.content.findMany.mockResolvedValue([]);
    prismaMock.content.count.mockResolvedValue(0);

    service = new ContentsService(prismaMock as never);
  });

  // ============================================================================
  // findAll: 経路分岐
  // ============================================================================
  describe("findAll: search の有無で経路が分岐する", () => {
    const memberUser = { id: "u-1", role: "member" };

    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({}, memberUser);
      expect(prismaMock.content.findMany).toHaveBeenCalled();
      expect(prismaMock.content.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "コンテンツ" }, memberUser);
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" }, memberUser);
      expect(prismaMock.content.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("contentType を渡すと where 条件に反映される", async () => {
      await service.findAll({ contentType: "meal_drink" }, memberUser);
      expect(prismaMock.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ contentType: "meal_drink" }),
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
      expect(prismaMock.content.findMany).toHaveBeenCalledWith(
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
      const call = prismaMock.content.findMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
      };
      expect(call.where).not.toHaveProperty("OR");
      expect(call.where).not.toHaveProperty("publishStatus");
      expect(call.where).toEqual(expect.objectContaining({ deletedAt: null }));
    });

    it("owner も admin と同様に全件表示", async () => {
      await service.findAll({}, ownerUser);
      const call = prismaMock.content.findMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
      };
      expect(call.where).not.toHaveProperty("OR");
      expect(call.where).not.toHaveProperty("publishStatus");
    });
  });

  // ============================================================================
  // findAll: 検索ヒット時の整形後 shape
  // ============================================================================
  describe("findAll: 検索ヒット時の整形後 shape", () => {
    it("data に titleHighlighted / snippetHighlighted が乗る（API 契約のキー名整合）", async () => {
      const id = "22222222-2222-2222-2222-222222222222";
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id,
            score: 1,
            titleHighlighted: "<span>名前</span>",
            snippetHighlighted: "<span>説明</span>",
          },
        ])
        .mockResolvedValueOnce([{ count: 1n }]);
      prismaMock.content.findMany.mockResolvedValueOnce([
        {
          id,
          name: "名前",
          contentType: "video",
          description: "説明",
          price: null,
          coverImageUrl: null,
          publishStatus: "published",
          createdBy: { id: "u", name: "creator" },
          createdAt: new Date(),
        },
      ]);
      const result = await service.findAll({ search: "名前" }, { id: "u-1", role: "member" });
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id,
          name: "名前",
          titleHighlighted: "<span>名前</span>",
          snippetHighlighted: "<span>説明</span>",
        }),
      );
      // 過去の不整合キー（nameHighlighted / descriptionHighlighted）が混入していないこと
      expect(result.data[0]).not.toHaveProperty("nameHighlighted");
      expect(result.data[0]).not.toHaveProperty("descriptionHighlighted");
      // 招待トークンは廃止したので返さない
      expect(result.data[0]).not.toHaveProperty("inviteToken");
    });
  });

  // ============================================================================
  // findOne: 詳細
  // ============================================================================
  describe("findOne: コンテンツ詳細", () => {
    const memberUser = { id: "u-1", role: "member" };
    const otherUser = { id: "u-2", role: "member" };
    const adminUser = { id: "u-3", role: "admin" };

    it("published なコンテンツは誰でも閲覧できる", async () => {
      const content = {
        id: "c-1",
        deletedAt: null,
        publishStatus: "published",
        createdByUserId: "u-1",
        name: "n",
      };
      prismaMock.content.findUnique.mockResolvedValue(content);

      const result = await service.findOne("c-1", otherUser);
      expect(result).toBe(content);
    });

    it("存在しない場合は NOT_FOUND の BusinessException を投げる", async () => {
      prismaMock.content.findUnique.mockResolvedValue(null);
      await expect(service.findOne("c-1", memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("論理削除済み（deletedAt が立っている）の場合も NOT_FOUND", async () => {
      prismaMock.content.findUnique.mockResolvedValue({ id: "c-1", deletedAt: new Date() });
      await expect(service.findOne("c-1", memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("draft コンテンツは作成者本人なら閲覧できる", async () => {
      const content = {
        id: "c-1",
        deletedAt: null,
        publishStatus: "draft",
        createdByUserId: "u-1",
      };
      prismaMock.content.findUnique.mockResolvedValue(content);

      const result = await service.findOne("c-1", memberUser);
      expect(result).toBe(content);
    });

    it("draft コンテンツは admin / owner なら他人のものでも閲覧できる", async () => {
      const content = {
        id: "c-1",
        deletedAt: null,
        publishStatus: "draft",
        createdByUserId: "u-1",
      };
      prismaMock.content.findUnique.mockResolvedValue(content);

      const result = await service.findOne("c-1", adminUser);
      expect(result).toBe(content);
    });

    it("draft コンテンツを作成者でも管理者でもない一般ユーザーが取得しようとすると NOT_FOUND（存在を漏らさない）", async () => {
      prismaMock.content.findUnique.mockResolvedValue({
        id: "c-1",
        deletedAt: null,
        publishStatus: "draft",
        createdByUserId: "u-1",
      });
      await expect(service.findOne("c-1", otherUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("unpublished コンテンツも同様に作成者・admin・owner 以外には NOT_FOUND", async () => {
      prismaMock.content.findUnique.mockResolvedValue({
        id: "c-1",
        deletedAt: null,
        publishStatus: "unpublished",
        createdByUserId: "u-1",
      });
      await expect(service.findOne("c-1", otherUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  // ============================================================================
  // create: 作成
  // ============================================================================
  describe("create: コンテンツ作成", () => {
    it("dto を Prisma.create に渡し、publishStatus 未指定なら draft で作成する（inviteToken は渡さない）", async () => {
      prismaMock.content.create.mockResolvedValue({ id: "c-1" });
      await service.create("u-1", { name: "新規", contentType: "meal_drink" });

      expect(prismaMock.content.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "新規",
          contentType: "meal_drink",
          createdByUserId: "u-1",
          publishStatus: "draft",
        }),
      });
      const callArg = prismaMock.content.create.mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      expect(callArg.data).not.toHaveProperty("inviteToken");
    });

    it("publishStatus が指定されていればその値で作成する", async () => {
      prismaMock.content.create.mockResolvedValue({ id: "c-1" });
      await service.create("u-1", {
        name: "n",
        contentType: "meal_drink",
        publishStatus: "published",
      });

      expect(prismaMock.content.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ publishStatus: "published" }),
      });
    });
  });

  // ============================================================================
  // update: 更新
  // ============================================================================
  describe("update: コンテンツ更新", () => {
    const memberUser = { id: "u-1", role: "member" };
    const otherUser = { id: "u-2", role: "member" };
    const adminUser = { id: "u-3", role: "admin" };
    const baseContent = { id: "c-1", deletedAt: null, createdByUserId: "u-1", name: "old" };

    it("存在しない場合は NOT_FOUND", async () => {
      prismaMock.content.findUnique.mockResolvedValue(null);
      await expect(service.update("c-1", { name: "new" }, memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("作成者本人なら更新できる", async () => {
      prismaMock.content.findUnique.mockResolvedValue(baseContent);
      prismaMock.content.update.mockResolvedValue({ ...baseContent, name: "new" });

      await service.update("c-1", { name: "new" }, memberUser);
      expect(prismaMock.content.update).toHaveBeenCalledWith({
        where: { id: "c-1" },
        data: { name: "new" },
      });
    });

    it("admin / owner なら他人のコンテンツでも更新できる", async () => {
      prismaMock.content.findUnique.mockResolvedValue(baseContent);
      prismaMock.content.update.mockResolvedValue(baseContent);

      await service.update("c-1", { name: "new" }, adminUser);
      expect(prismaMock.content.update).toHaveBeenCalled();
    });

    it("他人 (member) が更新しようとすると FORBIDDEN", async () => {
      prismaMock.content.findUnique.mockResolvedValue(baseContent);
      await expect(service.update("c-1", { name: "new" }, otherUser)).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
      expect(prismaMock.content.update).not.toHaveBeenCalled();
    });

    it("data の undefined フィールドは Prisma.update の data から除外される", async () => {
      prismaMock.content.findUnique.mockResolvedValue(baseContent);
      prismaMock.content.update.mockResolvedValue(baseContent);

      await service.update("c-1", { description: "desc" }, memberUser);
      expect(prismaMock.content.update).toHaveBeenCalledWith({
        where: { id: "c-1" },
        data: { description: "desc" },
      });
    });
  });

  // ============================================================================
  // remove: 削除
  // ============================================================================
  describe("remove: コンテンツ削除（論理削除）", () => {
    const memberUser = { id: "u-1", role: "member" };
    const otherUser = { id: "u-2", role: "member" };
    const baseContent = { id: "c-1", deletedAt: null, createdByUserId: "u-1" };

    it("存在しない場合は NOT_FOUND", async () => {
      prismaMock.content.findUnique.mockResolvedValue(null);
      await expect(service.remove("c-1", memberUser)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("作成者本人なら deletedAt を埋めて update する", async () => {
      prismaMock.content.findUnique.mockResolvedValue(baseContent);
      prismaMock.content.update.mockResolvedValue(baseContent);

      await service.remove("c-1", memberUser);
      expect(prismaMock.content.update).toHaveBeenCalledWith({
        where: { id: "c-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("他人 (member) が削除しようとすると FORBIDDEN", async () => {
      prismaMock.content.findUnique.mockResolvedValue(baseContent);
      await expect(service.remove("c-1", otherUser)).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
      });
      expect(prismaMock.content.update).not.toHaveBeenCalled();
    });
  });
});
