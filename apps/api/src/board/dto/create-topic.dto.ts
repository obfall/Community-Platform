import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID, MaxLength } from "class-validator";

export class CreateTopicDto {
  @ApiProperty({ description: "タイトル", maxLength: 200, example: "新しいトピック" })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: "本文" })
  @IsString()
  body!: string;

  @ApiProperty({ description: "カテゴリID" })
  @IsUUID()
  categoryId!: string;
}
