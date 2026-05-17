import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import {
  MAX_VIDEO_INSTRUCTOR_AFFILIATION_LENGTH,
  MAX_VIDEO_INSTRUCTOR_NAME_LENGTH,
} from "@community-platform/shared";

export class VideoInstructorInputDto {
  @ApiPropertyOptional({ description: "登録ユーザー ID（外部講師の場合は undefined）" })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ maxLength: MAX_VIDEO_INSTRUCTOR_NAME_LENGTH })
  @IsString()
  @MaxLength(MAX_VIDEO_INSTRUCTOR_NAME_LENGTH)
  name!: string;

  @ApiPropertyOptional({ maxLength: MAX_VIDEO_INSTRUCTOR_AFFILIATION_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_VIDEO_INSTRUCTOR_AFFILIATION_LENGTH)
  affiliation?: string;
}
