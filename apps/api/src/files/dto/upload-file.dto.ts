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
  // ValidationPipe の enableImplicitConversion が boolean 型に対し Boolean(value) を呼ぶため
  // value 経由だと文字列 "false" も true 化してしまう。obj から生クエリ値を読んで判定する。
  @Transform(({ obj, key }) => {
    const v = (obj as Record<string, unknown>)[key];
    return v === "true" || v === true;
  })
  isPublic?: boolean;
}
