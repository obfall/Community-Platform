import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class VenueQueryDto {
  @ApiPropertyOptional({
    description: "公開状態",
    enum: ["draft", "published", "unpublished", "all"],
  })
  @IsOptional()
  @IsString()
  publishStatus?: string;

  @ApiPropertyOptional({ description: "検索キーワード（pgroonga 全文検索）" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
