import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class ToggleFeatureDto {
  @ApiProperty({ description: "機能の有効/無効" })
  @IsBoolean()
  isEnabled!: boolean;
}
