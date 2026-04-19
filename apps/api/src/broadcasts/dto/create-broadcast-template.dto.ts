import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { BroadcastTemplateCategory } from "@prisma/client";

export class CreateBroadcastTemplateDto {
  @ApiProperty({ description: "テンプレート名", maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: BroadcastTemplateCategory, description: "カテゴリ" })
  @IsEnum(BroadcastTemplateCategory)
  category!: BroadcastTemplateCategory;

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
