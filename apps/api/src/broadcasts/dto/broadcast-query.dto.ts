import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { BroadcastScope, BroadcastStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class BroadcastQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BroadcastStatus, description: "ステータスでフィルタ" })
  @IsOptional()
  @IsEnum(BroadcastStatus)
  status?: BroadcastStatus;

  @ApiPropertyOptional({ enum: BroadcastScope, description: "スコープでフィルタ" })
  @IsOptional()
  @IsEnum(BroadcastScope)
  scope?: BroadcastScope;

  @ApiPropertyOptional({ description: "イベント配信をイベントIDで絞り込み" })
  @IsOptional()
  @IsUUID()
  eventId?: string;
}
