import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum } from "class-validator";
import { BroadcastSuppressionReason } from "@prisma/client";

export class CreateBroadcastSuppressionDto {
  @ApiProperty({ description: "メールアドレス" })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: BroadcastSuppressionReason, description: "停止理由" })
  @IsEnum(BroadcastSuppressionReason)
  reason!: BroadcastSuppressionReason;
}
