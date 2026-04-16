import { Injectable } from "@nestjs/common";
import { BoardCoreService } from "./core/board-core.service";
import { GLOBAL_BOARD_SCOPE } from "./core/board-scope.config";
import type { CreateTopicPostDto } from "./dto/create-topic-post.dto";
import type { UpdateTopicPostDto } from "./dto/update-topic-post.dto";
import type { PaginationQueryDto } from "@/common/dto/pagination.dto";

@Injectable()
export class BoardTopicPostsService {
  constructor(private readonly core: BoardCoreService) {}

  findAll(userId: string, topicId: string, query: PaginationQueryDto) {
    return this.core.findAllTopicPosts(GLOBAL_BOARD_SCOPE, userId, topicId, query);
  }

  create(userId: string, topicId: string, dto: CreateTopicPostDto) {
    return this.core.createTopicPost(GLOBAL_BOARD_SCOPE, userId, topicId, dto);
  }

  update(userId: string, postId: string, dto: UpdateTopicPostDto) {
    return this.core.updateTopicPost(GLOBAL_BOARD_SCOPE, userId, postId, dto);
  }

  softDelete(userId: string, postId: string) {
    return this.core.softDeleteTopicPost(GLOBAL_BOARD_SCOPE, userId, postId);
  }
}
