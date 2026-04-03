import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { FeaturesService } from "./features.service";
import { ToggleFeatureDto } from "./dto";
import { CurrentUser, Roles } from "@/common/decorators";
import { RolesGuard } from "@/common/guards";

@ApiTags("settings/features")
@ApiBearerAuth()
@Controller("settings/features")
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  @ApiOperation({ summary: "全機能一覧" })
  findAll() {
    return this.featuresService.findAll();
  }

  @Patch(":featureKey")
  @Roles("owner", "admin")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "機能の有効/無効切替（optional のみ）" })
  toggle(
    @Param("featureKey") featureKey: string,
    @Body() dto: ToggleFeatureDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.featuresService.toggle(featureKey, dto, userId);
  }
}
