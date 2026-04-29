import { HttpStatus } from "@nestjs/common";
import { ErrorCode } from "@community-platform/shared";
import { BusinessException } from "@/common/exceptions";

const DANGEROUS_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\.\./, reason: "パストラバーサル文字 '..' が含まれています" },
  // eslint-disable-next-line no-control-regex
  { pattern: /[\x00-\x1f]/, reason: "制御文字が含まれています" },
  { pattern: /[\\/]/, reason: "パス区切り文字が含まれています" },
  { pattern: /^\./, reason: "ファイル名が '.' で始まっています" },
];

const MAX_FILENAME_LENGTH = 255;

/**
 * ユーザー由来のファイル名を検証して正規化版を返す。
 * 危険なパターンが見つかれば BusinessException で拒否。
 *
 * - Unicode 正規化（NFC）でビジュアル偽装を防ぐ
 * - 255 文字超過は切り詰め（既存ファイルシステムの制約）
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) {
    throw new BusinessException(
      ErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      "ファイル名が空です",
    );
  }

  // Unicode 正規化（半角/全角・合成済み/分解済みを統一）
  const normalized = filename.normalize("NFC");

  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(normalized)) {
      throw new BusinessException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        `ファイル名に使用できない文字が含まれています: ${reason}`,
      );
    }
  }

  return normalized.length > MAX_FILENAME_LENGTH
    ? normalized.slice(0, MAX_FILENAME_LENGTH)
    : normalized;
}
