import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "未読のみ取得", default: false })
  @IsOptional()
  // ValidationPipe の enableImplicitConversion が boolean 型に対し Boolean(value) を呼ぶため
  // value 経由だと文字列 "false" も true 化してしまう。obj から生クエリ値を読んで判定する。
  @Transform(({ obj, key }) => {
    const v = (obj as Record<string, unknown>)[key];
    return v === "true" || v === true;
  })
  unreadOnly?: boolean;

  @ApiPropertyOptional({
    description: "通知タイプ（カンマ区切りで複数指定可）",
    example: "announcement,event_announcement",
  })
  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) return value.map((v) => String(v));
    if (typeof value === "string")
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return undefined;
  })
  type?: string[];
}
