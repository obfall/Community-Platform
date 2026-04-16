import { Injectable } from "@nestjs/common";
import { BoardCoreService } from "./core/board-core.service";
import { GLOBAL_BOARD_SCOPE } from "./core/board-scope.config";
import type { CreateTopicDto } from "./dto/create-topic.dto";
import type { UpdateTopicDto } from "./dto/update-topic.dto";
import type { TopicQueryDto } from "./dto/topic-query.dto";

@Injectable()
export class BoardTopicsService {
  constructor(private readonly core: BoardCoreService) {}

  findAll(userId: string, query: TopicQueryDto) {
    return this.core.findAllTopics(GLOBAL_BOARD_SCOPE, userId, query);
  }

  findOne(userId: string, topicId: string) {
    return this.core.findOneTopic(GLOBAL_BOARD_SCOPE, userId, topicId);
  }

  create(userId: string, dto: CreateTopicDto) {
    return this.core.createTopic(GLOBAL_BOARD_SCOPE, userId, dto);
  }

  update(userId: string, topicId: string, dto: UpdateTopicDto) {
    return this.core.updateTopic(GLOBAL_BOARD_SCOPE, userId, topicId, dto);
  }

  reorder(items: { id: string; sortOrder: number }[]) {
    return this.core.reorderTopics(GLOBAL_BOARD_SCOPE, items);
  }

  softDelete(userId: string, topicId: string) {
    return this.core.softDeleteTopic(GLOBAL_BOARD_SCOPE, userId, topicId);
  }

  togglePin(topicId: string) {
    return this.core.toggleTopicPin(GLOBAL_BOARD_SCOPE, topicId);
  }
}
