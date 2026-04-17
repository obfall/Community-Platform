import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class ListFilesQueryDto {
  @ApiPropertyOptional({ description: "フォルダ ID（省略時はルート）" })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({ description: "検索キーワード" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ["name", "updatedAt", "size"], default: "name" })
  @IsOptional()
  @IsIn(["name", "updatedAt", "size"])
  sort?: "name" | "updatedAt" | "size";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "asc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  order?: "asc" | "desc";
}
