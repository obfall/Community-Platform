import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateTicketDto {
  @ApiProperty({ description: "チケット名", maxLength: 100 })
  @IsString()
  @MaxLength(100)
  ticketName!: string;

  @ApiPropertyOptional({ description: "価格", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: "通貨", default: "JPY" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: "定員（null=無制限）" })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: "購入制限", default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  purchaseLimit?: number;

  @ApiPropertyOptional({ description: "販売有効" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
