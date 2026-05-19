// ============================================================
// Videos: input limits
// ============================================================
//
// 動画編集フォーム / API DTO で参照する上限値。
// バック (class-validator の @ArrayMaxSize / @MaxLength) と
// フロント (入力フォームの maxLength / 件数チェック) で同じ値を参照する。

/** 動画タイトルの最大文字数 */
export const MAX_VIDEO_TITLE_LENGTH = 200;

/** 動画タスクのタイトル最大文字数 */
export const MAX_VIDEO_TASK_TITLE_LENGTH = 200;

/** 講師名の最大文字数 */
export const MAX_VIDEO_INSTRUCTOR_NAME_LENGTH = 100;

/** 講師の所属の最大文字数 */
export const MAX_VIDEO_INSTRUCTOR_AFFILIATION_LENGTH = 200;

/** 1 動画に登録できる講師の最大数 */
export const MAX_VIDEO_INSTRUCTORS = 20;

/** 1 動画に紐付けられる配布資料の最大数 */
export const MAX_VIDEO_ATTACHMENTS = 20;

/** 1 動画に紐付けられるタスクの最大数 */
export const MAX_VIDEO_TASKS = 50;

/** 検索キーワードの最大文字数 */
export const MAX_VIDEO_SEARCH_LENGTH = 200;

/** アップロード可能な動画ファイルの最大サイズ (バイト) */
export const MAX_VIDEO_UPLOAD_BYTES = 500 * 1024 * 1024;

/** 動画パスワードの桁数 (4桁の半角数字) */
export const VIDEO_PASSWORD_PATTERN = /^(\d{4})?$/;
export const VIDEO_PASSWORD_LENGTH = 4;

/**
 * 視聴完了とみなす再生比率（watchedSeconds / totalSeconds の閾値）。
 * バック (updateWatchProgress の isCompleted 判定) と
 * フロント (詳細ページの「次の動画 CTA」表示判定など) で共通。
 */
export const VIDEO_WATCH_COMPLETION_THRESHOLD = 0.9;
