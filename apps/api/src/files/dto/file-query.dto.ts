import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

const FILE_CATEGORIES = ["avatar", "image", "video", "document", "general"] as const;

export class FileQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: FILE_CATEGORIES, description: "カテゴリフィルタ" })
  @IsOptional()
  @IsIn(FILE_CATEGORIES)
  fileCategory?: (typeof FILE_CATEGORIES)[number];
}
