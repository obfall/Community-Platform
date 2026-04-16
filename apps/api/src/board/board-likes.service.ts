import { Injectable } from "@nestjs/common";
import { BoardCoreService } from "./core/board-core.service";
import { GLOBAL_BOARD_SCOPE } from "./core/board-scope.config";

@Injectable()
export class BoardLikesService {
  constructor(private readonly core: BoardCoreService) {}

  toggleTopicLike(userId: string, topicId: string) {
    return this.core.toggleTopicLike(GLOBAL_BOARD_SCOPE, userId, topicId);
  }

  toggleTopicPostLike(userId: string, postId: string) {
    return this.core.toggleTopicPostLike(GLOBAL_BOARD_SCOPE, userId, postId);
  }

  toggleTopicPostCommentLike(userId: string, commentId: string) {
    return this.core.toggleTopicPostCommentLike(GLOBAL_BOARD_SCOPE, userId, commentId);
  }
}
