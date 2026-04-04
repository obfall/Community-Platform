import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UpdateCommentDto {
  @ApiProperty({ description: "コメント本文" })
  @IsString()
  body!: string;
}
