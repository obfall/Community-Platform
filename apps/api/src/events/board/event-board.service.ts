import { Injectable } from "@nestjs/common";
import { BoardCoreService } from "@/board/core/board-core.service";
import { EVENT_BOARD_SCOPE } from "@/board/core/board-scope.config";
import type { CreateCategoryDto } from "@/board/dto/create-category.dto";
import type { UpdateCategoryDto } from "@/board/dto/update-category.dto";
import type { CreateTopicDto } from "@/board/dto/create-topic.dto";
import type { UpdateTopicDto } from "@/board/dto/update-topic.dto";
import type { TopicQueryDto } from "@/board/dto/topic-query.dto";
import type { CreateTopicPostDto } from "@/board/dto/create-topic-post.dto";
import type { UpdateTopicPostDto } from "@/board/dto/update-topic-post.dto";
import type { CreateTopicPostCommentDto } from "@/board/dto/create-topic-post-comment.dto";
import type { UpdateTopicPostCommentDto } from "@/board/dto/update-topic-post-comment.dto";
import type { PaginationQueryDto } from "@/common/dto/pagination.dto";

@Injectable()
export class EventBoardService {
  constructor(private readonly core: BoardCoreService) {}

  // Categories
  findAllCategories(eventId: string) {
    return this.core.findAllCategories(EVENT_BOARD_SCOPE, eventId);
  }
  createCategory(eventId: string, userId: string, dto: CreateCategoryDto) {
    return this.core.createCategory(EVENT_BOARD_SCOPE, userId, dto, eventId);
  }
  updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.core.updateCategory(EVENT_BOARD_SCOPE, id, dto);
  }
  reorderCategories(items: { id: string; sortOrder: number }[]) {
    return this.core.reorderCategories(EVENT_BOARD_SCOPE, items);
  }
  softDeleteCategory(id: string) {
    return this.core.softDeleteCategory(EVENT_BOARD_SCOPE, id);
  }

  // Topics
  findAllTopics(eventId: string, userId: string, query: TopicQueryDto) {
    return this.core.findAllTopics(EVENT_BOARD_SCOPE, userId, query, eventId);
  }
  findOneTopic(userId: string, topicId: string) {
    return this.core.findOneTopic(EVENT_BOARD_SCOPE, userId, topicId);
  }
  createTopic(eventId: string, userId: string, dto: CreateTopicDto) {
    return this.core.createTopic(EVENT_BOARD_SCOPE, userId, dto, eventId);
  }
  updateTopic(userId: string, topicId: string, dto: UpdateTopicDto) {
    return this.core.updateTopic(EVENT_BOARD_SCOPE, userId, topicId, dto);
  }
  reorderTopics(items: { id: string; sortOrder: number }[]) {
    return this.core.reorderTopics(EVENT_BOARD_SCOPE, items);
  }
  softDeleteTopic(userId: string, topicId: string) {
    return this.core.softDeleteTopic(EVENT_BOARD_SCOPE, userId, topicId);
  }
  togglePin(topicId: string) {
    return this.core.toggleTopicPin(EVENT_BOARD_SCOPE, topicId);
  }

  // Topic Posts
  findAllTopicPosts(userId: string, topicId: string, query: PaginationQueryDto) {
    return this.core.findAllTopicPosts(EVENT_BOARD_SCOPE, userId, topicId, query);
  }
  createTopicPost(userId: string, topicId: string, dto: CreateTopicPostDto) {
    return this.core.createTopicPost(EVENT_BOARD_SCOPE, userId, topicId, dto);
  }
  updateTopicPost(userId: string, postId: string, dto: UpdateTopicPostDto) {
    return this.core.updateTopicPost(EVENT_BOARD_SCOPE, userId, postId, dto);
  }
  softDeleteTopicPost(userId: string, postId: string) {
    return this.core.softDeleteTopicPost(EVENT_BOARD_SCOPE, userId, postId);
  }

  // Topic Post Comments
  findAllTopicPostComments(userId: string, postId: string, query: PaginationQueryDto) {
    return this.core.findAllTopicPostComments(EVENT_BOARD_SCOPE, userId, postId, query);
  }
  createTopicPostComment(userId: string, postId: string, dto: CreateTopicPostCommentDto) {
    return this.core.createTopicPostComment(EVENT_BOARD_SCOPE, userId, postId, dto);
  }
  updateTopicPostComment(userId: string, commentId: string, dto: UpdateTopicPostCommentDto) {
    return this.core.updateTopicPostComment(EVENT_BOARD_SCOPE, userId, commentId, dto);
  }
  softDeleteTopicPostComment(userId: string, commentId: string) {
    return this.core.softDeleteTopicPostComment(EVENT_BOARD_SCOPE, userId, commentId);
  }

  // Likes
  toggleTopicLike(userId: string, topicId: string) {
    return this.core.toggleTopicLike(EVENT_BOARD_SCOPE, userId, topicId);
  }
  toggleTopicPostLike(userId: string, postId: string) {
    return this.core.toggleTopicPostLike(EVENT_BOARD_SCOPE, userId, postId);
  }
  toggleTopicPostCommentLike(userId: string, commentId: string) {
    return this.core.toggleTopicPostCommentLike(EVENT_BOARD_SCOPE, userId, commentId);
  }
}
