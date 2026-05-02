import { FaqService } from "./faq.service";

describe("FaqService", () => {
  let prismaMock: {
    faqArticle: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: FaqService;

  beforeEach(() => {
    prismaMock = {
      faqArticle: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new FaqService(prismaMock as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany）が呼ばれる", async () => {
      await service.findAll({});
      expect(prismaMock.faqArticle.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "ヘルプ" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("category と search 両方ありなら pgroonga 経路（category は WHERE に含まれる）", async () => {
      await service.findAll({ category: "general", search: "ヘルプ" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" });
      expect(prismaMock.faqArticle.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
