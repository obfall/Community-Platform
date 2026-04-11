import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OptionsService } from "./options.service";
import { ToggleOptionDto } from "./dto";
import { CurrentUser, Roles } from "@/common/decorators";
import { RolesGuard } from "@/common/guards";

@ApiTags("settings/options")
@ApiBearerAuth()
@Controller("settings/options")
@UseGuards(RolesGuard)
@Roles("admin")
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Get()
  @ApiOperation({ summary: "オプション機能一覧" })
  findAll() {
    return this.optionsService.findAll();
  }

  @Patch(":featureKey")
  @ApiOperation({ summary: "オプション機能の利用可否切替" })
  toggle(
    @Param("featureKey") featureKey: string,
    @Body() dto: ToggleOptionDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.optionsService.toggle(featureKey, dto.isAvailable, userId);
  }
}
