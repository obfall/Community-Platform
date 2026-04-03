import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreatePermissionDto {
  @ApiProperty({ example: "board" })
  @IsString()
  @MaxLength(50)
  featureKey!: string;

  @ApiProperty({ example: "create" })
  @IsString()
  @MaxLength(50)
  action!: string;

  @ApiProperty({ example: ["owner", "admin"], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  allowedRoles!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  requiredRankId?: string;
}
