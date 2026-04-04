import { ApiProperty } from "@nestjs/swagger";
import type { ApiResponse, ApiErrorResponse } from "@community-platform/shared";

export class ApiResponseDto<T> implements ApiResponse<T> {
  @ApiProperty()
  data!: T;

  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  timestamp!: string;
}

export class ApiErrorResponseDto implements ApiErrorResponse {
  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  message!: string | string[];

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  path!: string;
}
