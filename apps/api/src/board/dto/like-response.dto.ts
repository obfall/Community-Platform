import { ApiProperty } from "@nestjs/swagger";

export class LikeResponseDto {
  @ApiProperty({ description: "いいね状態" }) liked!: boolean;
  @ApiProperty({ description: "いいね総数" }) likeCount!: number;
}
