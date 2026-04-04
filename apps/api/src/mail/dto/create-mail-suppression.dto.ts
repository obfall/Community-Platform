import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum } from "class-validator";
import { MailSuppressionReason } from "@prisma/client";

export class CreateMailSuppressionDto {
  @ApiProperty({ description: "メールアドレス" })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: MailSuppressionReason, description: "停止理由" })
  @IsEnum(MailSuppressionReason)
  reason!: MailSuppressionReason;
}
