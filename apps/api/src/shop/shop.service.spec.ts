import { ShopService } from "./shop.service";

describe("ShopService", () => {
  let prismaMock: {
    product: { findMany: jest.Mock; count: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: ShopService;

  beforeEach(() => {
    prismaMock = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new ShopService(prismaMock as never, {} as never);
  });

  describe("findAllProducts: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAllProducts({});
      expect(prismaMock.product.findMany).toHaveBeenCalled();
      expect(prismaMock.product.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAllProducts({ search: "商品" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら通常一覧経路", async () => {
      await service.findAllProducts({ search: "+()[]" });
      expect(prismaMock.product.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
