import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { LoginStatus } from "@prisma/client";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

export class ListLoginHistoryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "ユーザーID" })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: "ユーザー名 / メールの部分一致" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: LoginStatus, description: "ログイン結果" })
  @IsOptional()
  @IsEnum(LoginStatus)
  status?: LoginStatus;

  @ApiPropertyOptional({ description: "開始日（ISO 8601）" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: "終了日（ISO 8601）" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
