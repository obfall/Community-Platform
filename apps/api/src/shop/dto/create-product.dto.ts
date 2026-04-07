import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateProductDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  seriesId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  saleStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  saleEndAt?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  imageFileIds?: string[];
}
