import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() sortOrder!: number;
  @ApiProperty({ description: "トピック作成を許可するか" }) allowTopicCreation!: boolean;
  @ApiProperty({ description: "公開済みトピック数" }) topicCount!: number;
  @ApiProperty() createdAt!: Date;
}
