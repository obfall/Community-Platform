/**
 * アップロード前のクライアントサイド事前チェック。
 *
 * バックエンド (apps/api/src/files/files.service.ts) と上限を揃えてあるが、
 * これは UX 改善のための事前チェックで、実際の防御はバックエンドが担う。
 */

const MAX_SIZES_BYTES: Record<string, number> = {
  avatar: 2 * 1024 * 1024, // 2MB
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB（API 経由。Cloudflare Stream 直アップロードは別経路）
  document: 20 * 1024 * 1024, // 20MB
};

const ACCEPTED_MIME_BY_CATEGORY: Record<string, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

export type UploadCategory = keyof typeof MAX_SIZES_BYTES;

/**
 * アップロード前にファイルを検証。エラーメッセージ（ユーザー向け文字列）を返す。
 * 問題なしなら null。
 */
export function validateFileBeforeUpload(file: File, category: string): string | null {
  const max = MAX_SIZES_BYTES[category];
  if (max === undefined) return null;

  if (file.size > max) {
    const maxMb = Math.round(max / (1024 * 1024));
    return `ファイルサイズが上限 ${maxMb}MB を超えています`;
  }

  // Content-Type が明らかにカテゴリと異なる場合は事前に警告
  const allowed = ACCEPTED_MIME_BY_CATEGORY[category];
  if (allowed && file.type && !allowed.includes(file.type)) {
    return `この種類のファイルはアップロードできません（${file.type}）`;
  }

  return null;
}

/**
 * input[type=file] の accept 属性に渡す MIME カンマ区切り文字列。
 */
export function acceptAttrFor(category: string): string {
  return ACCEPTED_MIME_BY_CATEGORY[category]?.join(",") ?? "";
}
