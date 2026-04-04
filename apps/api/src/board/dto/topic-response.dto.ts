import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class TopicAuthorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  avatarUrl!: string | null;
}

class TopicCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class TopicResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  publishStatus!: string;

  @ApiProperty()
  isPinned!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  viewCount!: number;

  @ApiProperty()
  postCount!: number;

  @ApiProperty()
  likeCount!: number;

  @ApiProperty({ type: TopicAuthorDto })
  author!: TopicAuthorDto;

  @ApiProperty({ type: TopicCategoryDto })
  category!: TopicCategoryDto;

  @ApiProperty()
  isLiked!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
