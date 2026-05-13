import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { EventSpeakerRole } from "@prisma/client";
import { MAX_SPEAKER_NAME_LENGTH, MAX_SPEAKER_TITLE_LENGTH } from "@community-platform/shared";

export class EventSpeakerItemDto {
  @ApiProperty({
    description: "登壇者名（外部講師は自由入力）",
    maxLength: MAX_SPEAKER_NAME_LENGTH,
  })
  @IsString()
  @MaxLength(MAX_SPEAKER_NAME_LENGTH)
  name!: string;

  @ApiPropertyOptional({
    description: "肩書（例: CEO、教授）",
    maxLength: MAX_SPEAKER_TITLE_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SPEAKER_TITLE_LENGTH)
  title?: string;

  @ApiProperty({ enum: EventSpeakerRole, description: "役割" })
  @IsEnum(EventSpeakerRole)
  role!: EventSpeakerRole;

  @ApiPropertyOptional({ description: "メンバー紐付け（任意）" })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
