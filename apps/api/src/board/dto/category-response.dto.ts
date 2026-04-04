import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() sortOrder!: number;
  @ApiProperty({ description: "トピック作成を許可するか" }) allowTopicCreation!: boolean;
  @ApiProperty({ description: "公開済み投稿数" }) postCount!: number;
  @ApiProperty() createdAt!: Date;
}
