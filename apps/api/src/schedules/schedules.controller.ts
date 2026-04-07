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
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { FeatureEnabledGuard } from "@/common/guards";
import { SchedulesService } from "./schedules.service";
import { CreateScheduleDto, UpdateScheduleDto } from "./dto";

@Controller("schedules")
@ApiTags("Schedules")
@ApiBearerAuth()
@FeatureEnabled("calendar")
@UseGuards(FeatureEnabledGuard)
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: "スケジュール一覧" })
  findAll(
    @CurrentUser("id") userId: string,
    @Query("startAt") startAt?: string,
    @Query("endAt") endAt?: string,
  ) {
    return this.service.findAll(userId, startAt, endAt);
  }

  @Post()
  @ApiOperation({ summary: "スケジュール作成" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateScheduleDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "スケジュール更新" })
  update(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "スケジュール削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(userId, id);
  }
}
