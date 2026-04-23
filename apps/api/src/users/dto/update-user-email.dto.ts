import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class UpdateUserEmailDto {
  @ApiProperty({
    description: "新しいメールアドレス",
    example: "new@example.com",
  })
  @IsEmail({}, { message: "有効なメールアドレスを入力してください" })
  email!: string;
}
