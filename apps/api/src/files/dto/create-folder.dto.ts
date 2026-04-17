import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateFolderDto {
  @ApiPropertyOptional({ description: "親フォルダ ID（省略時はルート）" })
  @IsOptional()
  @IsUUID()
  parentFolderId?: string;

  @ApiProperty({ description: "フォルダ名", example: "会議資料" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}
