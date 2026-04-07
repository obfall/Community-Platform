import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class GrantPointsDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  points!: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  expiryDays?: number;
}
