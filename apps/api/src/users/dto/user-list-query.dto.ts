import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
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

  // 一般メンバー向け一覧では admin（システム管理者）を結果から除外する。
  // クエリ文字列は文字列で届くので Transform で boolean に正規化する。
  @ApiPropertyOptional({ description: "admin ロールを結果から除外する" })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === "true")
  excludeAdmin?: boolean;
}
