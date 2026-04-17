import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsInt, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class ReorderItem {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsInt()
  sortOrder!: number;
}

export class ReorderDto {
  @ApiProperty({ type: [ReorderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items!: ReorderItem[];
}
