import { ApiProperty } from "@nestjs/swagger";

export class ApiResponseDto<T> {
  @ApiProperty()
  data!: T;

  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  timestamp!: string;
}

export class ApiErrorResponseDto {
  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  message!: string | string[];

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  path!: string;
}
