import { ContentsService } from "./contents.service";

describe("ContentsService", () => {
  let prismaMock: {
    content: { findMany: jest.Mock; count: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: ContentsService;

  beforeEach(() => {
    prismaMock = {
      content: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new ContentsService(prismaMock as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({});
      expect(prismaMock.content.findMany).toHaveBeenCalled();
      expect(prismaMock.content.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "コンテンツ" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" });
      expect(prismaMock.content.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

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
          inviteToken: "tok",
          publishStatus: "published",
          createdBy: { id: "u", name: "creator" },
          createdAt: new Date(),
        },
      ]);
      const result = await service.findAll({ search: "名前" });
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
    });
  });
});
