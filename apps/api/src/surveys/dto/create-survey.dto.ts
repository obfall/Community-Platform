import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SurveyTargetType, SurveyQuestionType } from "@prisma/client";

export class SurveyOptionDto {
  @ApiProperty()
  @IsString()
  value!: string;

  @ApiProperty()
  @IsString()
  label!: string;
}

export class CreateSurveyQuestionDto {
  @ApiProperty({ enum: SurveyQuestionType })
  @IsEnum(SurveyQuestionType)
  questionType!: SurveyQuestionType;

  @ApiProperty()
  @IsString()
  questionText!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [SurveyOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyOptionDto)
  options?: SurveyOptionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  minValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxValue?: number;
}

export class CreateSurveyDto {
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
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ enum: SurveyTargetType })
  @IsOptional()
  @IsEnum(SurveyTargetType)
  targetType?: SurveyTargetType;

  @ApiPropertyOptional()
  @IsOptional()
  targetFilter?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiProperty({ type: [CreateSurveyQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyQuestionDto)
  questions!: CreateSurveyQuestionDto[];
}
