import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min, IsEnum, IsString, IsUUID, MaxLength } from "class-validator";
import { Type } from "class-transformer";
import { SkillFormat, SkillListingStatus } from "@prisma/client";

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

  @ApiPropertyOptional({
    enum: SkillListingStatus,
    description: "管理者 (admin/owner) のみ active 以外の指定が反映される",
  })
  @IsOptional()
  @IsEnum(SkillListingStatus)
  status?: SkillListingStatus;

  @ApiPropertyOptional({ description: "検索キーワード（pgroonga 全文検索）" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
