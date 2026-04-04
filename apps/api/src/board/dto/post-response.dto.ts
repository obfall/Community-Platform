import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class PostAuthorDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() avatarUrl?: string | null;
}

class PostCategoryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

class PostTagDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
}

class PostAttachmentDto {
  @ApiProperty() id!: string;
  @ApiProperty() fileId!: string;
  @ApiPropertyOptional() url?: string | null;
  @ApiPropertyOptional() fileName?: string | null;
  @ApiProperty() sortOrder!: number;
}

export class PostResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() publishStatus!: string;
  @ApiProperty() isPinned!: boolean;
  @ApiProperty() viewCount!: number;
  @ApiProperty() commentCount!: number;
  @ApiProperty() likeCount!: number;
  @ApiProperty({ type: PostAuthorDto }) author!: PostAuthorDto;
  @ApiPropertyOptional({ type: PostCategoryDto }) category?: PostCategoryDto | null;
  @ApiProperty({ type: [PostTagDto] }) tags!: PostTagDto[];
  @ApiPropertyOptional({ type: [PostAttachmentDto] })
  attachments?: PostAttachmentDto[];
  @ApiProperty() isLiked!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
