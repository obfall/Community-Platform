import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import { UserLibraryType, UserLibraryStatus } from "@prisma/client";

export class CreateLibraryItemDto {
  @ApiProperty({ enum: UserLibraryType })
  @IsEnum(UserLibraryType)
  type!: UserLibraryType;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publishedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  pageCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  impression?: string;

  @ApiPropertyOptional({ enum: UserLibraryStatus })
  @IsOptional()
  @IsEnum(UserLibraryStatus)
  status?: UserLibraryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fileId?: string;
}
