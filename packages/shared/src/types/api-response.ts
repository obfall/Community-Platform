/** Standard API success response envelope. */
export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

/** Standard API error response envelope. */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
}
