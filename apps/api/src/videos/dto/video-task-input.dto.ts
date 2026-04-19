import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class VideoTaskInputDto {
  @ApiPropertyOptional({ description: "既存タスクの更新時のみ指定" })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
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
