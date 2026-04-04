import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, IsDateString, MaxLength } from "class-validator";
import { MailTargetType } from "@prisma/client";

export class CreateMailMessageDto {
  @ApiProperty({ description: "件名", maxLength: 200 })
  @IsString()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ description: "HTML本文" })
  @IsString()
  bodyHtml!: string;

  @ApiPropertyOptional({ description: "テキスト本文" })
  @IsOptional()
  @IsString()
  bodyText?: string;

  @ApiProperty({ enum: MailTargetType, description: "配信対象種別" })
  @IsEnum(MailTargetType)
  targetType!: MailTargetType;

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
