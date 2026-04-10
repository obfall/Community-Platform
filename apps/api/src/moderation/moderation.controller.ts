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
import { ModerationService } from "./moderation.service";
import { CreateReportDto, UpdateReportDto, CreateActionDto, CreateBannedWordDto } from "./dto";

@Controller("moderation")
@ApiTags("Moderation")
@ApiBearerAuth()
@FeatureEnabled("moderation")
@UseGuards(FeatureEnabledGuard)
export class ModerationController {
  constructor(private readonly service: ModerationService) {}

  @Post("reports")
  @ApiOperation({ summary: "通報作成" })
  createReport(@CurrentUser("id") userId: string, @Body() dto: CreateReportDto) {
    return this.service.createReport(userId, dto);
  }

  @Get("reports")
  @ApiOperation({ summary: "通報一覧" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  findAllReports(@Query("status") status?: string) {
    return this.service.findAllReports(status);
  }

  @Get("reports/:id")
  @ApiOperation({ summary: "通報詳細" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  findOneReport(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOneReport(id);
  }

  @Patch("reports/:id")
  @ApiOperation({ summary: "通報更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  updateReport(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateReportDto) {
    return this.service.updateReport(id, dto);
  }

  @Post("reports/:id/actions")
  @ApiOperation({ summary: "モデレーションアクション作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createAction(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) reportId: string,
    @Body() dto: CreateActionDto,
  ) {
    return this.service.createAction(userId, { ...dto, reportId });
  }

  @Get("banned-words")
  @ApiOperation({ summary: "禁止ワード一覧" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  findAllBannedWords() {
    return this.service.findAllBannedWords();
  }

  @Post("banned-words")
  @ApiOperation({ summary: "禁止ワード作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createBannedWord(@Body() dto: CreateBannedWordDto) {
    return this.service.createBannedWord(dto);
  }

  @Delete("banned-words/:id")
  @ApiOperation({ summary: "禁止ワード削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBannedWord(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.removeBannedWord(id);
  }
}
