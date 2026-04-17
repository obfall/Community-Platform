import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;

class AnswerItem {
  @ApiProperty()
  @IsUUID()
  questionId!: string;

  @ApiProperty()
  answer!: string | string[];
}

export class ParticipateEventDto {
  @ApiProperty({ description: "チケットID" })
  @IsUUID()
  ticketId!: string;

  @ApiPropertyOptional({ description: "数量", default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: "割引コード" })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiPropertyOptional({ description: "支払方法" })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ description: "メールアドレス" })
  @IsEmail()
  applicantEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicantName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicantNameKana?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicantAffiliation?: string;

  @ApiPropertyOptional({ enum: GENDERS })
  @IsOptional()
  @IsEnum(GENDERS)
  applicantGender?: (typeof GENDERS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  applicantAge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicantOccupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicantNationality?: string;

  @ApiPropertyOptional({ type: [AnswerItem] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItem)
  answers?: AnswerItem[];
}
