import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { VideoProvider } from "@prisma/client";

export class CreateVideoDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: VideoProvider })
  @IsEnum(VideoProvider)
  videoProvider!: VideoProvider;

  @ApiProperty()
  @IsString()
  videoExternalId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  playbackUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  seriesId?: string;
}
