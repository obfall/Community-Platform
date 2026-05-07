import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

// code はパスパラメータで受けるので body 側からは除外する。
export class UpdateLocaleDto {
  @ApiPropertyOptional({ description: "その言語自身による表記" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameNative?: string;

  @ApiPropertyOptional({ description: "英語表記" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameEn?: string;

  @ApiPropertyOptional({ description: "既定ロケール（同時に最大1つ）" })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: "有効/無効" })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: "並び順" })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
