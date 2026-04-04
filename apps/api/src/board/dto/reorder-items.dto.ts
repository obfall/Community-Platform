import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from "class-validator";

export class ReorderItemDto {
  @ApiProperty({ description: "対象ID" })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: "新しい表示順", minimum: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderItemsDto {
  @ApiProperty({ type: [ReorderItemDto], description: "並び替え対象" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
