import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "未読のみ取得", default: false })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  unreadOnly?: boolean;
}
