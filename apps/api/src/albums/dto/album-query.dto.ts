import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min, IsString } from "class-validator";
import { Type } from "class-transformer";

export class AlbumQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
