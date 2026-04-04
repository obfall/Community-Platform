import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UpdateTopicPostCommentDto {
  @ApiProperty({ description: "コメント本文" })
  @IsString()
  body!: string;
}
