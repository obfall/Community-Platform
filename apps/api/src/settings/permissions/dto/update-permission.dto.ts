import { ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID } from "class-validator";

export class UpdatePermissionDto {
  @ApiPropertyOptional({ example: ["owner", "admin", "moderator"], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  allowedRoles?: string[];

  @ApiPropertyOptional({ description: "null で解除" })
  @IsOptional()
  @IsUUID("4")
  requiredRankId?: string | null;
}
