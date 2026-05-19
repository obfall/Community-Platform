import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

const TASK_STATUSES = ["not_started", "in_progress", "completed"] as const;
export type VideoTaskStatusValue = (typeof TASK_STATUSES)[number];

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TASK_STATUSES, description: "タスクの状態" })
  @IsIn(TASK_STATUSES)
  status!: VideoTaskStatusValue;
}
