import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export const ORDER_STATUS_VALUES = [
  "in_progress",
  "in_negotiation",
  "completed",
  "canceled",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number];

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUS_VALUES })
  @IsEnum(ORDER_STATUS_VALUES)
  status!: OrderStatusValue;
}
