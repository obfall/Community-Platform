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
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { FeatureEnabledGuard } from "@/common/guards";
import { SkillsService } from "./skills.service";
import { CreateSkillListingDto, CreateBookingDto, SkillQueryDto } from "./dto";

@Controller("skills")
@ApiTags("Skills")
@ApiBearerAuth()
@FeatureEnabled("skill_share")
@UseGuards(FeatureEnabledGuard)
export class SkillsController {
  constructor(private readonly service: SkillsService) {}

  // --- スキル出品 ---

  @Get()
  @ApiOperation({ summary: "スキル一覧" })
  findAll(@Query() query: SkillQueryDto) {
    return this.service.findAll(query);
  }

  @Get("bookings")
  @ApiOperation({ summary: "自分の予約一覧" })
  getBookings(@CurrentUser("id") userId: string) {
    return this.service.getBookings(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "スキル詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "スキル出品" })
  create(@CurrentUser("id") userId: string, @Body() dto: CreateSkillListingDto) {
    return this.service.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "スキル更新" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Body()
    data: {
      title?: string;
      description?: string;
      price?: number;
      durationMinutes?: number;
      format?: string;
      categoryId?: string;
      status?: string;
    },
  ) {
    return this.service.update(id, userId, data);
  }

  @Delete(":id")
  @ApiOperation({ summary: "スキル削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.service.remove(id, userId);
  }

  // --- 予約 ---

  @Post(":id/bookings")
  @ApiOperation({ summary: "予約リクエスト" })
  createBooking(
    @Param("id", ParseUUIDPipe) listingId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.service.createBooking(listingId, userId, dto);
  }

  @Patch("bookings/:bookingId/status")
  @ApiOperation({ summary: "予約ステータス変更" })
  updateBookingStatus(
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @CurrentUser("id") userId: string,
    @Body("status") status: "approved" | "rejected" | "completed" | "canceled",
  ) {
    return this.service.updateBookingStatus(bookingId, userId, status);
  }

  // --- メッセージ ---

  @Get("bookings/:bookingId/messages")
  @ApiOperation({ summary: "取引メッセージ一覧" })
  getMessages(
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.getMessages(bookingId, userId);
  }

  @Post("bookings/:bookingId/messages")
  @ApiOperation({ summary: "取引メッセージ送信" })
  sendMessage(
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @CurrentUser("id") userId: string,
    @Body("body") body: string,
  ) {
    return this.service.sendMessage(bookingId, userId, body);
  }

  // --- コメント ---

  @Get(":id/comments")
  @ApiOperation({ summary: "スキルコメント一覧" })
  getComments(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.getComments(id);
  }

  @Post(":id/comments")
  @ApiOperation({ summary: "スキルコメント投稿" })
  addComment(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Body("body") body: string,
  ) {
    return this.service.addComment(id, userId, body);
  }

  @Delete("comments/:commentId")
  @ApiOperation({ summary: "スキルコメント削除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteComment(
    @Param("commentId", ParseUUIDPipe) commentId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.deleteComment(commentId, userId);
  }
}
