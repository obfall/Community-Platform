import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class MessageSenderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  avatarUrl!: string | null;
}

export class MessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  chatRoomId!: string;

  @ApiProperty()
  messageType!: string;

  @ApiPropertyOptional()
  body!: string | null;

  @ApiPropertyOptional()
  fileId!: string | null;

  @ApiProperty({ type: MessageSenderDto })
  sender!: MessageSenderDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
