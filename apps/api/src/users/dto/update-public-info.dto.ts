import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { KANA_PATTERN } from "@community-platform/shared";
import type { PublicStatus } from "@prisma/client";

export class UpdatePublicInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(KANA_PATTERN, { message: "ニックネーム（カナ）は全角カタカナで入力してください" })
  nicknameKana?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  prefecture?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: "HTML形式の自己紹介" })
  @IsOptional()
  @IsString()
  introduction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  eventRole?: string;

  @ApiPropertyOptional({ enum: ["public", "private"], default: "private" })
  @IsOptional()
  @IsEnum(["public", "private"] as const)
  publicStatus?: PublicStatus;
}
