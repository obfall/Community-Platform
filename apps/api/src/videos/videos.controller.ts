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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { VideosService } from "./videos.service";
import { VideoProcessorService } from "./video-processor.service";
import { CreateVideoDto, UpdateVideoDto, VideoQueryDto } from "./dto";

@Controller("videos")
@ApiTags("Videos")
@ApiBearerAuth()
@FeatureEnabled("video")
@UseGuards(FeatureEnabledGuard)
export class VideosController {
  constructor(
    private readonly service: VideosService,
    private readonly processor: VideoProcessorService,
  ) {}

  @Get()
  @ApiOperation({ summary: "動画一覧" })
  findAll(@Query() query: VideoQueryDto, @CurrentUser("id") userId: string) {
    return this.service.findAll(query, userId);
  }

  @Get("categories")
  @ApiOperation({ summary: "動画カテゴリ一覧" })
  getCategories() {
    return this.service.getCategories();
  }

  @Post("categories")
  @ApiOperation({ summary: "動画カテゴリ作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createCategory(@Body("name") name: string) {
    return this.service.createCategory(name);
  }

  @Get("series")
  @ApiOperation({ summary: "シリーズ一覧" })
  getSeries() {
    return this.service.getSeries();
  }

  @Get(":id")
  @ApiOperation({ summary: "動画詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.service.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: "動画登録（メタデータのみ）" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateVideoDto) {
    return this.service.create(userId, dto);
  }

  @Post("upload")
  @ApiOperation({ summary: "動画アップロード（ファイル → HLS 変換）" })
  @ApiConsumes("multipart/form-data")
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 500 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      categoryId?: string;
      seriesId?: string;
      watchOrder?: number;
      publishStatus?: string;
      availableUntil?: string;
      viewPermission?: string;
      allowedRoles?: string[];
      password?: string;
      instructors?: string;
      attachmentFileIds?: string;
      tasks?: string;
    },
  ) {
    if (!file) throw new BadRequestException("動画ファイルが選択されていません");

    const video = await this.service.createForUpload(userId, body);

    // バックグラウンドで HLS 変換を開始（レスポンスは即返す）
    this.processor.processVideo(video.id, file.buffer, file.originalname).catch(() => {});

    return video;
  }

  @Patch(":id")
  @ApiOperation({ summary: "動画更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateVideoDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "動画削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Get(":id/progress")
  @ApiOperation({ summary: "視聴進捗取得" })
  getProgress(@Param("id", ParseUUIDPipe) videoId: string, @CurrentUser("id") userId: string) {
    return this.service.getWatchProgress(videoId, userId);
  }

  @Post(":id/progress")
  @ApiOperation({ summary: "視聴進捗更新" })
  updateProgress(
    @Param("id", ParseUUIDPipe) videoId: string,
    @CurrentUser("id") userId: string,
    @Body() data: { watchedSeconds: number; lastPositionSeconds: number; totalSeconds: number },
  ) {
    return this.service.updateWatchProgress(videoId, userId, data);
  }

  // ───────────── パスワード検証 ─────────────

  @Post(":id/verify-password")
  @ApiOperation({ summary: "動画パスワード検証" })
  verifyPassword(@Param("id", ParseUUIDPipe) id: string, @Body("password") password: string) {
    return this.service.verifyPassword(id, password);
  }

  // ───────────── タスクステータス更新 ─────────────

  @Patch("tasks/:taskId/status")
  @ApiOperation({ summary: "タスクステータス更新" })
  updateTaskStatus(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser("id") userId: string,
    @Body("status") status: "not_started" | "in_progress" | "completed",
  ) {
    return this.service.updateTaskStatus(taskId, userId, status);
  }

  // ───────────── タスク進捗（管理者用） ─────────────

  @Get(":id/task-progress")
  @ApiOperation({ summary: "タスク進捗一覧（管理者用）" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  getTaskProgress(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.getTaskProgress(id);
  }

  // ───────────── タスクリマインド ─────────────

  @Post(":id/tasks/:taskId/remind")
  @ApiOperation({ summary: "タスクリマインド通知送信" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  sendTaskReminder(
    @Param("id", ParseUUIDPipe) videoId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser("id") actorUserId: string,
    @Body() body: { userIds: string[] },
  ) {
    return this.service.sendTaskReminder(videoId, taskId, actorUserId, body.userIds ?? []);
  }

  // ───────────── 動画ファイル差し替え ─────────────

  @Post(":id/replace-file")
  @ApiOperation({ summary: "動画ファイル差し替え" })
  @ApiConsumes("multipart/form-data")
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 500 * 1024 * 1024 } }))
  async replaceFile(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("動画ファイルが選択されていません");

    const result = await this.service.resetStreamForReplace(id);
    this.processor.processVideo(result.id, file.buffer, file.originalname).catch(() => {});

    return { id: result.id, streamStatus: "processing" };
  }

  // ───────────── シリーズ ─────────────

  @Post("series")
  @ApiOperation({ summary: "シリーズ作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createSeries(@Body() data: { name: string; description?: string }) {
    return this.service.createSeries(data);
  }

  @Get("series/:seriesId/next-watch-order")
  @ApiOperation({ summary: "シリーズ内で次に使う watchOrder を取得" })
  getNextWatchOrder(@Param("seriesId", ParseUUIDPipe) seriesId: string) {
    return this.service.getNextWatchOrder(seriesId);
  }
}
