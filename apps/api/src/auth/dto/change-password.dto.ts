import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ description: "現在のパスワード" })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: "新しいパスワード", minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
