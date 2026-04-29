/**
 * Magic Number ベースの実ファイル種別検証。
 *
 * 拡張子・Content-Type ヘッダはクライアントが偽装可能なので、
 * file-type ライブラリでファイル先頭バイト列から実 MIME を判定する。
 *
 * file-type は ESM only。tsconfig が moduleResolution: "node" のため
 * 静的 import は型解決できない → Function コンストラクタで動的 import を隠蔽し、
 * 実行時には Node.js が ESM をネイティブ解決する。
 *
 * テスト容易性のため、判定ロジック (validateFileMagicWith) と
 * ライブラリ呼び出し (validateFileMagic) を分離してある。
 */

export type FileTypeFromBuffer = (
  buffer: Uint8Array | ArrayBuffer,
) => Promise<{ ext: string; mime: string } | undefined>;

let cached: FileTypeFromBuffer | null = null;

async function getDetector(): Promise<FileTypeFromBuffer> {
  if (cached) return cached;
  // file-type は ESM only。tsconfig moduleResolution: "node" では静的 import が
  // 型解決できないため、Function コンストラクタで動的 import を隠蔽する。
  // 実行時には Node.js が ESM パッケージをネイティブ解決する。
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const importer = new Function("s", "return import(s)") as (s: string) => Promise<{
    fileTypeFromBuffer: FileTypeFromBuffer;
  }>;
  const mod = await importer("file-type");
  cached = mod.fileTypeFromBuffer;
  return cached;
}

const ALLOWED_BY_CATEGORY: Record<string, Set<string>> = {
  avatar: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  video: new Set(["video/mp4", "video/webm", "video/quicktime"]),
  document: new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]),
};

export interface FileMagicResult {
  valid: boolean;
  actualMime?: string;
  reason?: string;
}

/**
 * 検出関数を注入可能な形の判定ロジック。
 * テストでは fileTypeFromBuffer の挙動を直接 mock してこちらを呼ぶ。
 */
export async function validateFileMagicWith(
  detect: FileTypeFromBuffer,
  buffer: Buffer,
  declaredMime: string,
  category: string,
): Promise<FileMagicResult> {
  const detected = await detect(buffer);

  if (!detected) {
    return {
      valid: false,
      reason: "ファイル種別を判定できませんでした",
    };
  }

  const allowed = ALLOWED_BY_CATEGORY[category];
  if (!allowed) {
    return { valid: true, actualMime: detected.mime };
  }

  if (!allowed.has(detected.mime)) {
    return {
      valid: false,
      actualMime: detected.mime,
      reason: `${category} カテゴリでは ${detected.mime} は許可されていません`,
    };
  }

  // Content-Type ヘッダと実態が乖離している場合も拒否（拡張子偽装対策）
  if (declaredMime !== detected.mime) {
    return {
      valid: false,
      actualMime: detected.mime,
      reason: `Content-Type ヘッダ (${declaredMime}) と実ファイル種別 (${detected.mime}) が一致しません`,
    };
  }

  return { valid: true, actualMime: detected.mime };
}

/**
 * 公開 API。実 file-type ライブラリを使って検証する。
 */
export async function validateFileMagic(
  buffer: Buffer,
  declaredMime: string,
  category: string,
): Promise<FileMagicResult> {
  const detect = await getDetector();
  return validateFileMagicWith(detect, buffer, declaredMime, category);
}
