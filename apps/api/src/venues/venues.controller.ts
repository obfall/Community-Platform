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
import { VenuesService } from "./venues.service";
import { CreateVenueDto, CreateSpaceDto, CreateReservationDto, VenueQueryDto } from "./dto";

@Controller("venues")
@ApiTags("Venues")
@ApiBearerAuth()
@FeatureEnabled("venue")
@UseGuards(FeatureEnabledGuard)
export class VenuesController {
  constructor(private readonly service: VenuesService) {}

  @Get()
  @ApiOperation({ summary: "施設一覧" })
  findAll(@Query() query: VenueQueryDto) {
    return this.service.findAllVenues(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "施設詳細" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOneVenue(id);
  }

  @Post()
  @ApiOperation({ summary: "施設登録" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  create(@CurrentUser("id") userId: string, @Body() dto: CreateVenueDto) {
    return this.service.createVenue(userId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "施設更新" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: Partial<CreateVenueDto> & { publishStatus?: string },
  ) {
    return this.service.updateVenue(id, data);
  }

  @Delete(":id")
  @ApiOperation({ summary: "施設削除" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.removeVenue(id);
  }

  @Post(":id/spaces")
  @ApiOperation({ summary: "スペース作成" })
  @UseGuards(RolesGuard)
  @Roles("admin", "owner")
  createSpace(@Param("id", ParseUUIDPipe) venueId: string, @Body() dto: CreateSpaceDto) {
    return this.service.createSpace(venueId, dto);
  }

  @Get("spaces/:spaceId/reservations")
  @ApiOperation({ summary: "予約一覧" })
  getReservations(@Param("spaceId", ParseUUIDPipe) spaceId: string) {
    return this.service.getReservations(spaceId);
  }

  @Get(":id/reservations")
  @ApiOperation({ summary: "施設内全予約一覧" })
  getVenueReservations(@Param("id", ParseUUIDPipe) venueId: string) {
    return this.service.getVenueReservations(venueId);
  }

  @Post("spaces/:spaceId/reservations")
  @ApiOperation({ summary: "予約作成" })
  createReservation(
    @Param("spaceId", ParseUUIDPipe) spaceId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateReservationDto,
  ) {
    return this.service.createReservation(spaceId, userId, dto);
  }

  @Patch("reservations/:reservationId/cancel")
  @ApiOperation({ summary: "予約キャンセル" })
  cancelReservation(
    @Param("reservationId", ParseUUIDPipe) reservationId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.cancelReservation(reservationId, userId);
  }
}
