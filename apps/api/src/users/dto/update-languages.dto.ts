import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import type { LanguageProficiency } from "@prisma/client";

export class LanguageItemDto {
  @ApiProperty({ example: "ja", maxLength: 10 })
  @IsString()
  @MaxLength(10)
  languageCode!: string;

  @ApiPropertyOptional({ enum: ["beginner", "intermediate", "advanced", "native"] })
  @IsOptional()
  @IsEnum(["beginner", "intermediate", "advanced", "native"] as const)
  proficiency?: LanguageProficiency;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateLanguagesDto {
  @ApiProperty({ type: [LanguageItemDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LanguageItemDto)
  languages!: LanguageItemDto[];
}
