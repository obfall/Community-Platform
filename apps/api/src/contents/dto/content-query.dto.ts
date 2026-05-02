import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

export class ContentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "検索キーワード（pgroonga 全文検索）" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: "コンテンツ種別" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contentType?: string;

  @ApiPropertyOptional({
    description: "公開状態",
    enum: ["draft", "published", "unpublished", "all"],
  })
  @IsOptional()
  @IsString()
  publishStatus?: string;
}
