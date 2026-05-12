import { BoardTopicPostsService } from "./board-topic-posts.service";
import { GLOBAL_BOARD_SCOPE } from "./core/board-scope.config";

describe("BoardTopicPostsService", () => {
  let coreMock: {
    findAllTopicPosts: jest.Mock;
    createTopicPost: jest.Mock;
    updateTopicPost: jest.Mock;
    softDeleteTopicPost: jest.Mock;
  };
  let service: BoardTopicPostsService;

  beforeEach(() => {
    coreMock = {
      findAllTopicPosts: jest.fn(),
      createTopicPost: jest.fn(),
      updateTopicPost: jest.fn(),
      softDeleteTopicPost: jest.fn(),
    };
    service = new BoardTopicPostsService(coreMock as never);
  });

  describe("Global スコープで BoardCoreService に委譲する", () => {
    it("findAll は GLOBAL_BOARD_SCOPE を渡して findAllTopicPosts を呼ぶ", async () => {
      await service.findAll("u-1", "t-1", { page: 1, limit: 20 });
      expect(coreMock.findAllTopicPosts).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE, "u-1", "t-1", {
        page: 1,
        limit: 20,
      });
    });

    it("create は dto を core に渡す", async () => {
      await service.create("u-1", "t-1", { body: "投稿" });
      expect(coreMock.createTopicPost).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE, "u-1", "t-1", {
        body: "投稿",
      });
    });

    it("update は id と dto を core に渡す", async () => {
      await service.update("u-1", "p-1", { body: "更新後" });
      expect(coreMock.updateTopicPost).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE, "u-1", "p-1", {
        body: "更新後",
      });
    });

    it("softDelete は id を core に渡す", async () => {
      await service.softDelete("u-1", "p-1");
      expect(coreMock.softDeleteTopicPost).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE, "u-1", "p-1");
    });
  });
});
