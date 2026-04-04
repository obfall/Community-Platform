import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, IsDateString, MaxLength } from "class-validator";
import { MailTargetType } from "@prisma/client";

export class UpdateMailMessageDto {
  @ApiPropertyOptional({ description: "件名", maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ description: "HTML本文" })
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiPropertyOptional({ description: "テキスト本文" })
  @IsOptional()
  @IsString()
  bodyText?: string;

  @ApiPropertyOptional({ enum: MailTargetType, description: "配信対象種別" })
  @IsOptional()
  @IsEnum(MailTargetType)
  targetType?: MailTargetType;

  @ApiPropertyOptional({ description: "配信先フィルタ条件（JSON）" })
  @IsOptional()
  targetFilter?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "テンプレートID" })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: "配信予定日時（ISO 8601）" })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
