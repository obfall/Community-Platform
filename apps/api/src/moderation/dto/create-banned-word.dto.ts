import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { BannedWordMatchType, BannedWordAction } from "@prisma/client";

export class CreateBannedWordDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  word!: string;

  @ApiPropertyOptional({ enum: BannedWordMatchType })
  @IsOptional()
  @IsEnum(BannedWordMatchType)
  matchType?: BannedWordMatchType;

  @ApiPropertyOptional({ enum: BannedWordAction })
  @IsOptional()
  @IsEnum(BannedWordAction)
  action?: BannedWordAction;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  replacement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
