import { BoardTopicsService } from "./board-topics.service";

describe("BoardTopicsService", () => {
  let prismaMock: {
    boardTopic: { findMany: jest.Mock };
    boardLike: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let coreMock: { findAllTopics: jest.Mock };
  let service: BoardTopicsService;

  beforeEach(() => {
    prismaMock = {
      boardTopic: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      boardLike: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    coreMock = {
      findAllTopics: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    };
    service = new BoardTopicsService(coreMock as never, prismaMock as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら BoardCoreService.findAllTopics に委譲", async () => {
      await service.findAll("user-1", {});
      expect(coreMock.findAllTopics).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll("user-1", { search: "投稿" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(coreMock.findAllTopics).not.toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧（core）経路", async () => {
      await service.findAll("user-1", { search: "+()[]{}" });
      expect(coreMock.findAllTopics).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
