import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { EventSpeakerRole } from "@prisma/client";

export class EventSpeakerItemDto {
  @ApiProperty({ description: "登壇者名（外部講師は自由入力）", maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: "肩書（例: CEO、教授）", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ enum: EventSpeakerRole, description: "役割" })
  @IsEnum(EventSpeakerRole)
  role!: EventSpeakerRole;

  @ApiPropertyOptional({ description: "メンバー紐付け（任意）" })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
