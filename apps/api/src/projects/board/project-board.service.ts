import { Injectable } from "@nestjs/common";
import { BoardCoreService } from "@/board/core/board-core.service";
import { PROJECT_BOARD_SCOPE } from "@/board/core/board-scope.config";
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
export class ProjectBoardService {
  constructor(private readonly core: BoardCoreService) {}

  // Categories
  findAllCategories(projectId: string) {
    return this.core.findAllCategories(PROJECT_BOARD_SCOPE, projectId);
  }
  createCategory(projectId: string, userId: string, dto: CreateCategoryDto) {
    return this.core.createCategory(PROJECT_BOARD_SCOPE, userId, dto, projectId);
  }
  updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.core.updateCategory(PROJECT_BOARD_SCOPE, id, dto);
  }
  reorderCategories(items: { id: string; sortOrder: number }[]) {
    return this.core.reorderCategories(PROJECT_BOARD_SCOPE, items);
  }
  softDeleteCategory(id: string) {
    return this.core.softDeleteCategory(PROJECT_BOARD_SCOPE, id);
  }

  // Topics
  findAllTopics(projectId: string, userId: string, query: TopicQueryDto) {
    return this.core.findAllTopics(PROJECT_BOARD_SCOPE, userId, query, projectId);
  }
  findOneTopic(userId: string, topicId: string) {
    return this.core.findOneTopic(PROJECT_BOARD_SCOPE, userId, topicId);
  }
  createTopic(projectId: string, userId: string, dto: CreateTopicDto) {
    return this.core.createTopic(PROJECT_BOARD_SCOPE, userId, dto, projectId);
  }
  updateTopic(userId: string, topicId: string, dto: UpdateTopicDto) {
    return this.core.updateTopic(PROJECT_BOARD_SCOPE, userId, topicId, dto);
  }
  reorderTopics(items: { id: string; sortOrder: number }[]) {
    return this.core.reorderTopics(PROJECT_BOARD_SCOPE, items);
  }
  softDeleteTopic(userId: string, topicId: string) {
    return this.core.softDeleteTopic(PROJECT_BOARD_SCOPE, userId, topicId);
  }
  togglePin(topicId: string) {
    return this.core.toggleTopicPin(PROJECT_BOARD_SCOPE, topicId);
  }

  // Topic Posts
  findAllTopicPosts(userId: string, topicId: string, query: PaginationQueryDto) {
    return this.core.findAllTopicPosts(PROJECT_BOARD_SCOPE, userId, topicId, query);
  }
  createTopicPost(userId: string, topicId: string, dto: CreateTopicPostDto) {
    return this.core.createTopicPost(PROJECT_BOARD_SCOPE, userId, topicId, dto);
  }
  updateTopicPost(userId: string, postId: string, dto: UpdateTopicPostDto) {
    return this.core.updateTopicPost(PROJECT_BOARD_SCOPE, userId, postId, dto);
  }
  softDeleteTopicPost(userId: string, postId: string) {
    return this.core.softDeleteTopicPost(PROJECT_BOARD_SCOPE, userId, postId);
  }

  // Topic Post Comments
  findAllTopicPostComments(userId: string, postId: string, query: PaginationQueryDto) {
    return this.core.findAllTopicPostComments(PROJECT_BOARD_SCOPE, userId, postId, query);
  }
  createTopicPostComment(userId: string, postId: string, dto: CreateTopicPostCommentDto) {
    return this.core.createTopicPostComment(PROJECT_BOARD_SCOPE, userId, postId, dto);
  }
  updateTopicPostComment(userId: string, commentId: string, dto: UpdateTopicPostCommentDto) {
    return this.core.updateTopicPostComment(PROJECT_BOARD_SCOPE, userId, commentId, dto);
  }
  softDeleteTopicPostComment(userId: string, commentId: string) {
    return this.core.softDeleteTopicPostComment(PROJECT_BOARD_SCOPE, userId, commentId);
  }

  // Likes
  toggleTopicLike(userId: string, topicId: string) {
    return this.core.toggleTopicLike(PROJECT_BOARD_SCOPE, userId, topicId);
  }
  toggleTopicPostLike(userId: string, postId: string) {
    return this.core.toggleTopicPostLike(PROJECT_BOARD_SCOPE, userId, postId);
  }
  toggleTopicPostCommentLike(userId: string, commentId: string) {
    return this.core.toggleTopicPostCommentLike(PROJECT_BOARD_SCOPE, userId, commentId);
  }
}
