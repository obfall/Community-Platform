import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { EventStatus } from "@prisma/client";
import { EVENT_TYPE_VALUES } from "@community-platform/shared";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class EventQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    description: "イベント種別（指定タイプを含むイベントを返す）",
    enum: EVENT_TYPE_VALUES,
  })
  @IsOptional()
  @IsIn(EVENT_TYPE_VALUES)
  eventType?: string;

  @ApiPropertyOptional({ description: "検索キーワード（pgroonga 全文検索）" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: "開始日以降" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "開始日以前" })
  @IsOptional()
  @IsDateString()
  to?: string;
}
