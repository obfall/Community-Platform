import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { PublishStatus, VideoViewPermission } from "@prisma/client";
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: VideoViewPermission })
  @IsOptional()
  @IsEnum(VideoViewPermission)
  viewPermission?: VideoViewPermission;

  @ApiPropertyOptional({ description: "タスク進捗（自分視点）: incomplete / complete / none" })
  @IsOptional()
  @IsIn(["incomplete", "complete", "none"])
  taskProgress?: "incomplete" | "complete" | "none";
}
