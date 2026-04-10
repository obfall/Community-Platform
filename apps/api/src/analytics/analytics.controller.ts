import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@ApiTags("Analytics")
@ApiBearerAuth()
@FeatureEnabled("analytics")
@UseGuards(FeatureEnabledGuard, RolesGuard)
@Roles("admin", "owner")
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "ダッシュボード集計" })
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get("members")
  @ApiOperation({ summary: "メンバー活動分析" })
  getMemberActivity(@Query() query: PaginationQueryDto & { sortBy?: string }) {
    return this.service.getMemberActivity(query);
  }

  @Get("engagement")
  @ApiOperation({ summary: "エンゲージメントランキング" })
  getEngagement(@Query() query: PaginationQueryDto) {
    return this.service.getEngagementRanking(query);
  }

  @Get("activity")
  @ApiOperation({ summary: "アクティビティログ" })
  getActivity(@Query() query: PaginationQueryDto & { userId?: string; action?: string }) {
    return this.service.getRecentActivity(query);
  }
}
