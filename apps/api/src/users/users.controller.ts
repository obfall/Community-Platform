import { Controller, Get, Patch, Put, Body, Param, Query, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import {
  UserListQueryDto,
  UpdateProfileDto,
  UpdatePublicInfoDto,
  UpdateInterestsDto,
  UpdateLanguagesDto,
  UpdateAffiliationsDto,
} from "./dto";
import { CurrentUser } from "@/common/decorators";

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
}
