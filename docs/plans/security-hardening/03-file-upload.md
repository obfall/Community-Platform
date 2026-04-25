# 03: ファイルアップロード強化

## 目的

既に基本的なバリデーションは整っているが、本番運用に向けて以下を補強する:

- **MIME magic number 検証**（拡張子/Content-Type 偽装対策）
- **ファイル名のさらなる検証**（パス区切り文字・特殊文字対策）
- **アップロードサイズ閾値の見直し**
- **ウイルススキャン方針**（Phase 12 で本格導入する場合の準備）

## 現状調査

### 実装済み

- `apps/api/src/files/files.controller.ts`: multer の `fileSize: 100MB`
- `apps/api/src/files/files.service.ts`:
  - MIME ホワイトリスト（カテゴリ別: avatar, image, video, document）
  - サイズ制限（avatar 5MB 等カテゴリ別）
  - sharp で画像再エンコード（暗黙的に Magic Number 検証になっている）
  - 保存ファイル名は UUID + 拡張子（`originalName` は別カラム保管）
- フロント側でのサイズ事前チェックは未確認

### 不十分・未実装

- 動画・PDF など sharp で処理しないファイルの **Magic Number 明示検証**（拡張子偽装攻撃対策）
- アップロード前のウイルススキャン
- ファイル名の追加検証（NULL バイト、Unicode 正規化、`..` 等）
- フロント側でアップロード前のサイズ・MIME 簡易チェック（UX 向上）

## Magic Number とは

ファイルの先頭バイト列で実際のファイル種別を判定する手法。例:

| ファイル | Magic Number（hex）                  |
| -------- | ------------------------------------ |
| JPEG     | `FF D8 FF`                           |
| PNG      | `89 50 4E 47 0D 0A 1A 0A`            |
| GIF      | `47 49 46 38`                        |
| PDF      | `25 50 44 46`                        |
| MP4      | `xx xx xx xx 66 74 79 70` (offset 4) |
| ZIP      | `50 4B 03 04`                        |

ユーザーが `.exe` を `.jpg` にリネームしてアップロードしても、Magic Number で本物の種別を判定できる。

## 実装ステップ

### ステップ1: `file-type` ライブラリ導入

```bash
pnpm --filter @community-platform/api add file-type
```

`file-type` は Magic Number ベースで実際の種別を判定する。

### ステップ2: バリデーション関数

`apps/api/src/files/utils/file-magic-validator.ts`:

```ts
import { fileTypeFromBuffer } from "file-type";

const ALLOWED_BY_CATEGORY: Record<string, Set<string>> = {
  avatar: new Set(["image/jpeg", "image/png", "image/webp"]),
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  video: new Set(["video/mp4", "video/webm", "video/quicktime"]),
  document: new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]),
};

export async function validateFileMagic(
  buffer: Buffer,
  declaredMime: string,
  category: string,
): Promise<{ valid: boolean; actualMime?: string; reason?: string }> {
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected) {
    return { valid: false, reason: "ファイル種別を判定できませんでした" };
  }

  const allowed = ALLOWED_BY_CATEGORY[category];
  if (!allowed?.has(detected.mime)) {
    return {
      valid: false,
      actualMime: detected.mime,
      reason: `${category} カテゴリには ${detected.mime} は許可されていません`,
    };
  }

  // Content-Type ヘッダと実態が乖離している場合も拒否
  if (declaredMime !== detected.mime) {
    return {
      valid: false,
      actualMime: detected.mime,
      reason: `Content-Type ヘッダ (${declaredMime}) と実ファイル種別 (${detected.mime}) が一致しません`,
    };
  }

  return { valid: true, actualMime: detected.mime };
}
```

### ステップ3: files.service.ts に組み込み

```ts
// upload メソッドの先頭で
const validation = await validateFileMagic(file.buffer, file.mimetype, category);
if (!validation.valid) {
  throw new BusinessException(
    ErrorCode.VALIDATION_FAILED,
    400,
    validation.reason ?? "ファイル形式が無効です",
  );
}
```

### ステップ4: ファイル名追加検証

`apps/api/src/files/utils/filename-sanitizer.ts`:

