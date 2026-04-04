import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength, IsArray } from "class-validator";
import { MailTemplateCategory } from "@prisma/client";

export class UpdateMailTemplateDto {
  @ApiPropertyOptional({ description: "テンプレート名", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: MailTemplateCategory, description: "カテゴリ" })
  @IsOptional()
  @IsEnum(MailTemplateCategory)
  category?: MailTemplateCategory;

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
