import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import type { UserRole, UserStatus } from "@prisma/client";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

export class UserListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "名前・ニックネームで検索" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ["admin", "owner", "member", "visitor"] })
  @IsOptional()
  @IsEnum(["admin", "owner", "member", "visitor"] as const)
  role?: UserRole;

  @ApiPropertyOptional({ enum: ["active", "suspended", "withdrawn"] })
  @IsOptional()
  @IsEnum(["active", "suspended", "withdrawn"] as const)
  status?: UserStatus;
}
