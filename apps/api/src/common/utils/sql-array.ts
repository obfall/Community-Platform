/**
 * 生 SQL に uuid[] 配列パラメータを安全に渡すためのヘルパー。
 *
 * pgroonga 検索のように `id = ANY(...)::uuid[]` で id 群を渡すケースで、
 * 配列要素が UUID 形式であることをアプリ側で先に検証してから Prisma.sql に渡す。
 *
 * matched.map() のような内部生成の id 群は安全だが、将来呼び出し側を増やしたときの
 * 防御線として一元化する。フォーマット不正は SQL 実行前に例外で fail-fast。
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * id[] を `ANY(...)::uuid[]` で受けるためのバインドパラメータを構築する。
 *
 * - 全要素が UUID 形式であることを検証（不正な要素があれば例外）
 * - Prisma.sql のパラメータ展開を使うため SQL injection は構造的に不可能
 *
 * 使用例:
 * ```ts
 * Prisma.sql`SELECT * FROM users WHERE id = ANY(${uuidArrayParam(ids)}::uuid[])`
 * ```
 */
export function uuidArrayParam(ids: readonly string[]): string[] {
  for (const id of ids) {
    if (!UUID_RE.test(id)) {
      throw new Error(`Invalid UUID in array parameter: ${id}`);
    }
  }
  return [...ids];
}
