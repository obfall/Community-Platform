import { BoardTopicPostCommentsService } from "./board-topic-post-comments.service";
import { GLOBAL_BOARD_SCOPE } from "./core/board-scope.config";

describe("BoardTopicPostCommentsService", () => {
  let coreMock: {
    findAllTopicPostComments: jest.Mock;
    createTopicPostComment: jest.Mock;
    updateTopicPostComment: jest.Mock;
    softDeleteTopicPostComment: jest.Mock;
  };
  let service: BoardTopicPostCommentsService;

  beforeEach(() => {
    coreMock = {
      findAllTopicPostComments: jest.fn(),
      createTopicPostComment: jest.fn(),
      updateTopicPostComment: jest.fn(),
      softDeleteTopicPostComment: jest.fn(),
    };
    service = new BoardTopicPostCommentsService(coreMock as never);
  });

  describe("Global スコープで BoardCoreService に委譲する", () => {
    it("findAll は GLOBAL_BOARD_SCOPE を渡して findAllTopicPostComments を呼ぶ", async () => {
      await service.findAll("u-1", "p-1", { page: 1, limit: 20 });
      expect(coreMock.findAllTopicPostComments).toHaveBeenCalledWith(
        GLOBAL_BOARD_SCOPE,
        "u-1",
        "p-1",
        { page: 1, limit: 20 },
      );
    });

    it("create は dto を core に渡す", async () => {
      await service.create("u-1", "p-1", { body: "コメント" });
      expect(coreMock.createTopicPostComment).toHaveBeenCalledWith(
        GLOBAL_BOARD_SCOPE,
        "u-1",
        "p-1",
        { body: "コメント" },
      );
    });

    it("update は id と dto を core に渡す", async () => {
      await service.update("u-1", "c-1", { body: "更新後" });
      expect(coreMock.updateTopicPostComment).toHaveBeenCalledWith(
        GLOBAL_BOARD_SCOPE,
        "u-1",
        "c-1",
        { body: "更新後" },
      );
    });

    it("softDelete は id を core に渡す", async () => {
      await service.softDelete("u-1", "c-1");
      expect(coreMock.softDeleteTopicPostComment).toHaveBeenCalledWith(
        GLOBAL_BOARD_SCOPE,
        "u-1",
        "c-1",
      );
    });
  });
});
