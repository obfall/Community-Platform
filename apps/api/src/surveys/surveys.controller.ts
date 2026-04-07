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
import { SurveysService } from "./surveys.service";
import { CreateSurveyDto, SubmitResponseDto, SurveyQueryDto } from "./dto";

@Controller("surveys")
@ApiTags("Surveys")
@ApiBearerAuth()
@FeatureEnabled("survey")
@UseGuards(FeatureEnabledGuard)
export class SurveysController {
  constructor(private readonly service: SurveysService) {}

  @Get()
  @ApiOperation({ summary: "アンケート一覧" })
  findAll(@Query() query: SurveyQueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "アンケート詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "アンケート作成" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateSurveyDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "アンケート更新" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.service.update(id, dto as Parameters<SurveysService["update"]>[1]);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "アンケートステータス変更" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("status") status: "draft" | "active" | "closed",
  ) {
    return this.service.updateStatus(id, status);
  }

  @Delete(":id")
  @ApiOperation({ summary: "アンケート削除" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post(":id/responses")
  @ApiOperation({ summary: "アンケート回答" })
  submitResponse(
    @Param("id", ParseUUIDPipe) surveyId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: SubmitResponseDto,
  ) {
    return this.service.submitResponse(surveyId, userId, dto);
  }

  @Get(":id/results")
  @ApiOperation({ summary: "アンケート結果集計" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  getResults(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.getResults(id);
  }
}
