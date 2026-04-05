import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class ParticipateEventDto {
  @ApiPropertyOptional({ description: "チケットID" })
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiPropertyOptional({ description: "数量", default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: "割引コード" })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiPropertyOptional({ description: "支払方法" })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
