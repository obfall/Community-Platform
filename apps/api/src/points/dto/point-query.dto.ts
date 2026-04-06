import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { PointTransactionType } from "@prisma/client";

export class PointHistoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: PointTransactionType })
  @IsOptional()
  @IsEnum(PointTransactionType)
  type?: PointTransactionType;
}
