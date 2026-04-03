import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import type { UserRole, UserStatus } from "@prisma/client";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

export class UserListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "名前・ニックネームで検索" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ["owner", "admin", "moderator", "member"] })
  @IsOptional()
  @IsEnum(["owner", "admin", "moderator", "member"] as const)
  role?: UserRole;

  @ApiPropertyOptional({ enum: ["active", "suspended", "withdrawn"] })
  @IsOptional()
  @IsEnum(["active", "suspended", "withdrawn"] as const)
  status?: UserStatus;
}
