import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppSettingsService } from "./app-settings.service";
import { UpdateAppSettingDto } from "./dto";
import { CurrentUser, Roles } from "@/common/decorators";
import { RolesGuard } from "@/common/guards";

@ApiTags("settings/app")
@ApiBearerAuth()
@Controller("settings/app")
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  @ApiOperation({ summary: "アプリ設定一覧" })
  findAll() {
    return this.appSettingsService.findAll();
  }

  @Patch(":key")
  @Roles("owner", "admin")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "アプリ設定更新" })
  update(
    @Param("key") key: string,
    @Body() dto: UpdateAppSettingDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.appSettingsService.update(key, dto, userId);
  }
}
