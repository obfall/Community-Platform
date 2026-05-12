import { BoardCategoriesService } from "./board-categories.service";
import { GLOBAL_BOARD_SCOPE } from "./core/board-scope.config";

describe("BoardCategoriesService", () => {
  let coreMock: {
    findAllCategories: jest.Mock;
    createCategory: jest.Mock;
    updateCategory: jest.Mock;
    reorderCategories: jest.Mock;
    softDeleteCategory: jest.Mock;
  };
  let service: BoardCategoriesService;

  beforeEach(() => {
    coreMock = {
      findAllCategories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      reorderCategories: jest.fn(),
      softDeleteCategory: jest.fn(),
    };
    service = new BoardCategoriesService(coreMock as never);
  });

  describe("Global スコープで BoardCoreService に委譲する", () => {
    it("findAll は GLOBAL_BOARD_SCOPE を渡して findAllCategories を呼ぶ", async () => {
      await service.findAll();
      expect(coreMock.findAllCategories).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE);
    });

    it("create は userId と dto を core に渡す", async () => {
      const dto = { name: "お知らせ", allowTopicCreation: true };
      await service.create("u-1", dto);
      expect(coreMock.createCategory).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE, "u-1", dto);
    });

    it("update は id と dto を core に渡す", async () => {
      const dto = { name: "変更後" };
      await service.update("cat-1", dto);
      expect(coreMock.updateCategory).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE, "cat-1", dto);
    });

    it("reorder は items 配列を core に渡す", async () => {
      const items = [{ id: "cat-1", sortOrder: 0 }];
      await service.reorder(items);
      expect(coreMock.reorderCategories).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE, items);
    });

    it("softDelete は id を core に渡す", async () => {
      await service.softDelete("cat-1");
      expect(coreMock.softDeleteCategory).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE, "cat-1");
    });
  });
});
