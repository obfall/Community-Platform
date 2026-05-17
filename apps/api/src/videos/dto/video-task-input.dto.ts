import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import { MAX_VIDEO_TASK_TITLE_LENGTH } from "@community-platform/shared";

export class VideoTaskInputDto {
  @ApiPropertyOptional({ description: "既存タスクの更新時のみ指定" })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ maxLength: MAX_VIDEO_TASK_TITLE_LENGTH })
  @IsString()
  @MaxLength(MAX_VIDEO_TASK_TITLE_LENGTH)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: "添付ファイルのID一覧（指定時に置き換え）", type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  fileIds?: string[];
}
