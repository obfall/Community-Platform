import { VenuesService } from "./venues.service";

describe("VenuesService", () => {
  let prismaMock: {
    venue: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: VenuesService;

  beforeEach(() => {
    prismaMock = {
      venue: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new VenuesService(prismaMock as never);
  });

  describe("findAllVenues: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany）が呼ばれる", async () => {
      await service.findAllVenues({});
      expect(prismaMock.venue.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAllVenues({ search: "会議室" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAllVenues({ search: "+()[]{}" });
      expect(prismaMock.venue.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("findAllVenues: 検索ヒット時の整形後 shape", () => {
    it("配列の各要素に titleHighlighted / snippetHighlighted が付与される", async () => {
      const id = "33333333-3333-3333-3333-333333333333";
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id,
            score: 1,
            titleHighlighted: "<span>会場</span>",
            snippetHighlighted: "<span>説明</span>",
          },
        ])
        .mockResolvedValueOnce([{ count: 1n }]);
      prismaMock.venue.findMany.mockResolvedValueOnce([
        {
          id,
          name: "会場",
          description: "説明",
          publishStatus: "published",
          _count: { spaces: 0 },
          images: [],
        },
      ]);
      const result = (await service.findAllVenues({ search: "会場" })) as Array<{
        id: string;
        titleHighlighted?: string;
        snippetHighlighted?: string;
      }>;
      expect(result[0]).toEqual(
        expect.objectContaining({
          id,
          titleHighlighted: "<span>会場</span>",
          snippetHighlighted: "<span>説明</span>",
        }),
      );
    });
  });
});
