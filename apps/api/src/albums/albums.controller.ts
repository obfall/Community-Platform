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
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { AlbumsService } from "./albums.service";
import {
  CreateAlbumDto,
  UpdateAlbumDto,
  AlbumQueryDto,
  AddPhotosDto,
  CreateAlbumCategoryDto,
} from "./dto";

@Controller("albums")
@ApiTags("Albums")
@ApiBearerAuth()
@FeatureEnabled("album")
@UseGuards(FeatureEnabledGuard)
export class AlbumsController {
  constructor(private readonly service: AlbumsService) {}

  @Get()
  @ApiOperation({ summary: "アルバム一覧" })
  @ApiOkResponse({ description: "アルバム一覧（可視性条件で絞り込み済み）" })
  findAll(@CurrentUser() currentUser: { id: string; role: string }, @Query() query: AlbumQueryDto) {
    return this.service.findAll(query, currentUser);
  }

  @Get("categories")
  @ApiOperation({ summary: "アルバムカテゴリ一覧" })
  @ApiOkResponse({ description: "アルバムカテゴリ一覧" })
  getCategories() {
    return this.service.getCategories();
  }

  @Post("categories")
  @ApiOperation({ summary: "アルバムカテゴリ作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @ApiCreatedResponse({ description: "カテゴリを作成した" })
  @ApiBadRequestResponse({ description: "入力検証に失敗" })
  @ApiForbiddenResponse({ description: "admin / owner 以外は作成不可" })
  createCategory(@Body() dto: CreateAlbumCategoryDto) {
    return this.service.createCategory(dto.name);
  }

  @Get(":id")
  @ApiOperation({ summary: "アルバム詳細" })
  @ApiOkResponse({ description: "アルバム詳細" })
  @ApiNotFoundResponse({ description: "存在しない / 閲覧権限なし（存在を漏らさない）" })
  findOne(
    @CurrentUser() currentUser: { id: string; role: string },
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(id, currentUser);
  }

  @Post()
  @ApiOperation({ summary: "アルバム作成" })
  @ApiCreatedResponse({ description: "作成したアルバム" })
  @ApiBadRequestResponse({ description: "入力検証に失敗" })
  create(@CurrentUser() currentUser: { id: string; role: string }, @Body() dto: CreateAlbumDto) {
    return this.service.create(currentUser.id, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "アルバム更新" })
  @ApiOkResponse({ description: "更新後のアルバム" })
  @ApiForbiddenResponse({ description: "作成者または admin/owner 以外は更新不可" })
  @ApiNotFoundResponse({ description: "存在しない" })
  update(
    @CurrentUser() currentUser: { id: string; role: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlbumDto,
  ) {
    return this.service.update(id, dto, currentUser);
  }

  @Delete(":id")
  @ApiOperation({ summary: "アルバム削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "論理削除した" })
  @ApiForbiddenResponse({ description: "作成者または admin/owner 以外は削除不可" })
  @ApiNotFoundResponse({ description: "存在しない" })
  remove(
    @CurrentUser() currentUser: { id: string; role: string },
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(id, currentUser);
  }

  @Post(":id/photos")
  @ApiOperation({ summary: "写真追加" })
  @ApiCreatedResponse({ description: "追加した写真件数" })
  @ApiForbiddenResponse({ description: "作成者または admin/owner 以外は追加不可" })
  @ApiNotFoundResponse({ description: "アルバムが存在しない" })
  addPhotos(
    @CurrentUser() currentUser: { id: string; role: string },
    @Param("id", ParseUUIDPipe) albumId: string,
    @Body() dto: AddPhotosDto,
  ) {
    return this.service.addPhotos(albumId, currentUser, dto.photos);
  }

  @Delete(":id/photos/:photoId")
  @ApiOperation({ summary: "写真削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "写真を削除した" })
  @ApiForbiddenResponse({ description: "作成者または admin/owner 以外は削除不可" })
  @ApiNotFoundResponse({ description: "アルバムまたは写真が存在しない" })
  removePhoto(
    @CurrentUser() currentUser: { id: string; role: string },
    @Param("id", ParseUUIDPipe) albumId: string,
    @Param("photoId", ParseUUIDPipe) photoId: string,
  ) {
    return this.service.removePhoto(albumId, photoId, currentUser);
  }
}
