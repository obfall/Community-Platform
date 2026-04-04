import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class CommentAuthorDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() avatarUrl?: string | null;
}

export class CommentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() body!: string;
  @ApiProperty() likeCount!: number;
  @ApiProperty() isLiked!: boolean;
  @ApiProperty({ type: CommentAuthorDto }) author!: CommentAuthorDto;
  @ApiPropertyOptional({ type: [CommentResponseDto] })
  childComments?: CommentResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
