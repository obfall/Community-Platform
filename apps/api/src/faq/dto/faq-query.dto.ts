import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class FaqQueryDto {
  @ApiPropertyOptional({ description: "カテゴリでフィルタ" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: "検索キーワード（pgroonga 全文検索）" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
