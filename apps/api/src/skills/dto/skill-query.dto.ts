import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min, IsEnum, IsString, IsUUID } from "class-validator";
import { Type } from "class-transformer";
import { SkillFormat } from "@prisma/client";

export class SkillQueryDto {
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
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: SkillFormat })
  @IsOptional()
  @IsEnum(SkillFormat)
  format?: SkillFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
