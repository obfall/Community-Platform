import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMemberAttributeDto {
  @ApiPropertyOptional({ description: "属性名", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: "選択肢（select/multi_select時）", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: "必須フラグ" })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
