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

  @ApiPropertyOptional({
    description: "スラッグ（指定省略時は attr_{N} で自動採番）",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9_]+$/, { message: "slugは英小文字・数字・アンダースコアのみ使用可能です" })
  slug?: string;

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

  @ApiPropertyOptional({ description: "メンバー自身による編集を許可" })
  @IsOptional()
  @IsBoolean()
  isSelfEditable?: boolean;

  @ApiPropertyOptional({ description: "表示順" })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
