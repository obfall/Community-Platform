import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateRoomDto {
  @ApiPropertyOptional({ description: "グループ名", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: "グループ説明" })
  @IsOptional()
  @IsString()
  description?: string;
}
