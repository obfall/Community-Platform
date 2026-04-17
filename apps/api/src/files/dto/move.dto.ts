import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class MoveDto {
  @ApiPropertyOptional({ description: "移動先フォルダ ID（null でルートへ移動）" })
  @IsOptional()
  @IsUUID()
  parentFolderId?: string | null;
}
