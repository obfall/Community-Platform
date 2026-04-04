import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

export class TopicQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "カテゴリIDでフィルタ" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
