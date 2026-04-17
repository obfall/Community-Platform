import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

const VISIBILITY = ["hidden", "optional", "required"] as const;

export class UpsertApplicationFormConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnCapacityReached?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  notifyOnRemainingThreshold?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  completionMessageApp?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  completionMessageEmail?: string | null;

  @ApiPropertyOptional({ enum: VISIBILITY })
  @IsOptional()
  @IsEnum(VISIBILITY)
  askName?: (typeof VISIBILITY)[number];

  @ApiPropertyOptional({ enum: VISIBILITY })
  @IsOptional()
  @IsEnum(VISIBILITY)
  askNameKana?: (typeof VISIBILITY)[number];

  @ApiPropertyOptional({ enum: VISIBILITY })
  @IsOptional()
  @IsEnum(VISIBILITY)
  askAffiliation?: (typeof VISIBILITY)[number];

  @ApiPropertyOptional({ enum: VISIBILITY })
  @IsOptional()
  @IsEnum(VISIBILITY)
  askGender?: (typeof VISIBILITY)[number];

  @ApiPropertyOptional({ enum: VISIBILITY })
  @IsOptional()
  @IsEnum(VISIBILITY)
  askAge?: (typeof VISIBILITY)[number];

  @ApiPropertyOptional({ enum: VISIBILITY })
  @IsOptional()
  @IsEnum(VISIBILITY)
  askOccupation?: (typeof VISIBILITY)[number];

  @ApiPropertyOptional({ enum: VISIBILITY })
  @IsOptional()
  @IsEnum(VISIBILITY)
  askNationality?: (typeof VISIBILITY)[number];
}
