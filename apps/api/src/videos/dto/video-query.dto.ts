import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { VideoPublishStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class VideoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VideoPublishStatus })
  @IsOptional()
  @IsEnum(VideoPublishStatus)
  publishStatus?: VideoPublishStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  seriesId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
