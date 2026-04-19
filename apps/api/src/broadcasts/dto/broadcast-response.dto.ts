import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class BroadcastCreatorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class BroadcastResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  bodyHtml!: string;

  @ApiPropertyOptional()
  bodyText!: string | null;

  @ApiProperty()
  scope!: string;

  @ApiProperty({ type: [String] })
  channels!: string[];

  @ApiProperty()
  targetType!: string;

  @ApiPropertyOptional()
  targetFilter!: Record<string, unknown> | null;

  @ApiPropertyOptional()
  templateId!: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  scheduledAt!: Date | null;

  @ApiPropertyOptional()
  sentAt!: Date | null;

  @ApiProperty()
  totalRecipients!: number;

  @ApiProperty()
  sentCount!: number;

  @ApiProperty()
  deliveredCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty({ type: BroadcastCreatorDto })
  createdBy!: BroadcastCreatorDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
