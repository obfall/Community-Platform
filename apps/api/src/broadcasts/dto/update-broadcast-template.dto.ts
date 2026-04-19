import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { BroadcastTemplateCategory } from "@prisma/client";

export class UpdateBroadcastTemplateDto {
  @ApiPropertyOptional({ description: "テンプレート名", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: BroadcastTemplateCategory, description: "カテゴリ" })
  @IsOptional()
  @IsEnum(BroadcastTemplateCategory)
  category?: BroadcastTemplateCategory;

  @ApiPropertyOptional({ description: "件名テンプレート", maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subjectTemplate?: string;

  @ApiPropertyOptional({ description: "HTML本文テンプレート" })
  @IsOptional()
  @IsString()
  bodyHtmlTemplate?: string;

  @ApiPropertyOptional({ description: "テキスト本文テンプレート" })
  @IsOptional()
  @IsString()
  bodyTextTemplate?: string;

  @ApiPropertyOptional({ description: "使用可能な変数一覧", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableVariables?: string[];
}
