import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class VideoInstructorInputDto {
  @ApiPropertyOptional({ description: "登録ユーザー ID（外部講師の場合は undefined）" })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  affiliation?: string;
}
