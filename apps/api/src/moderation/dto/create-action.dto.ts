import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ModerationActionType } from "@prisma/client";

export class CreateActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reportId?: string;

  @ApiProperty({ enum: ModerationActionType })
  @IsEnum(ModerationActionType)
  actionType!: ModerationActionType;

  @ApiProperty({ maxLength: 30 })
  @IsString()
  @MaxLength(30)
  targetType!: string;

  @ApiProperty()
  @IsUUID()
  targetId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
