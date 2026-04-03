import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class PermissionQueryDto {
  @ApiPropertyOptional({ description: "機能キーでフィルタ" })
  @IsOptional()
  @IsString()
  featureKey?: string;
}
