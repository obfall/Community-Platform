import { ConflictException, ForbiddenException } from "@nestjs/common";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  let prismaMock: {
    user: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    userProfile: { upsert: jest.Mock };
    userPublicInfo: { upsert: jest.Mock };
    userInterest: { deleteMany: jest.Mock; createMany: jest.Mock; findMany: jest.Mock };
    userLanguage: { deleteMany: jest.Mock; createMany: jest.Mock; findMany: jest.Mock };
    userAffiliation: { deleteMany: jest.Mock; createMany: jest.Mock; findMany: jest.Mock };
    refreshToken: { updateMany: jest.Mock };
    category: { findMany: jest.Mock };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };
  let authMock: { issuePasswordResetForUser: jest.Mock };
  let emailMock: { sendEmailChangeNotification: jest.Mock };
  let service: UsersService;

  beforeEach(() => {
    prismaMock = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      userProfile: { upsert: jest.fn() },
      userPublicInfo: { upsert: jest.fn() },
      userInterest: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      userLanguage: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      userAffiliation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      category: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (ops) => Promise.all(ops)),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    authMock = { issuePasswordResetForUser: jest.fn().mockResolvedValue(undefined) };
    emailMock = { sendEmailChangeNotification: jest.fn() };
    service = new UsersService(prismaMock as never, authMock as never, emailMock as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({});
      expect(prismaMock.user.findMany).toHaveBeenCalled();
      expect(prismaMock.user.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw, UNION 検索）が呼ばれる", async () => {
      await service.findAll({ search: "田中" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" });
      expect(prismaMock.user.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("findAll: pgroonga 検索の SQL に DTO フィルタが乗る", () => {
    it("status を渡すと SQL の values に UserStatus 値が含まれる", async () => {
      // matched クエリ → totalRows クエリの順で 2 回呼ばれる
      prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ count: 0n }]);
      await service.findAll({ search: "田中", status: "active" });
      const matchedCall = prismaMock.$queryRaw.mock.calls[0]?.[0];
      expect(matchedCall.values).toContain("active");
    });

    it("role を渡すと SQL の values に UserRole 値が含まれる", async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ count: 0n }]);
      await service.findAll({ search: "田中", role: "admin" });
      const matchedCall = prismaMock.$queryRaw.mock.calls[0]?.[0];
      expect(matchedCall.values).toContain("admin");
    });
  });

  describe("findAll: matched 0 件の早期 return", () => {
    it("matched が空なら user.findMany や highlight クエリは呼ばれず、空 data + total 0 を返す", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([]) // matched
        .mockResolvedValueOnce([{ count: 0n }]); // totalRows
      const result = await service.findAll({ search: "存在しない" });
      // highlight クエリ（3 回目の $queryRaw）も user.findMany も呼ばれない
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("findAll: 整形後の shape にハイライト key が含まれる", () => {
    it("matched + highlight があれば data に titleHighlighted が乗る", async () => {
      const userId = "11111111-1111-1111-1111-111111111111";
      prismaMock.$queryRaw
        .mockResolvedValueOnce([{ id: userId, score: 5 }]) // matched
        .mockResolvedValueOnce([{ count: 1n }]) // totalRows
        .mockResolvedValueOnce([{ id: userId, title_highlighted: "<span>田中</span>" }]); // highlights
      prismaMock.user.findMany.mockResolvedValueOnce([
        {
          id: userId,
          email: "tanaka@example.com",
          name: "田中",
          role: "member",
          status: "active",
          createdAt: new Date(),
          profile: null,
        },
      ]);
      const result = await service.findAll({ search: "田中" });
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: userId,
          name: "田中",
          titleHighlighted: "<span>田中</span>",
        }),
      );
    });
  });

  describe("findInterestCategories: 興味分野カテゴリ一覧", () => {
    it("scope=user_interest かつ isActive=true で絞り込み、sortOrder 昇順で取得する", async () => {
      const sample = [
        { id: "c1", name: "技術", slug: "tech" },
        { id: "c2", name: "音楽", slug: "music" },
      ];
      prismaMock.category.findMany.mockResolvedValueOnce(sample);

      const result = await service.findInterestCategories();

      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { scope: "user_interest", isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true },
      });
      expect(result).toEqual(sample);
    });
  });

  describe("replaceInterests: 興味分野一括設定", () => {
    it("トランザクション内で deleteMany → createMany が組まれ、最後に findMany で返却", async () => {
      const userId = "22222222-2222-2222-2222-222222222222";
      // ensureUserExists 経由で findUnique が呼ばれる想定
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: userId });
      prismaMock.userInterest.findMany.mockResolvedValueOnce([
        { id: "i1", categoryId: "c1", category: { name: "技術" } },
      ]);

      const result = await service.replaceInterests(userId, { categoryIds: ["c1", "c2"] });

      // $transaction が deleteMany + createMany 2 ops で呼ばれる
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.userInterest.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(prismaMock.userInterest.createMany).toHaveBeenCalledWith({
        data: [
          { userId, categoryId: "c1" },
          { userId, categoryId: "c2" },
        ],
      });
      expect(result).toHaveLength(1);
    });

    it("空配列を渡すと全削除のみ（create は空）", async () => {
      const userId = "22222222-2222-2222-2222-222222222222";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: userId });
      prismaMock.userInterest.findMany.mockResolvedValueOnce([]);

      await service.replaceInterests(userId, { categoryIds: [] });

      expect(prismaMock.userInterest.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(prismaMock.userInterest.createMany).toHaveBeenCalledWith({ data: [] });
    });
  });

  describe("updateProfile: プロフィール更新", () => {
    it("通常のフィールドはそのまま upsert に渡される", async () => {
      const userId = "33333333-3333-3333-3333-333333333333";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: userId });
      prismaMock.userProfile.upsert.mockResolvedValueOnce({});

      await service.updateProfile(userId, { nameKana: "ヤマダ", occupation: "engineer" });

      expect(prismaMock.userProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          update: expect.objectContaining({ nameKana: "ヤマダ", occupation: "engineer" }),
        }),
      );
    });

    it("birthday は Date に変換されて保存される", async () => {
      const userId = "33333333-3333-3333-3333-333333333333";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: userId });
      prismaMock.userProfile.upsert.mockResolvedValueOnce({});

      await service.updateProfile(userId, { birthday: "1990-01-15" });

      const call = prismaMock.userProfile.upsert.mock.calls[0]?.[0];
      expect(call.update.birthday).toBeInstanceOf(Date);
      expect(call.update.birthday.getUTCFullYear()).toBe(1990);
    });
  });

  describe("updatePublicInfo: 公開情報更新", () => {
    it("dto がそのまま upsert に渡される", async () => {
      const userId = "33333333-3333-3333-3333-333333333333";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: userId });
      prismaMock.userPublicInfo.upsert.mockResolvedValueOnce({});

      await service.updatePublicInfo(userId, {
        nickname: "やまけん",
        publicStatus: "public",
      } as never);

      expect(prismaMock.userPublicInfo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          update: expect.objectContaining({ nickname: "やまけん", publicStatus: "public" }),
        }),
      );
    });
  });

  describe("validateAdminAction: 自分自身禁止 / owner→admin 操作禁止", () => {
    it("自分自身を対象にすると ForbiddenException", async () => {
      await expect(
        service.updateRole(
          "11111111-1111-1111-1111-111111111111",
          { id: "11111111-1111-1111-1111-111111111111", role: "admin" },
          { role: "member" } as never,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("owner が admin を操作すると ForbiddenException", async () => {
      const targetUserId = "22222222-2222-2222-2222-222222222222";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: targetUserId, role: "admin" });

      await expect(
        service.updateRole(targetUserId, { id: "owner-id", role: "owner" }, {
          role: "member",
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("updateRole: 昇格制限", () => {
    it("owner が他者を admin に昇格させようとすると ForbiddenException", async () => {
      const targetUserId = "44444444-4444-4444-4444-444444444444";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: targetUserId, role: "member" });

      await expect(
        service.updateRole(targetUserId, { id: "owner-id", role: "owner" }, {
          role: "admin",
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("admin が他者を member→owner に変更できる", async () => {
      const targetUserId = "44444444-4444-4444-4444-444444444444";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: targetUserId, role: "member" });
      prismaMock.user.update.mockResolvedValueOnce({ id: targetUserId, role: "owner" });

      await service.updateRole(targetUserId, { id: "admin-id", role: "admin" }, {
        role: "owner",
      } as never);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: "owner" } }),
      );
    });
  });

  describe("updateStatus: ステータス変更", () => {
    it("validateAdminAction を通った後 user.update を呼ぶ", async () => {
      const targetUserId = "55555555-5555-5555-5555-555555555555";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: targetUserId, role: "member" });
      prismaMock.user.update.mockResolvedValueOnce({ id: targetUserId, status: "suspended" });

      await service.updateStatus(targetUserId, { id: "admin-id", role: "admin" }, {
        status: "suspended",
      } as never);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "suspended" } }),
      );
    });
  });

  describe("forcePasswordReset: 管理者によるパスワードリセット", () => {
    it("authService.issuePasswordResetForUser に委譲される", async () => {
      const targetUserId = "66666666-6666-6666-6666-666666666666";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: targetUserId, role: "member" });

      const result = await service.forcePasswordReset(targetUserId, {
        id: "admin-id",
        role: "admin",
      });

      expect(authMock.issuePasswordResetForUser).toHaveBeenCalledWith(targetUserId);
      expect(result).toEqual({ success: true });
    });
  });

  describe("updateEmail: メールアドレス変更", () => {
    const targetUserId = "77777777-7777-7777-7777-777777777777";

    function setupCommonMocks(currentEmail = "old@example.com") {
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: targetUserId, role: "member" }); // validateAdminAction
      prismaMock.user.findUniqueOrThrow.mockResolvedValueOnce({ email: currentEmail });
    }

    it("変更先メールが既存ユーザーと衝突したら ConflictException", async () => {
      setupCommonMocks();
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: "other-user" }); // existing check

      await expect(
        service.updateEmail(targetUserId, { id: "admin-id", role: "admin" }, {
          email: "new@example.com",
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("現在のメールと同じならスキップ（findOne 経路にすぐ流れる）", async () => {
      setupCommonMocks("same@example.com");
      // findOne 内の findUnique 呼び出し用
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: targetUserId,
        email: "same@example.com",
        name: "x",
        role: "member",
        status: "active",
        createdAt: new Date(),
        profile: null,
        publicInfo: null,
        interests: [],
        languages: [],
        affiliations: [],
      });

      await service.updateEmail(targetUserId, { id: "admin-id", role: "admin" }, {
        email: "same@example.com",
      } as never);

      // 更新は走らない
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it("通常変更時にトランザクション内で email 更新 + refreshToken 無効化が組まれる", async () => {
      setupCommonMocks();
      // existing check で重複なし
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      // findOne 末尾用
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: targetUserId,
        email: "new@example.com",
        name: "x",
        role: "member",
        status: "active",
        createdAt: new Date(),
        profile: null,
        publicInfo: null,
        interests: [],
        languages: [],
        affiliations: [],
      });

      await service.updateEmail(targetUserId, { id: "admin-id", role: "admin" }, {
        email: "new@example.com",
      } as never);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      // セッション無効化（refreshToken の updateMany）が同一トランザクション内に組まれる
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: targetUserId, revokedAt: null },
          data: { revokedAt: expect.any(Date) },
        }),
      );
      // 通知メールが旧アドレス・新アドレス両方に送信
      expect(emailMock.sendEmailChangeNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe("replaceLanguages: 言語一括設定", () => {
    it("トランザクション内で deleteMany → createMany が組まれる", async () => {
      const userId = "88888888-8888-8888-8888-888888888888";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: userId });

      await service.replaceLanguages(userId, {
        languages: [
          { languageCode: "ja", proficiency: "native" },
          { languageCode: "en", proficiency: "advanced" },
        ],
      } as never);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.userLanguage.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(prismaMock.userLanguage.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({ userId, languageCode: "ja", sortOrder: 0 }),
            expect.objectContaining({ userId, languageCode: "en", sortOrder: 1 }),
          ],
        }),
      );
    });
  });

  describe("replaceAffiliations: 所属一括設定", () => {
    it("トランザクション内で deleteMany → createMany が組まれる", async () => {
      const userId = "99999999-9999-9999-9999-999999999999";
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: userId });

      await service.replaceAffiliations(userId, {
        affiliations: [{ organizationName: "Acme", title: "Engineer", roleDescription: "Backend" }],
      } as never);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.userAffiliation.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(prismaMock.userAffiliation.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              userId,
              organizationName: "Acme",
              title: "Engineer",
              sortOrder: 0,
            }),
          ],
        }),
      );
    });
  });
});
