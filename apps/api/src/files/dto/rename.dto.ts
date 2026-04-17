import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class RenameDto {
  @ApiProperty({ description: "新しい名前" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}
