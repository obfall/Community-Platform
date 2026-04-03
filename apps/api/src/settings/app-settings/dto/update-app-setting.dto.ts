import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UpdateAppSettingDto {
  @ApiProperty({ description: "設定値（文字列として保存）" })
  @IsString()
  value!: string;
}
