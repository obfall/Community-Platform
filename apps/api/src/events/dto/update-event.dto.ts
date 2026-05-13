import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { EventLocationType, EventStatus } from "@prisma/client";
import { EventOrganizationItemDto } from "./event-organization.dto";
import { EventSpeakerItemDto } from "./event-speaker.dto";

export class UpdateEventDto {
  @ApiPropertyOptional({ description: "タイトル", maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planningRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventType?: string;

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
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EventOrganizationItemDto)
  organizations?: EventOrganizationItemDto[];

  @ApiPropertyOptional({
    description: "タグ名（最大 3 つ）。配列を渡すと全件置換、省略すると変更なし",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: "登壇者（配列を渡すと全件置換、省略すると変更なし、最大 5 名）",
    type: [EventSpeakerItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => EventSpeakerItemDto)
  speakers?: EventSpeakerItemDto[];
}
