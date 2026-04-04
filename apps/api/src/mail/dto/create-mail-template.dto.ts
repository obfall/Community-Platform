import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength, IsArray } from "class-validator";
import { MailTemplateCategory } from "@prisma/client";

export class CreateMailTemplateDto {
  @ApiProperty({ description: "テンプレート名", maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: MailTemplateCategory, description: "カテゴリ" })
  @IsEnum(MailTemplateCategory)
  category!: MailTemplateCategory;

  @ApiProperty({ description: "件名テンプレート", maxLength: 200 })
  @IsString()
  @MaxLength(200)
  subjectTemplate!: string;

  @ApiProperty({ description: "HTML本文テンプレート" })
  @IsString()
  bodyHtmlTemplate!: string;

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
