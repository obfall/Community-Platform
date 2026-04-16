import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { PublishStatus, VideoViewPermission } from "@prisma/client";
import { VideoInstructorInputDto } from "./video-instructor-input.dto";
import { VideoTaskInputDto } from "./video-task-input.dto";

const ALLOWED_ROLES = ["admin", "owner", "member", "visitor"] as const;

export class UpdateVideoDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
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
  categoryId?: string | null;

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

  @ApiPropertyOptional({ enum: VideoViewPermission })
  @IsOptional()
  @IsEnum(VideoViewPermission)
  viewPermission?: VideoViewPermission;

  @ApiPropertyOptional({
    description: "許可ロール（viewPermission=role_restricted 時のみ有効）",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsIn(ALLOWED_ROLES as unknown as string[], { each: true })
  allowedRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requiredRankId?: string | null;

  @ApiPropertyOptional({ description: "4桁数字。空文字または null でパスワード解除" })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{4})?$/, { message: "パスワードは4桁の半角数字で指定してください" })
  password?: string | null;

  @ApiPropertyOptional({ type: [VideoInstructorInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => VideoInstructorInputDto)
  instructors?: VideoInstructorInputDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID("all", { each: true })
  attachmentFileIds?: string[];

  @ApiPropertyOptional({ type: [VideoTaskInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => VideoTaskInputDto)
  tasks?: VideoTaskInputDto[];
}
