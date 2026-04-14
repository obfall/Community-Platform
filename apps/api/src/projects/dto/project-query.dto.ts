import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ProjectStatus, PublishStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class ProjectQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: PublishStatus })
  @IsOptional()
  @IsEnum(PublishStatus)
  publishStatus?: PublishStatus;

  @ApiPropertyOptional({ description: "検索キーワード" })
  @IsOptional()
  @IsString()
  search?: string;
}
