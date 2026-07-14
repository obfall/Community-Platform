import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import type { ParticipantStatus, ReservationStatus, VideoTaskStatus } from "@prisma/client";
import { PaginationQueryDto } from "@/common/dto/pagination.dto";

// マイページ一覧（チケット/予約/タスク）のステータス絞り込み。
// キャンセル相当はそもそも一覧から除外しているため許可値に含めない。

export class MyTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ["applied", "attended", "no_show"] })
  @IsOptional()
  @IsEnum(["applied", "attended", "no_show"] as const)
  status?: ParticipantStatus;
}

export class MyReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ["pending", "confirmed"] })
  @IsOptional()
  @IsEnum(["pending", "confirmed"] as const)
  status?: ReservationStatus;
}

export class MyTasksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ["not_started", "in_progress", "completed"] })
  @IsOptional()
  @IsEnum(["not_started", "in_progress", "completed"] as const)
  status?: VideoTaskStatus;
}
