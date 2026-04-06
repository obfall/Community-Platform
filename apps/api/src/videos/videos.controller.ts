import {
  Controller,
  Get,
  Post,
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
import { CreateVideoDto, VideoQueryDto } from "./dto";

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
  findAll(@Query() query: VideoQueryDto) {
    return this.service.findAll(query);
  }

  @Get("series")
  @ApiOperation({ summary: "シリーズ一覧" })
  getSeries() {
    return this.service.getSeries();
  }

  @Get(":id")
  @ApiOperation({ summary: "動画詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "動画登録（メタデータのみ）" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateVideoDto) {
    return this.service.create(userId, dto);
  }

  @Post("upload")
  @ApiOperation({ summary: "動画アップロード（ファイル → HLS 変換）" })
  @ApiConsumes("multipart/form-data")
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 500 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser("id") userId: string,
    @Body() body: { title: string; description?: string; categoryId?: string; seriesId?: string },
  ) {
    if (!file) throw new BadRequestException("動画ファイルが選択されていません");

    // DB にレコード作成（ステータス: uploading）
    const video = await this.service.createForUpload(userId, {
      title: body.title,
      description: body.description,
      categoryId: body.categoryId,
      seriesId: body.seriesId,
    });

    // バックグラウンドで HLS 変換を開始（レスポンスは即返す）
    this.processor.processVideo(video.id, file.buffer, file.originalname).catch(() => {});

    return video;
  }

  @Delete(":id")
  @ApiOperation({ summary: "動画削除" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
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

  @Post("series")
  @ApiOperation({ summary: "シリーズ作成" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  createSeries(@Body() data: { name: string; description?: string }) {
    return this.service.createSeries(data);
  }
}
