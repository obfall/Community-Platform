import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";
import { AnalyticsService } from "./analytics.service";

class MonthlyTrendQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  months?: number = 12;
}

class DropoutRiskQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number = 3;
}

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

  @Get("events/distribution")
  @ApiOperation({ summary: "イベント参加数分布" })
  getEventDistribution() {
    return this.service.getEventParticipationDistribution();
  }

  @Get("events/monthly-trend")
  @ApiOperation({ summary: "月次参加者推移" })
  getMonthlyTrend(@Query() query: MonthlyTrendQueryDto) {
    return this.service.getMonthlyParticipationTrend(query.months);
  }

  @Get("events/ranking")
  @ApiOperation({ summary: "イベント別ランキング" })
  getEventRanking(@Query() query: PaginationQueryDto) {
    return this.service.getEventRanking(query);
  }

  @Get("events/dropout-risk")
  @ApiOperation({ summary: "離脱予兆リスト" })
  getDropoutRisk(@Query() query: DropoutRiskQueryDto) {
    return this.service.getDropoutRiskList(query);
  }
}
