import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { PublishStatus } from "@prisma/client";
import {
  MAX_VIDEO_ATTACHMENTS,
  MAX_VIDEO_INSTRUCTORS,
  MAX_VIDEO_TASKS,
  MAX_VIDEO_TITLE_LENGTH,
  VIDEO_PASSWORD_PATTERN,
} from "@community-platform/shared";
import { VideoInstructorInputDto } from "./video-instructor-input.dto";
import { VideoTaskInputDto } from "./video-task-input.dto";

export class UpdateVideoDto {
  @ApiPropertyOptional({ maxLength: MAX_VIDEO_TITLE_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_VIDEO_TITLE_LENGTH)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: PublishStatus })
  @IsOptional()
  @IsEnum(PublishStatus)
  publishStatus?: PublishStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  seriesId?: string | null;

  @ApiPropertyOptional({ description: "シリーズ内の順番（0以上）" })
  @IsOptional()
  @IsInt()
  @Min(0)
  watchOrder?: number | null;

  @ApiPropertyOptional({ description: "閲覧期限（ISO8601）" })
  @IsOptional()
  @IsDateString()
  availableUntil?: string | null;

  @ApiPropertyOptional({ description: "4桁数字。空文字または null でパスワード解除" })
  @IsOptional()
  @IsString()
  @Matches(VIDEO_PASSWORD_PATTERN, { message: "パスワードは4桁の半角数字で指定してください" })
  password?: string | null;

  @ApiPropertyOptional({ type: [VideoInstructorInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_VIDEO_INSTRUCTORS)
  @ValidateNested({ each: true })
  @Type(() => VideoInstructorInputDto)
  instructors?: VideoInstructorInputDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_VIDEO_ATTACHMENTS)
  @IsUUID("all", { each: true })
  attachmentFileIds?: string[];

  @ApiPropertyOptional({ type: [VideoTaskInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_VIDEO_TASKS)
  @ValidateNested({ each: true })
  @Type(() => VideoTaskInputDto)
  tasks?: VideoTaskInputDto[];
}
