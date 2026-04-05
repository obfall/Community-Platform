import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { ParticipantStatus } from "@prisma/client";

export class UpdateParticipantStatusDto {
  @ApiProperty({ enum: ParticipantStatus, description: "参加ステータス" })
  @IsEnum(ParticipantStatus)
  status!: ParticipantStatus;
}
