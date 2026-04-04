import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class NotificationActorDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() avatarUrl?: string | null;
}

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() body?: string | null;
  @ApiPropertyOptional() referenceType?: string | null;
  @ApiPropertyOptional() referenceId?: string | null;
  @ApiProperty() isRead!: boolean;
  @ApiPropertyOptional() readAt?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ type: NotificationActorDto })
  actor?: NotificationActorDto | null;
}

export class UnreadCountResponseDto {
  @ApiProperty() count!: number;
}
