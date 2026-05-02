import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import type { UserRole, UserStatus } from "@prisma/client";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

export class UserListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "名前・ニックネームで検索（pgroonga 全文検索）" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: ["admin", "owner", "member", "visitor"] })
  @IsOptional()
  @IsEnum(["admin", "owner", "member", "visitor"] as const)
  role?: UserRole;

  @ApiPropertyOptional({ enum: ["active", "suspended", "withdrawn"] })
  @IsOptional()
  @IsEnum(["active", "suspended", "withdrawn"] as const)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: "ソート対象",
    enum: ["role", "name", "createdAt"],
  })
  @IsOptional()
  @IsEnum(["role", "name", "createdAt"] as const)
  sortBy?: "role" | "name" | "createdAt";

  @ApiPropertyOptional({ description: "ソート順", enum: ["asc", "desc"] })
  @IsOptional()
  @IsEnum(["asc", "desc"] as const)
  sortOrder?: "asc" | "desc";
}
