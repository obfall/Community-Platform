import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateTopicPostDto {
  @ApiProperty({ description: "投稿本文" })
  @IsString()
  body!: string;
}
