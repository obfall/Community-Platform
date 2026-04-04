import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsString, ValidateNested } from "class-validator";

export class PreferenceItemDto {
  @ApiProperty({ description: "通知タイプ", example: "board_comment" })
  @IsString()
  notificationType!: string;

  @ApiProperty({ description: "メール通知", default: true })
  @IsBoolean()
  emailEnabled!: boolean;

  @ApiProperty({ description: "アプリ内通知", default: true })
  @IsBoolean()
  inAppEnabled!: boolean;

  @ApiProperty({ description: "LINE通知", default: false })
  @IsBoolean()
  lineEnabled!: boolean;
}

export class UpdatePreferencesDto {
  @ApiProperty({ type: [PreferenceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences!: PreferenceItemDto[];
}
