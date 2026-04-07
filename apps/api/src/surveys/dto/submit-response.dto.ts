import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class SubmitAnswerDto {
  @ApiProperty()
  @IsUUID()
  questionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  selectedOptions?: Array<string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  numericValue?: number;
}

export class SubmitResponseDto {
  @ApiProperty({ type: [SubmitAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}
