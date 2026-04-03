import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsUUID } from "class-validator";

export class UpdateInterestsDto {
  @ApiProperty({ type: [String], description: "カテゴリID の配列" })
  @IsArray()
  @IsUUID("4", { each: true })
  @ArrayMaxSize(50)
  categoryIds!: string[];
}
