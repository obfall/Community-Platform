jest.mock("@nestjs/bullmq", () => ({
  InjectQueue: () => () => undefined,
}));

import { EventsService } from "./events.service";

describe("EventsService", () => {
  let prismaMock: {
    event: { findMany: jest.Mock; count: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: EventsService;

  beforeEach(() => {
    prismaMock = {
      event: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new EventsService(prismaMock as never, {} as never);
  });

  describe("findAll: search の有無で経路が分岐する", () => {
    it("search 未指定なら通常一覧経路（findMany + count）が呼ばれる", async () => {
      await service.findAll({});
      expect(prismaMock.event.findMany).toHaveBeenCalled();
      expect(prismaMock.event.count).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search 空文字なら通常一覧経路に dispatch される", async () => {
      await service.findAll({ search: "" });
      expect(prismaMock.event.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });

    it("search にキーワードがあれば pgroonga 経路（$queryRaw）が呼ばれる", async () => {
      await service.findAll({ search: "勉強会" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("search が pgroonga 構文記号のみなら（エスケープ後空文字）通常一覧経路", async () => {
      await service.findAll({ search: "+()[]{}" });
      expect(prismaMock.event.findMany).toHaveBeenCalled();
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
