import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

class AttributeValueItem {
  @ApiProperty({ description: "属性ID" })
  @IsUUID()
  attributeId!: string;

  @ApiProperty({ description: "値（null で削除）", nullable: true })
  @IsOptional()
  @IsString()
  value!: string | null;
}

export class SetAttributeValuesDto {
  @ApiProperty({ type: [AttributeValueItem], description: "属性値一覧" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueItem)
  values!: AttributeValueItem[];
}
