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
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { VideosService } from "./videos.service";
import { CreateVideoDto, VideoQueryDto } from "./dto";

@Controller("videos")
@ApiTags("Videos")
@ApiBearerAuth()
@FeatureEnabled("video")
@UseGuards(FeatureEnabledGuard)
export class VideosController {
  constructor(private readonly service: VideosService) {}

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
  @ApiOperation({ summary: "動画登録" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateVideoDto) {
    return this.service.create(userId, dto);
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
