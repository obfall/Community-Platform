import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { EventLocationType } from "@prisma/client";

export class CreateEventDto {
  @ApiProperty({ description: "タイトル", maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: "概要" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: EventLocationType, description: "開催形態" })
  @IsEnum(EventLocationType)
  locationType!: EventLocationType;

  @ApiPropertyOptional({ description: "開催場所名" })
  @IsOptional()
  @IsString()
  venueName?: string;

  @ApiPropertyOptional({ description: "住所" })
  @IsOptional()
  @IsString()
  venueAddress?: string;

  @ApiPropertyOptional({ description: "オンラインURL" })
  @IsOptional()
  @IsString()
  onlineUrl?: string;

  @ApiProperty({ description: "開始日時" })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ description: "終了日時" })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ description: "申込締切日時" })
  @IsOptional()
  @IsDateString()
  registrationDeadlineAt?: string;

  @ApiPropertyOptional({ description: "チケット販売開始日時" })
  @IsOptional()
  @IsDateString()
  ticketSaleStartAt?: string;

  @ApiPropertyOptional({ description: "複数チケット購入許可" })
  @IsOptional()
  @IsBoolean()
  allowMultiTicketPurchase?: boolean;

  @ApiPropertyOptional({ description: "企画役割" })
  @IsOptional()
  @IsString()
  planningRole?: string;

  @ApiPropertyOptional({ description: "イベント種別" })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: "カテゴリID" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: "アクセス情報" })
  @IsOptional()
  @IsString()
  accessInfo?: string;

  @ApiPropertyOptional({ description: "参加方法" })
  @IsOptional()
  @IsString()
  participationMethod?: string;

  @ApiPropertyOptional({ description: "問合せ先" })
  @IsOptional()
  @IsString()
  contactInfo?: string;

  @ApiPropertyOptional({ description: "キャンセルポリシー" })
  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @ApiPropertyOptional({ description: "参加者相互参照" })
  @IsOptional()
  @IsBoolean()
  isAttendeeVisible?: boolean;

  @ApiPropertyOptional({ description: "カバー画像URL" })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: "参加必要ランクID" })
  @IsOptional()
  @IsUUID()
  requiredRankId?: string;
}
