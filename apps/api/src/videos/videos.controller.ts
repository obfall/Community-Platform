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
  Logger,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { BusinessException } from "@/common/exceptions";
import { ErrorCode, MAX_VIDEO_UPLOAD_BYTES } from "@community-platform/shared";
import { VideosService } from "./videos.service";
import { VideoProcessorService } from "./video-processor.service";
import {
  CreateVideoDto,
  UpdateVideoDto,
  VideoQueryDto,
  UpdateWatchProgressDto,
  UpdateTaskStatusDto,
  SendTaskReminderDto,
} from "./dto";

const videoFileRequired = () =>
  new BusinessException(
    ErrorCode.VALIDATION_FAILED,
    HttpStatus.BAD_REQUEST,
    "動画ファイルが選択されていません",
    undefined,
    "errors.validation.video_file_required",
  );

@Controller("videos")
@ApiTags("Videos")
@ApiBearerAuth()
@FeatureEnabled("video")
@UseGuards(FeatureEnabledGuard)
export class VideosController {
  private readonly logger = new Logger(VideosController.name);

  constructor(
    private readonly service: VideosService,
    private readonly processor: VideoProcessorService,
  ) {}

  @Get()
  @ApiOperation({ summary: "動画一覧" })
  @ApiResponse({ status: 200, description: "ページネーション付き動画一覧" })
  findAll(@Query() query: VideoQueryDto, @CurrentUser("id") userId: string) {
    return this.service.findAll(query, userId);
  }

  @Get("series")
  @ApiOperation({ summary: "シリーズ一覧" })
  @ApiResponse({ status: 200, description: "シリーズ配列" })
  getSeries() {
    return this.service.getSeries();
  }

