import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import type { UserRole } from "@prisma/client";

const USER_ROLES = ["owner", "admin", "moderator", "member"] as const;

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: USER_ROLES,
    description: "変更先のロール",
    example: "moderator",
  })
  @IsIn(USER_ROLES)
  role!: UserRole;
}
