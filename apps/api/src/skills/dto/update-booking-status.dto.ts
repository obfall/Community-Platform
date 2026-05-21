import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export const BOOKING_STATUS_VALUES = ["approved", "rejected", "completed", "canceled"] as const;
export type BookingStatusInput = (typeof BOOKING_STATUS_VALUES)[number];

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BOOKING_STATUS_VALUES })
  @IsString()
  @IsIn(BOOKING_STATUS_VALUES as unknown as string[])
  status!: BookingStatusInput;

  @ApiPropertyOptional({
    description: "キャンセル/拒否時の任意コメント（SkillMessage として保存）",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
