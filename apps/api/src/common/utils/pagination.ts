/**
 * ページネーション関連の共通ヘルパー。
 *
 * 各 service の `findAll` 系で重複していた以下を一箇所に集約する:
 * - クエリの page/limit から page/limit/skip/offset を取り出す
 * - 結果の meta オブジェクト（total/totalPages/hasNextPage/hasPreviousPage）を組み立てる
 *
 * 上限 `maxLimit` ガードを 1 箇所で適用できるため、巨大値による DoS を防ぎやすい。
 */

export interface PaginationQuery {
  /** 数値として扱う。文字列は内部で Number 変換（NaN は無視）。 */
  page?: number | string;
  limit?: number | string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  /** Prisma findMany の skip。 */
  skip: number;
  /** 生 SQL の OFFSET（skip と同値）。 */
  offset: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * 数値・文字列を正の整数として正規化する。NaN/負/0/未定義は fallback を返す。
 */
function toPositiveInt(value: number | string | undefined, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

/**
 * クエリの page/limit から正規化済みのページネーションパラメータを取り出す。
 *
 * - page は 1 以上（負・0・NaN は 1 にフォールバック）
 * - limit は 1〜maxLimit にクランプ（デフォルト上限 100）
 * - controller で string で来るケース（@Query() の素受け）にも対応
 */
export function extractPagination(
  query: PaginationQuery,
  options: { defaultLimit?: number; maxLimit?: number } = {},
): PaginationParams {
  const { defaultLimit = 20, maxLimit = 100 } = options;
  const page = toPositiveInt(query.page, 1);
  const limit = Math.min(maxLimit, toPositiveInt(query.limit, defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip, offset: skip };
}

/**
 * ページネーション結果の meta オブジェクトを生成する。
 *
 * 一覧 API は `{ data, meta }` の標準形式を返す。meta 部分のみここで組み立てる。
 */
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
