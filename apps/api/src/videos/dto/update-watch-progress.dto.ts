import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class UpdateWatchProgressDto {
  @ApiProperty({ description: "視聴済み秒数（累計）", minimum: 0 })
  @IsInt()
  @Min(0)
  watchedSeconds!: number;

  @ApiProperty({ description: "最後に再生していた位置（秒）", minimum: 0 })
  @IsInt()
  @Min(0)
  lastPositionSeconds!: number;

  @ApiProperty({ description: "動画全体の長さ（秒）", minimum: 0 })
  @IsInt()
  @Min(0)
  totalSeconds!: number;
}
