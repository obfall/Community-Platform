import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
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
  UpdateUserEmailDto,
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

  @Get("me/tickets")
  @ApiOperation({ summary: "自分のチケット一覧" })
  getMyTickets(@CurrentUser("id") userId: string) {
    return this.usersService.findUserTickets(userId);
  }

  @Get("me/reservations")
  @ApiOperation({ summary: "自分の予約一覧" })
  getMyReservations(@CurrentUser("id") userId: string) {
    return this.usersService.findUserReservations(userId);
  }

  @Get("me/tasks")
  @ApiOperation({ summary: "自分の担当タスク一覧" })
  getMyTasks(@CurrentUser("id") userId: string) {
    return this.usersService.findUserTasks(userId);
  }

  @Get("me/library")
  @ApiOperation({ summary: "自分のライブラリー（視聴履歴・購入商品）" })
  getMyLibrary(@CurrentUser("id") userId: string) {
    return this.usersService.findUserLibrary(userId);
  }

  // ※ `:id` ルートより必ず前に置く。後ろに置くと NestJS が "interest-categories" を
  //    UUID パラメータとして解釈し、ParseUUIDPipe で 400 エラーになる。
  @Get("interest-categories")
  @ApiOperation({ summary: "選択可能な興味分野カテゴリ一覧" })
  findInterestCategories() {
    return this.usersService.findInterestCategories();
  }

  @Get(":id")
  @ApiOperation({ summary: "メンバー詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Get(":id/events")
  @ApiOperation({ summary: "ユーザーの参加イベント一覧" })
  findUserEvents(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findUserEvents(id);
  }

  @Get(":id/projects")
  @ApiOperation({ summary: "ユーザーの参加プロジェクト一覧" })
  findUserProjects(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findUserProjects(id);
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
  @Roles("admin", "owner")
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
  @Roles("admin", "owner")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "ユーザーステータス変更（管理者専用）" })
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: string },
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, currentUser, dto);
  }

  @Post(":id/force-password-reset")
  @Roles("admin", "owner")
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "パスワード強制リセット（管理者専用）" })
  forcePasswordReset(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: string },
  ) {
    return this.usersService.forcePasswordReset(id, currentUser);
  }

  @Patch(":id/email")
  @Roles("admin", "owner")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "ユーザーメールアドレス変更（管理者専用）" })
  updateEmail(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: string },
    @Body() dto: UpdateUserEmailDto,
  ) {
    return this.usersService.updateEmail(id, currentUser, dto);
  }
}
