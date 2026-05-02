import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

export class TopicQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "カテゴリIDでフィルタ" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: "検索キーワード（pgroonga 全文検索）" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
