import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ description: "カテゴリ名", maxLength: 100, example: "お知らせ" })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: "説明" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "表示順", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: "トピック作成を許可するか", default: true })
  @IsOptional()
  @IsBoolean()
  allowTopicCreation?: boolean;
}
