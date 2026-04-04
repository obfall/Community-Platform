import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import type { UserStatus } from "@prisma/client";

const USER_STATUSES = ["active", "suspended", "withdrawn"] as const;

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: USER_STATUSES,
    description: "変更先のステータス",
    example: "suspended",
  })
  @IsIn(USER_STATUSES)
  status!: UserStatus;
}
