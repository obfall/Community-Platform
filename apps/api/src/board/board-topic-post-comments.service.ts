import { Injectable } from "@nestjs/common";
import { BoardCoreService } from "./core/board-core.service";
import { GLOBAL_BOARD_SCOPE } from "./core/board-scope.config";
import type { CreateTopicPostCommentDto } from "./dto/create-topic-post-comment.dto";
import type { UpdateTopicPostCommentDto } from "./dto/update-topic-post-comment.dto";
import type { PaginationQueryDto } from "@/common/dto/pagination.dto";

@Injectable()
export class BoardTopicPostCommentsService {
  constructor(private readonly core: BoardCoreService) {}

  findAll(userId: string, postId: string, query: PaginationQueryDto) {
    return this.core.findAllTopicPostComments(GLOBAL_BOARD_SCOPE, userId, postId, query);
  }

  create(userId: string, postId: string, dto: CreateTopicPostCommentDto) {
    return this.core.createTopicPostComment(GLOBAL_BOARD_SCOPE, userId, postId, dto);
  }

  update(userId: string, commentId: string, dto: UpdateTopicPostCommentDto) {
    return this.core.updateTopicPostComment(GLOBAL_BOARD_SCOPE, userId, commentId, dto);
  }

  softDelete(userId: string, commentId: string) {
    return this.core.softDeleteTopicPostComment(GLOBAL_BOARD_SCOPE, userId, commentId);
  }
}
