import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto, ProjectQueryDto } from "./dto";

@Controller("projects")
@ApiTags("Projects")
@ApiBearerAuth()
@FeatureEnabled("project")
@UseGuards(FeatureEnabledGuard)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: "プロジェクト一覧" })
  findAll(@Query() query: ProjectQueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "プロジェクト詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "プロジェクト作成" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateProjectDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "プロジェクト更新" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateProjectDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "プロジェクト削除" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  // ========== Members ==========

  @Post("join/:token")
  @ApiOperation({ summary: "招待トークンで参加" })
  joinByToken(@Param("token") token: string, @CurrentUser("id") userId: string) {
    return this.service.joinByToken(token, userId);
  }

  @Post(":id/members/:userId")
  @ApiOperation({ summary: "メンバー追加" })
  addMember(
    @Param("id", ParseUUIDPipe) projectId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.service.addMember(projectId, userId);
  }

  @Delete(":id/members/:userId")
  @ApiOperation({ summary: "メンバー削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param("id", ParseUUIDPipe) projectId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.service.removeMember(projectId, userId);
  }

  // ========== Messages (Threads) ==========

  @Get(":id/threads")
  @ApiOperation({ summary: "メッセージ一覧" })
  getThreads(@Param("id", ParseUUIDPipe) projectId: string, @Query() query: PaginationQueryDto) {
    return this.service.getThreads(projectId, query);
  }

  @Post(":id/threads")
  @ApiOperation({ summary: "メッセージ作成" })
  createThread(
    @Param("id", ParseUUIDPipe) projectId: string,
    @CurrentUser("id") userId: string,
    @Body("title") title: string,
  ) {
    return this.service.createThread(projectId, userId, title);
  }

  // ========== Replies ==========

  @Get("threads/:threadId/replies")
  @ApiOperation({ summary: "返信一覧" })
  getReplies(@Param("threadId", ParseUUIDPipe) threadId: string) {
    return this.service.getReplies(threadId);
  }

  @Post("threads/:threadId/replies")
  @ApiOperation({ summary: "返信作成" })
  createReply(
    @Param("threadId", ParseUUIDPipe) threadId: string,
    @CurrentUser("id") userId: string,
    @Body("body") body: string,
  ) {
    return this.service.createReply(threadId, userId, body);
  }

  // ========== Likes ==========

  @Post("threads/:threadId/like")
  @ApiOperation({ summary: "メッセージいいね切替" })
  toggleThreadLike(
    @Param("threadId", ParseUUIDPipe) threadId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.toggleThreadLike(threadId, userId);
  }

  @Post("replies/:replyId/like")
  @ApiOperation({ summary: "返信いいね切替" })
  toggleReplyLike(
    @Param("replyId", ParseUUIDPipe) replyId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.toggleReplyLike(replyId, userId);
  }

  // ========== Tasks ==========

  @Get(":id/tasks")
  @ApiOperation({ summary: "タスク一覧" })
  getTasks(@Param("id", ParseUUIDPipe) projectId: string) {
    return this.service.getTasks(projectId);
  }

  @Post(":id/tasks")
  @ApiOperation({ summary: "タスク作成" })
  createTask(
    @Param("id", ParseUUIDPipe) projectId: string,
    @CurrentUser("id") userId: string,
    @Body() data: { title: string; description?: string; dueDate?: string; requestedDate?: string },
  ) {
    return this.service.createTask(projectId, userId, data);
  }

  @Patch("tasks/:taskId")
  @ApiOperation({ summary: "タスク更新" })
  updateTask(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() data: { title?: string; description?: string; progress?: number; dueDate?: string },
  ) {
    return this.service.updateTask(taskId, data);
  }

  // ========== Board ==========

  @Get(":id/board")
  @ApiOperation({ summary: "掲示板投稿一覧" })
  getBoardPosts(@Param("id", ParseUUIDPipe) projectId: string, @Query() query: PaginationQueryDto) {
    return this.service.getBoardPosts(projectId, query);
  }

  @Post(":id/board")
  @ApiOperation({ summary: "掲示板投稿作成" })
  createBoardPost(
    @Param("id", ParseUUIDPipe) projectId: string,
    @CurrentUser("id") userId: string,
    @Body() data: { title: string; body: string },
  ) {
    return this.service.createBoardPost(projectId, userId, data);
  }

  @Get("board/:postId/comments")
  @ApiOperation({ summary: "掲示板コメント一覧" })
  getBoardComments(@Param("postId", ParseUUIDPipe) postId: string) {
    return this.service.getBoardComments(postId);
  }

  @Post("board/:postId/comments")
  @ApiOperation({ summary: "掲示板コメント作成" })
  createBoardComment(
    @Param("postId", ParseUUIDPipe) postId: string,
    @CurrentUser("id") userId: string,
    @Body("body") body: string,
  ) {
    return this.service.createBoardComment(postId, userId, body);
  }
}
