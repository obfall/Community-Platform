import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ProjectBoardService } from "./project-board.service";
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  ReorderItemsDto,
  CreateTopicDto,
  UpdateTopicDto,
  TopicQueryDto,
  CreateTopicPostDto,
  UpdateTopicPostDto,
  CreateTopicPostCommentDto,
  UpdateTopicPostCommentDto,
} from "@/board/dto";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";
import { CurrentUser, FeatureEnabled } from "@/common/decorators";
import { FeatureEnabledGuard } from "@/common/guards";

@ApiTags("project-board")
@ApiBearerAuth()
@FeatureEnabled("board")
@UseGuards(FeatureEnabledGuard)
@Controller("projects/:projectId/board")
export class ProjectBoardController {
  constructor(private readonly service: ProjectBoardService) {}

  // ========== Categories ==========

  @Get("categories")
  @ApiOperation({ summary: "プロジェクト掲示板 カテゴリ一覧" })
  findAllCategories(@Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.service.findAllCategories(projectId);
  }

  @Post("categories")
  @ApiOperation({ summary: "プロジェクト掲示板 カテゴリ作成" })
  createCategory(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.createCategory(projectId, userId, dto);
  }

  @Patch("categories/reorder")
  @ApiOperation({ summary: "プロジェクト掲示板 カテゴリ並び替え" })
  reorderCategories(@Body() dto: ReorderItemsDto) {
    return this.service.reorderCategories(dto.items);
  }

  @Patch("categories/:id")
  @ApiOperation({ summary: "プロジェクト掲示板 カテゴリ更新" })
  updateCategory(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete("categories/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "プロジェクト掲示板 カテゴリ削除" })
  removeCategory(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.softDeleteCategory(id);
  }

  // ========== Topics ==========

  @Get("topics")
  @ApiOperation({ summary: "プロジェクト掲示板 トピック一覧" })
  findAllTopics(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @CurrentUser("id") userId: string,
    @Query() query: TopicQueryDto,
  ) {
    return this.service.findAllTopics(projectId, userId, query);
  }

  @Get("topics/:id")
  @ApiOperation({ summary: "プロジェクト掲示板 トピック詳細" })
  findOneTopic(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOneTopic(userId, id);
  }

  @Post("topics")
  @ApiOperation({ summary: "プロジェクト掲示板 トピック作成" })
  createTopic(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateTopicDto,
  ) {
    return this.service.createTopic(projectId, userId, dto);
  }

  @Patch("topics/reorder")
  @ApiOperation({ summary: "プロジェクト掲示板 トピック並び替え" })
  reorderTopics(@Body() dto: ReorderItemsDto) {
    return this.service.reorderTopics(dto.items);
  }

  @Patch("topics/:id")
  @ApiOperation({ summary: "プロジェクト掲示板 トピック更新" })
  updateTopic(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTopicDto,
  ) {
    return this.service.updateTopic(userId, id, dto);
  }

  @Delete("topics/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "プロジェクト掲示板 トピック削除" })
  removeTopic(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.softDeleteTopic(userId, id);
  }

  @Post("topics/:id/like")
  @ApiOperation({ summary: "プロジェクト掲示板 トピックいいね" })
  toggleTopicLike(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.toggleTopicLike(userId, id);
  }

  @Post("topics/:id/pin")
  @ApiOperation({ summary: "プロジェクト掲示板 トピックピン留め切替" })
  togglePin(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.togglePin(id);
  }

  // ========== Topic Posts ==========

  @Get("topics/:topicId/posts")
  @ApiOperation({ summary: "プロジェクト掲示板 トピック内投稿一覧" })
  findAllTopicPosts(
    @CurrentUser("id") userId: string,
    @Param("topicId", ParseUUIDPipe) topicId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.findAllTopicPosts(userId, topicId, query);
  }

  @Post("topics/:topicId/posts")
  @ApiOperation({ summary: "プロジェクト掲示板 トピック内投稿作成" })
  createTopicPost(
    @CurrentUser("id") userId: string,
    @Param("topicId", ParseUUIDPipe) topicId: string,
    @Body() dto: CreateTopicPostDto,
  ) {
    return this.service.createTopicPost(userId, topicId, dto);
  }

  @Patch("topic-posts/:id")
  @ApiOperation({ summary: "プロジェクト掲示板 トピック内投稿更新" })
  updateTopicPost(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTopicPostDto,
  ) {
    return this.service.updateTopicPost(userId, id, dto);
  }

  @Delete("topic-posts/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "プロジェクト掲示板 トピック内投稿削除" })
  removeTopicPost(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.softDeleteTopicPost(userId, id);
  }

  @Post("topic-posts/:id/like")
  @ApiOperation({ summary: "プロジェクト掲示板 トピック内投稿いいね" })
  toggleTopicPostLike(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.toggleTopicPostLike(userId, id);
  }

  // ========== Topic Post Comments ==========

  @Get("topic-posts/:postId/comments")
  @ApiOperation({ summary: "プロジェクト掲示板 コメント一覧" })
  findAllTopicPostComments(
    @CurrentUser("id") userId: string,
    @Param("postId", ParseUUIDPipe) postId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.findAllTopicPostComments(userId, postId, query);
  }

  @Post("topic-posts/:postId/comments")
  @ApiOperation({ summary: "プロジェクト掲示板 コメント作成" })
  createTopicPostComment(
    @CurrentUser("id") userId: string,
    @Param("postId", ParseUUIDPipe) postId: string,
    @Body() dto: CreateTopicPostCommentDto,
  ) {
    return this.service.createTopicPostComment(userId, postId, dto);
  }

  @Patch("topic-post-comments/:id")
  @ApiOperation({ summary: "プロジェクト掲示板 コメント更新" })
  updateTopicPostComment(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTopicPostCommentDto,
  ) {
    return this.service.updateTopicPostComment(userId, id, dto);
  }

  @Delete("topic-post-comments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "プロジェクト掲示板 コメント削除" })
  removeTopicPostComment(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.softDeleteTopicPostComment(userId, id);
  }

  @Post("topic-post-comments/:id/like")
  @ApiOperation({ summary: "プロジェクト掲示板 コメントいいね" })
  toggleTopicPostCommentLike(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.toggleTopicPostCommentLike(userId, id);
  }
}
