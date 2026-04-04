import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateTopicPostCommentDto {
  @ApiProperty({ description: "コメント本文" })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ description: "返信先コメントID" })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}
