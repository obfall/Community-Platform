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
import { AlbumsService } from "./albums.service";
import { CreateAlbumDto, AlbumQueryDto } from "./dto";

@Controller("albums")
@ApiTags("Albums")
@ApiBearerAuth()
@FeatureEnabled("album")
@UseGuards(FeatureEnabledGuard)
export class AlbumsController {
  constructor(private readonly service: AlbumsService) {}

  @Get()
  @ApiOperation({ summary: "アルバム一覧" })
  findAll(@Query() query: AlbumQueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "アルバム詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "ア���バム作成" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateAlbumDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "アルバム更新" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: { title?: string; description?: string; publishStatus?: string },
  ) {
    return this.service.update(id, data);
  }

  @Delete(":id")
  @ApiOperation({ summary: "アルバム削除" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
