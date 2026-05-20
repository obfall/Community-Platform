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
import type { UserRole } from "@prisma/client";
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
  findAll(
    @Query() query: ProjectQueryDto,
    @CurrentUser("role") role: UserRole,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.findAll(query, role, userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "プロジェクト詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "プロジェクト作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateProjectDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "プロジェクト更新" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser("id") actorId: string,
    @CurrentUser("role") actorRole: UserRole,
  ) {
    return this.service.update(id, dto, actorId, actorRole);
  }

  @Delete(":id")
  @ApiOperation({ summary: "プロジェクト削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") actorId: string,
    @CurrentUser("role") actorRole: UserRole,
  ) {
    return this.service.remove(id, actorId, actorRole);
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
    @CurrentUser("id") actorId: string,
    @CurrentUser("role") actorRole: UserRole,
    @Body() body: { role?: "admin" | "member" } = {},
  ) {
    return this.service.addMember(projectId, userId, body.role, actorId, actorRole);
  }

  @Patch(":id/members/:userId/role")
  @ApiOperation({ summary: "メンバーのロール変更" })
  updateMemberRole(
    @Param("id", ParseUUIDPipe) projectId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser("id") actorId: string,
    @CurrentUser("role") actorRole: UserRole,
    @Body() body: { role: "admin" | "member" },
  ) {
    return this.service.updateMemberRole(projectId, userId, body.role, actorId, actorRole);
  }

  @Delete(":id/members/:userId")
  @ApiOperation({ summary: "メンバー削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param("id", ParseUUIDPipe) projectId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser("id") actorId: string,
    @CurrentUser("role") actorRole: UserRole,
  ) {
    return this.service.removeMember(projectId, userId, undefined, actorId, actorRole);
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
    @Body()
    data: {
      title?: string;
      description?: string;
      status?: string;
      requestedDate?: string | null;
      dueDate?: string | null;
      assigneeIds?: string[];
      fileIds?: string[];
    },
  ) {
    return this.service.updateTask(taskId, data);
  }

  @Delete("tasks/:taskId")
  @ApiOperation({ summary: "タスク削除" })
  deleteTask(@Param("taskId", ParseUUIDPipe) taskId: string) {
    return this.service.deleteTask(taskId);
  }

  // ========== Schedules ==========

  @Get(":id/schedules")
  @ApiOperation({ summary: "プロジェクトスケジュール一覧" })
  getSchedules(
    @Param("id", ParseUUIDPipe) projectId: string,
    @Query("startAt") startAt?: string,
    @Query("endAt") endAt?: string,
  ) {
    return this.service.getSchedules(projectId, startAt, endAt);
  }

  @Post(":id/schedules")
  @ApiOperation({ summary: "プロジェクトスケジュール作成" })
  createSchedule(
    @Param("id", ParseUUIDPipe) projectId: string,
    @CurrentUser("id") userId: string,
    @Body()
    data: {
      title: string;
      description?: string;
      startAt: string;
      endAt: string;
      isAllDay?: boolean;
      location?: string;
    },
  ) {
    return this.service.createSchedule(projectId, userId, data);
  }

  @Patch(":id/schedules/:scheduleId")
  @ApiOperation({ summary: "プロジェクトスケジュール更新" })
  updateSchedule(
    @Param("scheduleId", ParseUUIDPipe) scheduleId: string,
    @Body()
    data: {
      title?: string;
      description?: string;
      startAt?: string;
      endAt?: string;
      isAllDay?: boolean;
      location?: string;
    },
  ) {
    return this.service.updateSchedule(scheduleId, data);
  }

  @Delete(":id/schedules/:scheduleId")
  @ApiOperation({ summary: "プロジェクトスケジュール削除" })
  deleteSchedule(@Param("scheduleId", ParseUUIDPipe) scheduleId: string) {
    return this.service.deleteSchedule(scheduleId);
  }
}
