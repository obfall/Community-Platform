import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AddMemberDto {
  @ApiProperty({ description: "追加するユーザーID" })
  @IsUUID()
  userId!: string;
}
