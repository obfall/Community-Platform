import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { BroadcastChannel, BroadcastScope, BroadcastTargetType } from "@prisma/client";

export class CreateBroadcastDto {
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

  @ApiPropertyOptional({ enum: BroadcastScope, description: "配信スコープ", default: "global" })
  @IsOptional()
  @IsEnum(BroadcastScope)
  scope?: BroadcastScope;

  @ApiPropertyOptional({
    enum: BroadcastChannel,
    isArray: true,
    description: "配信チャネル（in_app / email / line）",
  })
  @IsOptional()
  @IsArray()
  @IsEnum(BroadcastChannel, { each: true })
  channels?: BroadcastChannel[];

  @ApiProperty({ enum: BroadcastTargetType, description: "配信対象種別" })
  @IsEnum(BroadcastTargetType)
  targetType!: BroadcastTargetType;

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
