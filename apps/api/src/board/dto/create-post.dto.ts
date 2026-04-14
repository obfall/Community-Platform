import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PublishStatus, BoardViewPermission } from "@prisma/client";

export class CreatePostDto {
  @ApiProperty({ description: "タイトル", maxLength: 200, example: "初めての投稿" })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: "本文" })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ description: "カテゴリID" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: PublishStatus,
    default: PublishStatus.draft,
    description: "公開ステータス",
  })
  @IsOptional()
  @IsEnum(PublishStatus)
  publishStatus?: PublishStatus;

  @ApiPropertyOptional({
    enum: BoardViewPermission,
    default: BoardViewPermission.all,
    description: "閲覧権限",
  })
  @IsOptional()
  @IsEnum(BoardViewPermission)
  viewPermission?: BoardViewPermission;

  @ApiPropertyOptional({ description: "必要ランクID" })
  @IsOptional()
  @IsUUID()
  requiredRankId?: string;

  @ApiPropertyOptional({ description: "タグID配列", type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ description: "添付ファイルID配列", type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  fileIds?: string[];
}
