import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class RoomMemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  avatarUrl!: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  joinedAt!: Date;
}

class LastMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  body!: string | null;

  @ApiProperty()
  messageType!: string;

  @ApiProperty()
  senderName!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class RoomResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional()
  name!: string | null;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional()
  iconUrl!: string | null;

  @ApiProperty()
  maxMembers!: number | null;

  @ApiPropertyOptional()
  lastMessageAt!: Date | null;

  @ApiProperty()
  memberCount!: number;

  @ApiProperty()
  unreadCount!: number;

  @ApiPropertyOptional({ type: LastMessageDto })
  lastMessage!: LastMessageDto | null;

  @ApiProperty({ type: [RoomMemberDto] })
  members!: RoomMemberDto[];

  @ApiProperty()
  createdAt!: Date;
}
