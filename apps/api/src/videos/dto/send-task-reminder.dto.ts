import { ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from "class-validator";

export class SendTaskReminderDto {
  @ApiPropertyOptional({
    description: "リマインドを送る対象ユーザー ID 配列。省略時は未完了者全員に送信。",
    type: [String],
    format: "uuid",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID("4", { each: true })
  userIds?: string[];
}
