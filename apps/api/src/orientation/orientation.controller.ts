import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import { OrientationService } from "./orientation.service";
import { CreateOrientationPageDto, UpdateOrientationPageDto } from "./dto";

@Controller("orientation")
@ApiTags("Orientation")
@ApiBearerAuth()
@FeatureEnabled("orientation")
@UseGuards(FeatureEnabledGuard)
export class OrientationController {
  constructor(private readonly service: OrientationService) {}

  @Get("pages")
  @ApiOperation({ summary: "オリエンテーションページ一覧" })
  findAllPages() {
    return this.service.findAllPages();
  }

  @Get("me")
  @ApiOperation({ summary: "自分の完了状態" })
  getMe(@CurrentUser("id") userId: string) {
    return this.service.getMyCompletion(userId);
  }

  @Post("complete")
  @ApiOperation({ summary: "オリエンテーション完了" })
  complete(@CurrentUser("id") userId: string) {
    return this.service.complete(userId);
  }

  @Get("pages/:id")
  @ApiOperation({ summary: "オリエンテーションページ詳細" })
  findOnePage(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOnePage(id);
  }

  @Post("pages")
  @ApiOperation({ summary: "オリエンテーションページ作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createPage(@Body() dto: CreateOrientationPageDto) {
    return this.service.createPage(dto);
  }

  @Patch("pages/:id")
  @ApiOperation({ summary: "オリエンテーションページ更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  updatePage(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateOrientationPageDto) {
    return this.service.updatePage(id, dto);
  }

  @Delete("pages/:id")
  @ApiOperation({ summary: "オリエンテーションページ削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  removePage(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.removePage(id);
  }
}
