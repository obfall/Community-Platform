import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import {
  UserListQueryDto,
  UpdateProfileDto,
  UpdatePublicInfoDto,
  UpdateInterestsDto,
  UpdateLanguagesDto,
  UpdateAffiliationsDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from "./dto";
import { CurrentUser, Roles } from "@/common/decorators";
import { RolesGuard } from "@/common/guards/roles.guard";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "メンバー一覧" })
  findAll(@Query() query: UserListQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get("me/profile")
  @ApiOperation({ summary: "自分のプロフィール詳細" })
  getMyProfile(@CurrentUser("id") userId: string) {
    return this.usersService.findOne(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "メンバー詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch("me/profile")
  @ApiOperation({ summary: "自分のプロフィール更新" })
  updateProfile(@CurrentUser("id") userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch("me/public-info")
  @ApiOperation({ summary: "自分の公開情報更新" })
  updatePublicInfo(@CurrentUser("id") userId: string, @Body() dto: UpdatePublicInfoDto) {
    return this.usersService.updatePublicInfo(userId, dto);
  }

  @Put("me/interests")
  @ApiOperation({ summary: "自分の興味分野を一括設定" })
  replaceInterests(@CurrentUser("id") userId: string, @Body() dto: UpdateInterestsDto) {
    return this.usersService.replaceInterests(userId, dto);
  }

  @Put("me/languages")
  @ApiOperation({ summary: "自分の言語を一括設定" })
  replaceLanguages(@CurrentUser("id") userId: string, @Body() dto: UpdateLanguagesDto) {
    return this.usersService.replaceLanguages(userId, dto);
  }

  @Put("me/affiliations")
  @ApiOperation({ summary: "自分の所属を一括設定" })
  replaceAffiliations(@CurrentUser("id") userId: string, @Body() dto: UpdateAffiliationsDto) {
    return this.usersService.replaceAffiliations(userId, dto);
  }

  @Patch(":id/role")
  @Roles("owner", "admin")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "ユーザーロール変更（管理者専用）" })
  updateRole(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: string },
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, currentUser, dto);
  }

  @Patch(":id/status")
  @Roles("owner", "admin")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "ユーザーステータス変更（管理者専用）" })
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: string },
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, currentUser, dto);
  }

  @Delete(":id")
  @Roles("owner", "admin")
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "ユーザー削除（ソフトデリート、管理者専用）" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: string },
  ) {
    await this.usersService.softDelete(id, currentUser);
  }
}
