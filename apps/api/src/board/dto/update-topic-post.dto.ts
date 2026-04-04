import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UpdateTopicPostDto {
  @ApiProperty({ description: "投稿本文" })
  @IsString()
  body!: string;
}
