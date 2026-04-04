import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class PostAuthorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  avatarUrl!: string | null;
}

export class TopicPostResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  likeCount!: number;

  @ApiProperty()
  commentCount!: number;

  @ApiProperty()
  isLiked!: boolean;

  @ApiProperty({ type: PostAuthorDto })
  author!: PostAuthorDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
