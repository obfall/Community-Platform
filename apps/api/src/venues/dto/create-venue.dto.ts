import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { ContentPublishStatus } from "@prisma/client";

export class CreateVenueDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessInfo?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  venueTypes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: ContentPublishStatus })
  @IsOptional()
  @IsEnum(ContentPublishStatus)
  publishStatus?: ContentPublishStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  imageFileIds?: string[];
}
