import { UsersService } from "./users.service";

describe("UsersService", () => {
  let prismaMock: {
    user: { findMany: jest.Mock; count: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: UsersService;

  beforeEach(() => {
    prismaMock = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new UsersService(prismaMock as never, {} as never, {} as never);
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
});
