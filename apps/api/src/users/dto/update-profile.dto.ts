import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { KANA_PATTERN, PHONE_PATTERN } from "@community-platform/shared";
import type { Gender } from "@prisma/client";

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: "ハイフンなしの半角数字 10〜11 桁" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(PHONE_PATTERN, { message: "電話番号はハイフンなしの半角数字10〜11桁で入力してください" })
  phone?: string;

  @ApiPropertyOptional({ description: "ISO 8601 日付文字列" })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(KANA_PATTERN, { message: "名前（カナ）は全角カタカナで入力してください" })
  nameKana?: string;

  @ApiPropertyOptional({ enum: ["male", "female", "other", "prefer_not_to_say"] })
  @IsOptional()
  @IsEnum(["male", "female", "other", "prefer_not_to_say"] as const)
  gender?: Gender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  countryOfOrigin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  headerImageUrl?: string;
}
