import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { LOCALE_CODE_PATTERN } from "@community-platform/shared";

export class CreateLocaleDto {
  @ApiProperty({ description: "ロケールコード（BCP 47 形式）", example: "en" })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Matches(LOCALE_CODE_PATTERN, { message: "ロケールコードの形式が不正です" })
  code!: string;

  @ApiProperty({ description: "その言語自身による表記", example: "English" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameNative!: string;

  @ApiProperty({ description: "英語表記", example: "English" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameEn!: string;

  @ApiPropertyOptional({ description: "既定ロケール（同時に最大1つ）", default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: "有効/無効", default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: "並び順", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
