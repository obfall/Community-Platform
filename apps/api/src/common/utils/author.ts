import type { Prisma } from "@prisma/client";

/**
 * 投稿者・作成者・提供者など、user の「一覧表示用の最低限のフィールド」を取得する
 * Prisma select。各 service の `include` の中でこの定数を使い、
 * 取得した payload を `formatAuthor` で API レスポンス shape に変換する。
 */
export const AUTHOR_SELECT = {
  id: true,
  name: true,
  profile: { select: { avatarUrl: true } },
} as const satisfies Prisma.UserSelect;

/**
 * formatAuthor が受け取れる最低限の shape。
 * Prisma の `UserGetPayload<{ select: typeof AUTHOR_SELECT }>` だと
 * `profile` が必須（null 許容）になり、別経路で取得した payload を渡す際に
 * 型エラーになる。optional + nullable で受けることでどちらにも対応する。
 */
export interface AuthorLike {
  id: string;
  name: string;
  profile?: { avatarUrl: string | null } | null;
}

export type AuthorPayload = Prisma.UserGetPayload<{ select: typeof AUTHOR_SELECT }>;

/**
 * AUTHOR_SELECT で取得した user payload を `{ id, name, avatarUrl }` の
 * フラットな shape に変換する。各 service の formatList で繰り返していた
 * `{ id: u.id, name: u.name, avatarUrl: u.profile?.avatarUrl ?? null }` を集約。
 */
export function formatAuthor(user: AuthorLike) {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}
