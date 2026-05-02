import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PublishStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class VideoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PublishStatus })
  @IsOptional()
  @IsEnum(PublishStatus)
  publishStatus?: PublishStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  seriesId?: string;

  @ApiPropertyOptional({ description: "検索キーワード（pgroonga 全文検索）" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: "視聴状態（自分視点）: watched / unwatched" })
  @IsOptional()
  @IsIn(["watched", "unwatched"])
  watchStatus?: "watched" | "unwatched";
}
