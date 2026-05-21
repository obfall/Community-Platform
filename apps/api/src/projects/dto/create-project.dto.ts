import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ProjectStatus } from "@prisma/client";
import { MAX_PROJECT_TAGS, MAX_PROJECT_TAG_LENGTH } from "@community-platform/shared";

export class CreateProjectDto {
  @ApiProperty({ description: "プロジェクト名", maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ description: "説明（HTML）" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "カバー画像URL" })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: "カテゴリID" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: "関連イベントID" })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ description: "開始日" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "終了日" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    description: `タグ名の配列（最大 ${MAX_PROJECT_TAGS} 件、各 ${MAX_PROJECT_TAG_LENGTH} 文字以内）`,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PROJECT_TAGS)
  @IsString({ each: true })
  @MaxLength(MAX_PROJECT_TAG_LENGTH, { each: true })
  tags?: string[];
}
