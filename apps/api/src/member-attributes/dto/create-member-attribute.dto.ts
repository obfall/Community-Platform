import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { AttributeType } from "@prisma/client";

export class CreateMemberAttributeDto {
  @ApiProperty({ description: "属性名", maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: "スラッグ（英数字・アンダースコア）", maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9_]+$/, { message: "slugは英小文字・数字・アンダースコアのみ使用可能です" })
  slug!: string;

  @ApiProperty({ enum: AttributeType, description: "属性タイプ" })
  @IsEnum(AttributeType)
  type!: AttributeType;

  @ApiPropertyOptional({ description: "選択肢（select/multi_select時）", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: "必須フラグ" })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: "表示順" })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
