import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ToggleOptionDto {
  @ApiProperty({ description: "利用可否", example: true })
  @IsBoolean()
  isAvailable!: boolean;
}
