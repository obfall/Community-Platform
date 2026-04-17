import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class NotifyParticipantsDto {
  @ApiProperty({ description: "通知タイトル" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: "通知本文" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;
}