```ts
const DANGEROUS_PATTERNS = [
  /\.\./, // path traversal
  /[\x00-\x1f]/, // control characters
  /[\\/]/, // path separators
  /^\./, // hidden file (leading dot)
];

export function sanitizeFilename(filename: string): string {
  // Unicode 正規化
  let sanitized = filename.normalize("NFC");
  // 危険なパターンを除去
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new BusinessException(
        ErrorCode.VALIDATION_FAILED,
        400,
        "ファイル名に使用できない文字が含まれています",
      );
    }
  }
  // 長さ制限
  if (sanitized.length > 255) {
    sanitized = sanitized.slice(0, 255);
  }
  return sanitized;
}
```

`originalName` 保存時にこれを通す。

### ステップ5: フロント側のプレチェック

`apps/web/lib/upload/validate.ts`:

```ts
const MAX_SIZES: Record<string, number> = {
  avatar: 5 * 1024 * 1024,
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  document: 20 * 1024 * 1024,
};

export function validateFileBeforeUpload(file: File, category: string): string | null {
  const max = MAX_SIZES[category] ?? 100 * 1024 * 1024;
  if (file.size > max) {
    return `ファイルサイズが上限 ${(max / 1024 / 1024).toFixed(0)}MB を超えています`;
  }
  // 簡易 MIME チェック（厳密な判定はバックエンドで行う）
  return null;
}
```

`apps/web/components/file-upload.tsx` 等のアップロード UI で使用してエラーをトーストで表示。バックエンド到達前にユーザー体験を改善。

### ステップ6: ウイルススキャン方針（Phase 12 で本格対応）

本計画では **方針決定のみ** とし、実装は Phase 12 のデプロイ準備に含める:

**選択肢**:

- **(A) ClamAV セルフホスト**: `clamav-daemon` を別コンテナで起動、`@nestjs/clamav` 等で接続。インフラ負担あり
- **(B) Cloudflare R2 のオブジェクトイベント + Workers でスキャン**: アップロード後に非同期で実行、隔離バケットへ移動
- **(C) 外部 SaaS**: VirusTotal API 等。アップロードサイズ大きいと従量課金が高くつく

→ Phase 12 で **(B) を第一候補** として検討、当面は AddOn として後付けする方針で問題ない。

### ステップ7: アップロード上限の再検討

現状 100MB はやや大きい。カテゴリ別に再設定:

| カテゴリ         | 現状     | 推奨                                  |
| ---------------- | -------- | ------------------------------------- |
| avatar           | 5MB      | 2MB                                   |
| image            | (要確認) | 10MB                                  |
| video            | (要確認) | 500MB（動画は重要、可能なら高い上限） |
| document         | (要確認) | 20MB                                  |
| 全体 multer 上限 | 100MB    | **500MB**（動画許容のため）           |

`videos` モジュールでは Cloudflare Stream へ直接アップロードする経路を別途用意済みなら、API 経由のサイズはむしろ小さく絞る判断もアリ（→ 要確認）。

## テスト方針

### 単体テスト

- `validateFileMagic` の各ケース（JPEG/PNG/拡張子偽装/未知形式）
- `sanitizeFilename` の各ケース（正常/path traversal/制御文字/長すぎ）

### 統合テスト

- 実際に `.jpg` 拡張子の `.exe` ファイルをアップロード → 拒否される
- 巨大ファイル（500MB+）→ multer 上限で 413 になる
- フロント側のプレチェックで弾かれる

## 確定事項（2026-04-25）

- ✅ `file-type` ライブラリで Magic Number 検証を導入
- ✅ アップロード上限: **avatar 2MB / image 10MB / document 20MB**
- ✅ **動画は Cloudflare Stream に直アップロード**（API は 100MB 維持）→ multer 全体上限は **100MB のまま**
- ✅ フロント側プレチェック導入（UX 改善）
- ✅ **ウイルススキャンは Phase 12 送り**（インフラ作業を伴うため）
- ✅ ファイル名 sanitize は 255 文字 + 特殊文字除去 で確定

## 残確認事項

- [ ] ZIP / その他特殊形式の許可カテゴリは現状不要で OK か（実装着手時に再確認）

## 成果物

- `apps/api/package.json`（file-type 追加）
- `apps/api/src/files/utils/file-magic-validator.ts`
- `apps/api/src/files/utils/filename-sanitizer.ts`
- `apps/api/src/files/files.service.ts`（validation 組み込み）
- `apps/api/src/files/files.controller.ts`（multer 上限調整）
- `apps/api/src/files/utils/*.spec.ts`（テスト）
- `apps/web/lib/upload/validate.ts`
- `apps/web/components/file-upload.tsx`（プレチェック組み込み、対象箇所要調査）
