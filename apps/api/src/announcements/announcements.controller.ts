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
import { AnnouncementsService } from "./announcements.service";
import { CreateAnnouncementDto, UpdateAnnouncementDto } from "./dto";

@Controller("announcements")
@ApiTags("Announcements")
@ApiBearerAuth()
@FeatureEnabled("announcement")
@UseGuards(FeatureEnabledGuard)
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: "お知らせ一覧" })
  findAll(@Query("targetAudience") targetAudience?: string) {
    return this.service.findAll(targetAudience);
  }

  @Get(":id")
  @ApiOperation({ summary: "お知らせ詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "お知らせ作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateAnnouncementDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "お知らせ更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "お知らせ削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
