import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsUUID, ValidateNested } from "class-validator";

class ReorderItem {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsInt()
  sortOrder!: number;
}

export class ReorderAttributesDto {
  @ApiProperty({ type: [ReorderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items!: ReorderItem[];
}
