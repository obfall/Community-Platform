import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { EventStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class EventQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ description: "カテゴリID" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: "イベント種別" })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: "検索キーワード" })
  @IsOptional()
  @IsString()
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
