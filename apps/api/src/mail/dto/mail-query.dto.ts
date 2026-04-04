import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { MailStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class MailMessageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MailStatus, description: "ステータスでフィルタ" })
  @IsOptional()
  @IsEnum(MailStatus)
  status?: MailStatus;
}
