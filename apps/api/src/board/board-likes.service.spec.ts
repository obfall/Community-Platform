import { BoardLikesService } from "./board-likes.service";
import { GLOBAL_BOARD_SCOPE } from "./core/board-scope.config";

describe("BoardLikesService", () => {
  let coreMock: {
    toggleTopicLike: jest.Mock;
    toggleTopicPostLike: jest.Mock;
    toggleTopicPostCommentLike: jest.Mock;
  };
  let service: BoardLikesService;

  beforeEach(() => {
    coreMock = {
      toggleTopicLike: jest.fn(),
      toggleTopicPostLike: jest.fn(),
      toggleTopicPostCommentLike: jest.fn(),
    };
    service = new BoardLikesService(coreMock as never);
  });

  describe("Global スコープで BoardCoreService に委譲する", () => {
    it("toggleTopicLike は core.toggleTopicLike を呼ぶ", async () => {
      await service.toggleTopicLike("u-1", "t-1");
      expect(coreMock.toggleTopicLike).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE, "u-1", "t-1");
    });

    it("toggleTopicPostLike は core.toggleTopicPostLike を呼ぶ", async () => {
      await service.toggleTopicPostLike("u-1", "p-1");
      expect(coreMock.toggleTopicPostLike).toHaveBeenCalledWith(GLOBAL_BOARD_SCOPE, "u-1", "p-1");
    });

    it("toggleTopicPostCommentLike は core.toggleTopicPostCommentLike を呼ぶ", async () => {
      await service.toggleTopicPostCommentLike("u-1", "c-1");
      expect(coreMock.toggleTopicPostCommentLike).toHaveBeenCalledWith(
        GLOBAL_BOARD_SCOPE,
        "u-1",
        "c-1",
      );
    });
  });
});
