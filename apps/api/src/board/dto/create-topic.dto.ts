import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { BoardPublishStatus } from "@prisma/client";

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

  @ApiPropertyOptional({
    enum: BoardPublishStatus,
    default: BoardPublishStatus.published,
    description: "公開ステータス",
  })
  @IsOptional()
  @IsEnum(BoardPublishStatus)
  publishStatus?: BoardPublishStatus;
}
