/**
 * pgroonga クエリ構文ヘルパー
 *
 * pgroonga の &@~ 演算子はクエリ構文（+/-/AND/OR/括弧 等）を解釈する。
 * ユーザー入力をそのまま渡すと特殊文字が誤って構文として解釈され、
 * 意図しない検索結果になる or エラーになる。エスケープを必ず通す。
 *
 * 参考: https://pgroonga.github.io/reference/operators/query-v2.html
 */

import { Prisma } from "@prisma/client";

/**
 * クエリ文字列の特殊文字をエスケープ・除去する。
 *
 * - `"` `\` はバックスラッシュでエスケープ（リテラルとして扱う）
 * - `+` `-` `!` `(` `)` `{` `}` `[` `]` `^` `~` `*` `?` `:` `/` は空白に置換
 *   （これらは構文記号なので、リテラルとして扱うよりも単に分離した方が UX が良い）
 * - 前後の空白をトリム
 *
 * @returns エスケープ後の文字列（空入力なら "" を返す）
 */
export function escapePgroongaQuery(query: string | null | undefined): string {
  if (!query || query.trim().length === 0) return "";
  return query
    .replace(/["\\]/g, "\\$&")
    .replace(/[+\-!(){}[\]^~*?:/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// pgroonga 検索ヘルパー（pgroongaSearchAndFetch）
// ============================================================

export interface PgroongaSearchHit {
  id: string;
  score: number;
  /**
   * pgroonga_highlight_html() の結果。マッチ語があれば <span class="keyword"> 付き HTML、
   * マッチ語が無いカラム（snippet 等）では空文字 `""` が返る（`null` にはならない）。
   */
  titleHighlighted: string;
  /** titleHighlighted と同じ仕様（空文字は許容、`null` にはならない）。 */
  snippetHighlighted: string;
}

interface PrismaLike {
  $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T>;
}

export interface PgroongaSearchOptions<TRecord extends { id: string }> {
  prisma: PrismaLike;
  /** 対象テーブル名（snake_case）。SQL injection 防止で `^[a-z_][a-z0-9_]*$` のみ許可 */
  table: string;
  /** &@~ で検索する対象カラム（snake_case）。`ARRAY[col1, col2]` で連結される */
  searchColumns: string[];
  /** タイトルとして highlight するカラム */
  titleColumn: string;
  /** 本文として highlight するカラム。null なら snippet 空文字 */
  snippetColumn: string | null;
  /** snippet として highlight する先頭文字数（デフォルト 200） */
  snippetLength?: number;
  /** escapePgroongaQuery 済みのクエリ */
  escaped: string;
  /**
   * pgroonga マッチに加えて適用する WHERE 条件（公開範囲 + 追加フィルタ）。
   * 例: `Prisma.sql\`deleted_at IS NULL AND status <> 'draft'::"EventStatus"\``
   * 必ず `AND` で連結される前提で記述する（先頭に AND は不要、内部で結合される）。
   */
  where: Prisma.Sql;
  limit: number;
  offset: number;
  /**
   * pgroonga で当たった id 群から詳細レコードを取得するコールバック。
   * Prisma の include 構造がドメインごとに異なるため、ここで吸収する。
   */
  fetchByIds: (ids: string[]) => Promise<TRecord[]>;
}

export interface PgroongaSearchResult<TRecord> {
  records: TRecord[];
  hitsById: Map<string, PgroongaSearchHit>;
  total: number;
}

/**
 * limit ガードの最終的な上限値（DoS 防止）。
 *
 * 呼び出し側は通常 `extractPagination` 経由で `maxLimit=100` を経由するが、
 * 将来直接呼ばれた場合への保険としてヘルパ内でも再クランプする。
 *
 * ページネーションを返さない API（FAQ/Venues 等の配列返却）では
 * これを直接 `limit` に渡し、ヒット数がこの値を超える場合はサイレント切り捨てになる。
 * 中期改善（API 契約をページネーション化）までの暫定キャップ。
 */
export const PGROONGA_MAX_LIMIT = 100;

/**
 * pgroonga で全文検索 → id ベースで詳細を取得 → score 順に並び替えて返す共通ヘルパー。
 *
 * 各ドメインの search service はこのヘルパーを呼ぶだけで、検索 SQL の重複を避けられる。
 * 結果の整形（API レスポンスの shape）は呼び出し側が担当する。
 */
export async function pgroongaSearchAndFetch<TRecord extends { id: string }>(
  opts: PgroongaSearchOptions<TRecord>,
): Promise<PgroongaSearchResult<TRecord>> {
  // 入口で全識別子を一括バリデーション（Prisma.raw に乗る前に fail-fast）。
  // ident() を呼び出し時に検証するだけだと、構築途中で呼び出し側の意図しないカラム名混入に気付きにくい。
  validateIdentifiers(opts);

  // limit は呼び出し側でも extractPagination でクランプされているが、
  // ヘルパ内でも保険として再クランプ（多重防御）。
  const limit = Math.max(1, Math.min(PGROONGA_MAX_LIMIT, opts.limit));
  const offset = Math.max(0, opts.offset);

  const tableExpr = rawIdentifier(opts.table);
  const searchArrayExpr = Prisma.raw(
    `ARRAY[${opts.searchColumns.map((c) => `coalesce(${ident(c)}, '')`).join(", ")}]`,
  );
  const titleExpr = Prisma.raw(`coalesce(${ident(opts.titleColumn)}, '')`);
  const snippetExpr = opts.snippetColumn
    ? Prisma.raw(
        `coalesce(substr(${ident(opts.snippetColumn)}, 1, ${opts.snippetLength ?? 200}), '')`,
      )
    : Prisma.raw("''");

  // 注意: ARRAY[col1, col2] &@~ は複数列マッチ時に同じ行を複数行返すため、
  // id ごとに GROUP BY して重複排除する（score は MAX、ハイライトは同一行内では同値なので MAX で OK）
  const hits = await opts.prisma.$queryRaw<PgroongaSearchHit[]>(Prisma.sql`
    SELECT
      id,
      MAX(pgroonga_score(tableoid, ctid)) AS score,
      MAX(pgroonga_highlight_html(${titleExpr}, pgroonga_query_extract_keywords(${opts.escaped}))) AS "titleHighlighted",
      MAX(pgroonga_highlight_html(${snippetExpr}, pgroonga_query_extract_keywords(${opts.escaped}))) AS "snippetHighlighted"
    FROM ${tableExpr}
    WHERE ${searchArrayExpr} &@~ ${opts.escaped}
      AND (${opts.where})
    GROUP BY id
    ORDER BY score DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalRows = await opts.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(DISTINCT id)::bigint AS count
    FROM ${tableExpr}
    WHERE ${searchArrayExpr} &@~ ${opts.escaped}
      AND (${opts.where})
  `);
  const total = Number(totalRows[0]?.count ?? 0);

  if (hits.length === 0) {
    return { records: [], hitsById: new Map(), total };
  }

  const ids = hits.map((h) => h.id);
  const records = await opts.fetchByIds(ids);
  const byId = new Map(records.map((r) => [r.id, r]));
  const ordered = hits
    .map((h) => byId.get(h.id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  const hitsById = new Map(hits.map((h) => [h.id, h]));

  return { records: ordered, hitsById, total };
}

/**
 * SQL 識別子（テーブル名・カラム名）を SQL injection 安全に展開する。
 * `^[a-z_][a-z0-9_]*$` 以外は例外を投げる。
 */
function ident(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

function rawIdentifier(name: string): Prisma.Sql {
  return Prisma.raw(ident(name));
}

/**
 * pgroongaSearchAndFetch の入口で全識別子を一括検証する。
 * ident() は使用箇所ごとの個別検証だが、ここで先に揃えて呼ぶことで
 * 「呼び出し側のうっかりカラム名混入」をクエリ構築前に弾ける（多重防御）。
 */
function validateIdentifiers<TRecord extends { id: string }>(
  opts: PgroongaSearchOptions<TRecord>,
): void {
  ident(opts.table);
  ident(opts.titleColumn);
  if (opts.snippetColumn) ident(opts.snippetColumn);
  for (const c of opts.searchColumns) ident(c);
}
