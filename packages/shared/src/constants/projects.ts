// プロジェクト編集フォーム / API DTO で参照する上限値。
// バック (class-validator) とフロント (zod / TagInput) で同じ値を参照する。

/** 1 プロジェクトに付けられるタグの最大数 */
export const MAX_PROJECT_TAGS = 5;

/** タグ名の最大文字数（Tag.name の DB 制約 VARCHAR(50) に合わせる） */
export const MAX_PROJECT_TAG_LENGTH = 50;