  @Get(":id")
  @ApiOperation({ summary: "動画詳細" })
  @ApiResponse({ status: 200, description: "動画詳細（タスク・講師・添付含む）" })
  @ApiResponse({ status: 404, description: "動画が存在しない / 非権限ユーザーへの非公開動画" })
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.service.findOne(id, userId);
  }

  @Post(":id/view")
  @Throttle({ default: { limit: 1, ttl: 30_000 } })
  @ApiOperation({ summary: "再生回数を +1（プレイヤー play 時に呼ぶ）" })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: "再生回数を +1" })
  @ApiResponse({ status: 404, description: "動画が存在しない" })
  @ApiResponse({ status: 429, description: "レートリミット（30 秒に 1 回まで）" })
  recordView(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.recordView(id);
  }

  @Post()
  @ApiOperation({ summary: "動画登録（メタデータのみ）" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @ApiResponse({ status: 201, description: "登録された動画詳細" })
  @ApiResponse({ status: 403, description: "admin/owner 以外" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateVideoDto) {
    return this.service.create(userId, dto);
  }

  @Post("upload")
  @ApiOperation({
    summary: "動画アップロード（ファイル → MP4 直配信 or HLS 変換、VIDEO_OUTPUT_FORMAT で切替）",
  })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, description: "uploading 状態の動画レコード" })
  @ApiResponse({ status: 400, description: "ファイル未指定 / 不正 JSON フィールド" })
  @ApiResponse({ status: 403, description: "admin/owner 以外" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      seriesId?: string;
      watchOrder?: number;
      publishStatus?: string;
      availableUntil?: string;
      password?: string;
      instructors?: string;
      attachmentFileIds?: string;
      tasks?: string;
    },
  ) {
    if (!file) throw videoFileRequired();

    const video = await this.service.createForUpload(userId, body);

    // バックグラウンドで動画処理を開始（MP4 or HLS は VIDEO_OUTPUT_FORMAT 依存）
    this.processor.processVideo(video.id, file.buffer, file.originalname).catch((err) => {
      this.logger.error(`Background video processing failed (videoId=${video.id})`, err);
    });

    return video;
  }

  @Patch(":id")
  @ApiOperation({ summary: "動画更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @ApiResponse({ status: 200, description: "更新後の動画詳細" })
  @ApiResponse({ status: 404, description: "動画が存在しない" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateVideoDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "動画削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: "削除成功" })
  @ApiResponse({ status: 404, description: "動画が存在しない" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Get(":id/progress")
  @ApiOperation({ summary: "視聴進捗取得" })
  @ApiResponse({ status: 200, description: "自分の視聴進捗（未視聴なら null）" })
  getProgress(@Param("id", ParseUUIDPipe) videoId: string, @CurrentUser("id") userId: string) {
    return this.service.getWatchProgress(videoId, userId);
  }

  @Post(":id/progress")
  @ApiOperation({ summary: "視聴進捗更新" })
  @ApiResponse({ status: 201, description: "進捗が保存された VideoWatchProgress" })
  @ApiResponse({ status: 400, description: "DTO バリデーション失敗" })
  updateProgress(
    @Param("id", ParseUUIDPipe) videoId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateWatchProgressDto,
  ) {
    return this.service.updateWatchProgress(videoId, userId, dto);
  }

  // ───────────── パスワード検証 ─────────────

  @Post(":id/verify-password")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "動画パスワード検証" })
  @ApiResponse({ status: 201, description: "{ ok: true }" })
  @ApiResponse({ status: 401, description: "パスワード不一致" })
  @ApiResponse({ status: 404, description: "動画が存在しない" })
  @ApiResponse({ status: 429, description: "レートリミット（5/分）" })
  verifyPassword(@Param("id", ParseUUIDPipe) id: string, @Body("password") password: string) {
    return this.service.verifyPassword(id, password);
  }

  // ───────────── タスクステータス更新 ─────────────

  @Patch("tasks/:taskId/status")
  @ApiOperation({ summary: "タスクステータス更新" })
  @ApiResponse({ status: 200, description: "更新後の status / completedAt" })
  @ApiResponse({ status: 400, description: "DTO バリデーション失敗" })
  @ApiResponse({ status: 404, description: "タスクが存在しない" })
  updateTaskStatus(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.service.updateTaskStatus(taskId, userId, dto.status);
  }

  // ───────────── タスク進捗（管理者用） ─────────────

  @Get(":id/task-progress")
  @ApiOperation({ summary: "タスク進捗一覧（管理者用）" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @ApiResponse({ status: 200, description: "メンバー別のタスク進捗" })
  @ApiResponse({ status: 403, description: "admin/owner 以外" })
  @ApiResponse({ status: 404, description: "動画が存在しない" })
  getTaskProgress(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.getTaskProgress(id);
  }

  // ───────────── タスクリマインド ─────────────

  @Post(":id/tasks/:taskId/remind")
  @ApiOperation({ summary: "タスクリマインド通知送信" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @ApiResponse({ status: 201, description: "{ sentCount: number }" })
  @ApiResponse({ status: 403, description: "admin/owner 以外" })
  @ApiResponse({ status: 404, description: "動画 / タスクが存在しない" })
  sendTaskReminder(
    @Param("id", ParseUUIDPipe) videoId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser("id") actorUserId: string,
    @Body() dto: SendTaskReminderDto,
  ) {
    return this.service.sendTaskReminder(videoId, taskId, actorUserId, dto.userIds ?? []);
  }

  // ───────────── 動画ファイル差し替え ─────────────

  @Post(":id/replace-file")
  @ApiOperation({ summary: "動画ファイル差し替え" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, description: "{ id, streamStatus: 'processing' }" })
  @ApiResponse({ status: 400, description: "ファイル未指定" })
  @ApiResponse({ status: 403, description: "admin/owner 以外" })
  @ApiResponse({ status: 404, description: "動画が存在しない" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES } }))
  async replaceFile(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw videoFileRequired();

    const result = await this.service.resetStreamForReplace(id);
    this.processor.processVideo(result.id, file.buffer, file.originalname).catch((err) => {
      this.logger.error(`Background video processing failed (videoId=${result.id})`, err);
    });

    return { id: result.id, streamStatus: "processing" };
  }

  // ───────────── シリーズ ─────────────

  @Post("series")
  @ApiOperation({ summary: "シリーズ作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @ApiResponse({ status: 201, description: "作成されたシリーズ" })
  @ApiResponse({ status: 403, description: "admin/owner 以外" })
  createSeries(@Body() data: { name: string; description?: string }) {
    return this.service.createSeries(data);
  }

  @Get("series/:seriesId/next-watch-order")
  @ApiOperation({ summary: "シリーズ内で次に使う watchOrder を取得" })
  @ApiResponse({ status: 200, description: "{ nextOrder: number }" })
  getNextWatchOrder(@Param("seriesId", ParseUUIDPipe) seriesId: string) {
    return this.service.getNextWatchOrder(seriesId);
  }
}
