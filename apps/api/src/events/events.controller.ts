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
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventQueryDto } from "./dto/event-query.dto";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ParticipateEventDto } from "./dto/participate-event.dto";
import { UpdateParticipantStatusDto } from "./dto/update-participant-status.dto";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

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
  findAll(@Query() query: EventQueryDto) {
    return this.eventsService.findAll(query);
  }

  @Get("calendar")
  @ApiOperation({ summary: "カレンダー用イベント一覧" })
  getCalendar(@Query("from") from: string, @Query("to") to: string) {
    return this.eventsService.getCalendarEvents(from, to);
  }

  @Get(":id")
  @ApiOperation({ summary: "イベント詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "イベント作成" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin", "moderator")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.create(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "イベント更新" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin", "moderator")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "イベント削除（論理削除）" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.eventsService.remove(id);
  }

  // ========== Tickets ==========

  @Post(":id/tickets")
  @ApiOperation({ summary: "チケット作成" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin", "moderator")
  createTicket(@Param("id", ParseUUIDPipe) eventId: string, @Body() dto: CreateTicketDto) {
    return this.eventsService.createTicket(eventId, dto);
  }

  @Patch("tickets/:ticketId")
  @ApiOperation({ summary: "チケット更新" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin", "moderator")
  updateTicket(@Param("ticketId", ParseUUIDPipe) ticketId: string, @Body() dto: CreateTicketDto) {
    return this.eventsService.updateTicket(ticketId, dto);
  }

  @Delete("tickets/:ticketId")
  @ApiOperation({ summary: "チケット削除" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin")
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

  @Patch("participants/:participantId/status")
  @ApiOperation({ summary: "参加者ステータス変更" })
  @UseGuards(RolesGuard)
  @Roles("owner", "admin", "moderator")
  updateParticipantStatus(
    @Param("participantId", ParseUUIDPipe) participantId: string,
    @Body() dto: UpdateParticipantStatusDto,
  ) {
    return this.eventsService.updateParticipantStatus(participantId, dto);
  }
}
