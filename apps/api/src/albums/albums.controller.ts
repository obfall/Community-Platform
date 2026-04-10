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

  @Get("categories")
  @ApiOperation({ summary: "アルバムカテゴリ一覧" })
  getCategories() {
    return this.service.getCategories();
  }

  @Post("categories")
  @ApiOperation({ summary: "アルバムカテゴリ作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createCategory(@Body("name") name: string) {
    return this.service.createCategory(name);
  }

  @Get(":id")
  @ApiOperation({ summary: "アルバム詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "ア���バム作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateAlbumDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "アルバム更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: { title?: string; description?: string; publishStatus?: string },
  ) {
    return this.service.update(id, data);
  }

  @Delete(":id")
  @ApiOperation({ summary: "アルバム削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post(":id/photos")
  @ApiOperation({ summary: "写真追加" })
  addPhotos(
    @Param("id", ParseUUIDPipe) albumId: string,
    @CurrentUser("id") userId: string,
    @Body() body: { photos: Array<{ fileId: string; title?: string; caption?: string }> },
  ) {
    return this.service.addPhotos(albumId, userId, body.photos);
  }

  @Delete(":id/photos/:photoId")
  @ApiOperation({ summary: "写真削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(
    @Param("id", ParseUUIDPipe) albumId: string,
    @Param("photoId", ParseUUIDPipe) photoId: string,
  ) {
    return this.service.removePhoto(albumId, photoId);
  }
}
