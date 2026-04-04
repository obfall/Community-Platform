import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, IsString } from "class-validator";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

export class PostQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "カテゴリIDでフィルタ" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: "タグIDでフィルタ" })
  @IsOptional()
  @IsUUID()
  tagId?: string;

  @ApiPropertyOptional({ description: "著者IDでフィルタ" })
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional({ description: "ステータスフィルタ（my_drafts: 自分の下書き）" })
  @IsOptional()
  @IsString()
  status?: string;
}
