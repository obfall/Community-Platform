/**
 * 掲示板機能の設定値定数。
 *
 * 文言（トースト・確認ダイアログ・空状態など）は next-intl の messages/{locale}/board.json で管理する。
 * このファイルには数値・関数だけを残し、UI 文字列は持たない。
 */

/** 各種ページネーション件数 */
export const BOARD_LIMITS = {
  /** カテゴリ内トピック一覧 */
  topicsPerPage: 20,
  /** トピック内投稿一覧 */
  postsPerPage: 20,
  /** 投稿内コメント一覧 */
  commentsPerPage: 20,
  /** 検索 hit カテゴリ集計用（API の MAX_PAGE_SIZE 上限） */
  searchOverview: 100,
} as const;

/** バリデーション制約 */
export const BOARD_VALIDATION = {
  categoryNameMaxLength: 100,
} as const;

/** Textarea の rows */
export const BOARD_TEXTAREA_ROWS = {
  topicBody: 8,
  postBody: 3,
  postReply: 3,
  commentBody: 2,
} as const;

/** React Query の staleTime（ミリ秒） */
export const BOARD_STALE_TIME = {
  /** カテゴリ一覧は変動が少ないので長め */
  categories: 5 * 60 * 1000,
  /** トピック一覧（通常 / 検索集計） */
  topics: 30 * 1000,
} as const;

/** アバター initials（名前先頭 2 文字） */
export function getAvatarInitials(name: string): string {
  return name.slice(0, 2);
}

/** DnD（@dnd-kit）の PointerSensor activation distance（px）。これ未満の移動はクリックとして扱う */
export const BOARD_DND_DRAG_DISTANCE = 8;
