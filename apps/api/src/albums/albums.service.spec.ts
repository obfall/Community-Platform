import { AlbumsService } from "./albums.service";

describe("AlbumsService", () => {
  let prismaMock: {
    album: { findMany: jest.Mock; count: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: AlbumsService;

  beforeEach(() => {
    prismaMock = {
      album: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new AlbumsService(prismaMock as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({});
      expect(prismaMock.album.findMany).toHaveBeenCalled();
      expect(prismaMock.album.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "写真" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" });
      expect(prismaMock.album.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
