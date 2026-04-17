import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

const EXECUTION_STATUS = [
  "as_planned",
  "modified",
  "partially_held",
  "postponed",
  "canceled",
] as const;

const RESULT_STATUS = ["draft", "completed"] as const;

const PUBLISH_STATUS = ["public", "private"] as const;

export class UpsertEventResultDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  attendanceCount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  achievementNotes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  improvementNotes?: string | null;

  @ApiProperty({ enum: EXECUTION_STATUS })
  @IsEnum(EXECUTION_STATUS)
  executionStatus!: (typeof EXECUTION_STATUS)[number];

  @ApiProperty({ enum: RESULT_STATUS })
  @IsEnum(RESULT_STATUS)
  status!: (typeof RESULT_STATUS)[number];

  @ApiProperty({ enum: PUBLISH_STATUS })
  @IsEnum(PUBLISH_STATUS)
  publishStatus!: (typeof PUBLISH_STATUS)[number];
}

export class AttachResultFileDto {
  @ApiProperty()
  @IsUUID()
  fileId!: string;
}

class ReorderAttachmentItem {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderResultAttachmentsDto {
  @ApiProperty({ type: [ReorderAttachmentItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderAttachmentItem)
  items!: ReorderAttachmentItem[];
}
