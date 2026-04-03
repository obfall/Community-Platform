import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { Transform } from "class-transformer";

const FILE_CATEGORIES = ["avatar", "image", "video", "document", "general"] as const;

export class UploadFileDto {
  @ApiProperty({
    enum: FILE_CATEGORIES,
    description: "ファイルカテゴリ",
    example: "image",
  })
  @IsIn(FILE_CATEGORIES)
  fileCategory!: (typeof FILE_CATEGORIES)[number];

  @ApiPropertyOptional({ description: "公開ファイルとしてアップロード" })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isPublic?: boolean;
}
