import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { EventLocationType, EventStatus } from "@prisma/client";
import {
  MAX_EVENT_ORGANIZATIONS,
  MAX_EVENT_SPEAKERS,
  MAX_EVENT_TAG_LENGTH,
  MAX_EVENT_TAGS,
  MAX_EVENT_TITLE_LENGTH,
  EVENT_PLANNING_ROLE_VALUES,
  EVENT_TYPE_VALUES,
} from "@community-platform/shared";
import { EventOrganizationItemDto } from "./event-organization.dto";
import { EventSpeakerItemDto } from "./event-speaker.dto";

export class UpdateEventDto {
  @ApiPropertyOptional({ description: "タイトル", maxLength: MAX_EVENT_TITLE_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_EVENT_TITLE_LENGTH)
  title?: string;

  @ApiPropertyOptional({ description: "概要" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EventLocationType })
  @IsOptional()
  @IsEnum(EventLocationType)
  locationType?: EventLocationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venueName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venueAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  onlineUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationDeadlineAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  ticketSaleStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowMultiTicketPurchase?: boolean;

  @ApiPropertyOptional({ description: "企画役割", enum: EVENT_PLANNING_ROLE_VALUES })
  @IsOptional()
  @IsIn(EVENT_PLANNING_ROLE_VALUES)
  planningRole?: string;

  @ApiPropertyOptional({
    description: "イベント種別（複数選択可）",
    enum: EVENT_TYPE_VALUES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(EVENT_TYPE_VALUES, { each: true })
  eventTypes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  participationMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAttendeeVisible?: boolean;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requiredRankId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCalendarVisible?: boolean;

  @ApiPropertyOptional({
    description: "関係団体（配列を渡すと全件置換、省略すると変更なし）",
    type: [EventOrganizationItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EVENT_ORGANIZATIONS)
  @ValidateNested({ each: true })
  @Type(() => EventOrganizationItemDto)
  organizations?: EventOrganizationItemDto[];

  @ApiPropertyOptional({
    description: `タグ名（最大 ${MAX_EVENT_TAGS} つ）。配列を渡すと全件置換、省略すると変更なし`,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EVENT_TAGS)
  @IsString({ each: true })
  @MaxLength(MAX_EVENT_TAG_LENGTH, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: `登壇者（配列を渡すと全件置換、省略すると変更なし、最大 ${MAX_EVENT_SPEAKERS} 名）`,
    type: [EventSpeakerItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EVENT_SPEAKERS)
  @ValidateNested({ each: true })
  @Type(() => EventSpeakerItemDto)
  speakers?: EventSpeakerItemDto[];
}
