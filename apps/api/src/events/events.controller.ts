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
import type { UserRole } from "@prisma/client";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { FeatureEnabled } from "@/common/decorators/feature-enabled.decorator";
import { RolesGuard, FeatureEnabledGuard } from "@/common/guards";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventQueryDto } from "./dto/event-query.dto";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ParticipateEventDto } from "./dto/participate-event.dto";
import { UpdateParticipantStatusDto } from "./dto/update-participant-status.dto";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

// ホームウィジェット用のデフォルト値・上限。マジックナンバーを 1 箇所に集約。
const DEFAULT_UPCOMING_LIMIT = 3;
const MAX_UPCOMING_LIMIT = 20;
const DEFAULT_MY_UPCOMING_DAYS = 7;
const MAX_MY_UPCOMING_DAYS = 31;

@Controller("events")
@ApiTags("Events")
@ApiBearerAuth()
@FeatureEnabled("event")
@UseGuards(FeatureEnabledGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ========== Events ==========

  @Get()
  @ApiOperation({ summary: "イベント一覧" })
  findAll(@Query() query: EventQueryDto, @CurrentUser("role") role: UserRole) {
    return this.eventsService.findAll(query, role);
  }

  @Get("calendar")
  @ApiOperation({ summary: "カレンダー用イベント一覧" })
  getCalendar(
    @Query("from") from: string,
    @Query("to") to: string,
    @CurrentUser("role") role: UserRole,
  ) {
    return this.eventsService.getCalendarEvents(from, to, role);
  }

  @Get("upcoming")
  @ApiOperation({ summary: "今後のイベント（ホーム表示用）" })
  getUpcoming(@Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : DEFAULT_UPCOMING_LIMIT;
    const safeLimit =
      Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, MAX_UPCOMING_LIMIT)
        : DEFAULT_UPCOMING_LIMIT;
    return this.eventsService.findUpcoming(safeLimit);
  }

  @Get("my-upcoming")
  @ApiOperation({ summary: "自分が参加予定のイベント（ホーム表示用）" })
  getMyUpcoming(@CurrentUser("id") userId: string, @Query("days") days?: string) {
    const parsed = days ? Number.parseInt(days, 10) : DEFAULT_MY_UPCOMING_DAYS;
    const safeDays =
      Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, MAX_MY_UPCOMING_DAYS)
        : DEFAULT_MY_UPCOMING_DAYS;
    return this.eventsService.findMyUpcoming(userId, safeDays);
  }

  @Get(":id")
  @ApiOperation({ summary: "イベント詳細" })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("role") role: UserRole,
    @CurrentUser("id") userId: string,
  ) {
    return this.eventsService.findOne(id, role, userId);
  }

  @Post()
  @ApiOperation({ summary: "イベント作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "イベント更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "イベント削除（論理削除）" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.eventsService.remove(id);
  }

  // ========== Tickets ==========

  @Post(":id/tickets")
  @ApiOperation({ summary: "チケット作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createTicket(@Param("id", ParseUUIDPipe) eventId: string, @Body() dto: CreateTicketDto) {
    return this.eventsService.createTicket(eventId, dto);
  }

  @Patch("tickets/:ticketId")
  @ApiOperation({ summary: "チケット更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  updateTicket(@Param("ticketId", ParseUUIDPipe) ticketId: string, @Body() dto: CreateTicketDto) {
    return this.eventsService.updateTicket(ticketId, dto);
  }

  @Delete("tickets/:ticketId")
  @ApiOperation({ summary: "チケット削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTicket(@Param("ticketId", ParseUUIDPipe) ticketId: string) {
    return this.eventsService.removeTicket(ticketId);
  }

  // ========== Participants ==========

  @Post(":id/participate")
  @ApiOperation({ summary: "イベント参加申込" })
  participate(
    @Param("id", ParseUUIDPipe) eventId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: ParticipateEventDto,
  ) {
    return this.eventsService.participate(eventId, userId, dto);
  }

  @Delete(":id/participate")
  @ApiOperation({ summary: "参加キャンセル" })
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelParticipation(
    @Param("id", ParseUUIDPipe) eventId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.eventsService.cancelParticipation(eventId, userId);
  }

  @Get(":id/participants")
  @ApiOperation({ summary: "参加者一覧" })
  getParticipants(@Param("id", ParseUUIDPipe) eventId: string, @Query() query: PaginationQueryDto) {
    return this.eventsService.getParticipants(eventId, query);
  }

  @Get(":id/participants/stats")
  @ApiOperation({ summary: "参加者統計（admin）" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  getParticipantStats(@Param("id", ParseUUIDPipe) eventId: string) {
    return this.eventsService.getParticipantStats(eventId);
  }

  @Get(":id/participants/:participantId")
  @ApiOperation({ summary: "参加者詳細" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  getParticipantDetail(
    @Param("id", ParseUUIDPipe) eventId: string,
    @Param("participantId", ParseUUIDPipe) participantId: string,
  ) {
    return this.eventsService.getParticipantDetail(eventId, participantId);
  }

  @Patch("participants/:participantId/status")
  @ApiOperation({ summary: "参加者ステータス変更" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  updateParticipantStatus(
    @Param("participantId", ParseUUIDPipe) participantId: string,
    @Body() dto: UpdateParticipantStatusDto,
  ) {
    return this.eventsService.updateParticipantStatus(participantId, dto);
  }

  // ========== Duplicate ==========

  @Post(":id/duplicate")
  @ApiOperation({ summary: "イベント複製" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  duplicate(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.eventsService.duplicate(id, userId);
  }
}
