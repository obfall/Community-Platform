import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ChatRoomType } from "@prisma/client";

export class CreateRoomDto {
  @ApiProperty({ enum: ChatRoomType, description: "ルーム種別" })
  @IsEnum(ChatRoomType)
  type!: ChatRoomType;

  @ApiPropertyOptional({ description: "グループ名（group時のみ）", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: "グループ説明" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "メンバーのユーザーID一覧", type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  memberIds!: string[];
}
