/** Pagination query parameters. */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/** Pagination metadata returned in paginated responses. */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Paginated response wrapping an array of items with metadata. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
