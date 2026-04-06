import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { PointTriggerEvent } from "@prisma/client";

export class CreatePointRuleDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: PointTriggerEvent })
  @IsEnum(PointTriggerEvent)
  triggerEvent!: PointTriggerEvent;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  pointAmount!: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expiryDays!: number;

  @ApiPropertyOptional()
  @IsOptional()
  conditions?: Record<string, unknown>;
}
