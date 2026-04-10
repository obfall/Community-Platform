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
import { PointsService } from "./points.service";
import { GrantPointsDto, PointHistoryQueryDto, CreatePointRuleDto } from "./dto";

@Controller("points")
@ApiTags("Points")
@ApiBearerAuth()
@FeatureEnabled("point")
@UseGuards(FeatureEnabledGuard)
export class PointsController {
  constructor(private readonly service: PointsService) {}

  @Get("summary")
  @ApiOperation({ summary: "自分のポイントサマリー" })
  getSummary(@CurrentUser("id") userId: string) {
    return this.service.getSummary(userId);
  }

  @Get("summary/:userId")
  @ApiOperation({ summary: "指定ユーザーのポイントサマリー" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  getUserSummary(@Param("userId", ParseUUIDPipe) userId: string) {
    return this.service.getSummary(userId);
  }

  @Get("history")
  @ApiOperation({ summary: "自分のポイント履歴" })
  getHistory(@CurrentUser("id") userId: string, @Query() query: PointHistoryQueryDto) {
    return this.service.getHistory(userId, query);
  }

  @Get("history/:userId")
  @ApiOperation({ summary: "指定ユーザーのポイント履歴" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  getUserHistory(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Query() query: PointHistoryQueryDto,
  ) {
    return this.service.getHistory(userId, query);
  }

  @Post("grant")
  @ApiOperation({ summary: "ポイント付与（管理者）" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  grant(@CurrentUser("id") adminId: string, @Body() dto: GrantPointsDto) {
    return this.service.grantPoints(adminId, dto);
  }

  // --- ルール ---

  @Get("rules")
  @ApiOperation({ summary: "ポイントルール一覧" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  getRules() {
    return this.service.getRules();
  }

  @Post("rules")
  @ApiOperation({ summary: "ポイントルール作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createRule(@Body() dto: CreatePointRuleDto) {
    return this.service.createRule(dto);
  }

  @Patch("rules/:id")
  @ApiOperation({ summary: "ポイントルール更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  updateRule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: { name?: string; pointAmount?: number; expiryDays?: number; isActive?: boolean },
  ) {
    return this.service.updateRule(id, data);
  }

  @Delete("rules/:id")
  @ApiOperation({ summary: "ポイントルール削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRule(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.deleteRule(id);
  }
}
