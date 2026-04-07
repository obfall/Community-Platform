import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { AlbumPublishStatus } from "@prisma/client";

export class CreateAlbumDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: AlbumPublishStatus })
  @IsOptional()
  @IsEnum(AlbumPublishStatus)
  publishStatus?: AlbumPublishStatus;
}
