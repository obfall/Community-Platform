/**
 * 掲示板機能の設定値・文言定数。
 *
 * 目的:
 * - マジックナンバー（limit / maxLength / rows / staleTime）の意味を明示
 * - 文言（トースト / 確認ダイアログ / 空状態）を一箇所に集約し、文言調整・i18n 化への準備
 *
 * 将来 next-intl 等で i18n 化する際は、このファイルの文字列群をメッセージカタログに移し、
 * 呼び出し側を useTranslations 等に差し替える形で段階的に置換できる。
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

/** トースト（成功） */
export const BOARD_TOAST_MESSAGES = {
  categoryCreated: "カテゴリを作成しました",
  categoryUpdated: "カテゴリを更新しました",
  categoryDeleted: "カテゴリを削除しました",
  topicCreated: "トピックを作成しました",
  topicUpdated: "トピックを更新しました",
  topicDeleted: "トピックを削除しました",
  postUpdated: "投稿を更新しました",
  postDeleted: "投稿を削除しました",
  commentUpdated: "コメントを更新しました",
  commentDeleted: "コメントを削除しました",
  topicPinned: "ピン留めしました",
  topicUnpinned: "ピン留めを解除しました",
} as const;

/** 削除確認ダイアログの文言 */
export const BOARD_CONFIRM_MESSAGES = {
  deleteCategory: "このカテゴリを削除しますか？",
  deleteTopic: "このトピックを削除しますか？",
  deletePost: "この投稿を削除しますか？",
  deleteComment: "このコメントを削除しますか？",
} as const;

/** 空状態・該当なしメッセージ */
export const BOARD_EMPTY_MESSAGES = {
  noCategories: "カテゴリがまだありません",
  noCategoriesAdminHint: "。上の「カテゴリ追加」ボタンから作成してください。",
  noTopics: "トピックはまだありません",
  noPosts: "まだ投稿はありません",
  noComments: "まだコメントはありません",
  noSearchResults: (q: string) => `「${q}」に該当するトピックは見つかりませんでした`,
} as const;
