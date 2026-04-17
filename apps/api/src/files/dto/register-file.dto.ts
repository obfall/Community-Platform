import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class RegisterFileDto {
  @ApiProperty({ description: "アップロード済みファイル ID" })
  @IsUUID()
  fileId!: string;

  @ApiPropertyOptional({ description: "親フォルダ ID（省略時はルート）" })
  @IsOptional()
  @IsUUID()
  parentFolderId?: string;

  @ApiPropertyOptional({ description: "表示名（省略時はファイル元名）" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}
