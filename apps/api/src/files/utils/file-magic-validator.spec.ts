import { validateFileMagicWith, type FileTypeFromBuffer } from "./file-magic-validator";

/**
 * 検出関数を mock として直接渡せるので jest.mock 不要。
 * 実 file-type ライブラリの呼び出しは E2E（Phase 11.5）で担保する。
 */
const detectorReturning =
  (mime: string | undefined): FileTypeFromBuffer =>
  () =>
    Promise.resolve(mime ? { mime, ext: mime.split("/")[1] ?? "bin" } : undefined);

describe("validateFileMagicWith: Magic Number 判定ロジック", () => {
  describe("正しい組み合わせ", () => {
    it("検出 MIME が宣言と一致しカテゴリで許可されていれば valid", async () => {
      const result = await validateFileMagicWith(
        detectorReturning("image/jpeg"),
        Buffer.alloc(0),
        "image/jpeg",
        "image",
      );
      expect(result.valid).toBe(true);
      expect(result.actualMime).toBe("image/jpeg");
    });

    it("avatar カテゴリの PNG も valid", async () => {
      const result = await validateFileMagicWith(
        detectorReturning("image/png"),
        Buffer.alloc(0),
        "image/png",
        "avatar",
      );
      expect(result.valid).toBe(true);
    });

    it("document カテゴリの PDF も valid", async () => {
      const result = await validateFileMagicWith(
        detectorReturning("application/pdf"),
        Buffer.alloc(0),
        "application/pdf",
        "document",
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("カテゴリ違反（カテゴリで許可されていない MIME）", () => {
    it("avatar カテゴリに PDF をアップロードしたら invalid", async () => {
      const result = await validateFileMagicWith(
        detectorReturning("application/pdf"),
        Buffer.alloc(0),
        "application/pdf",
        "avatar",
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("avatar");
      expect(result.actualMime).toBe("application/pdf");
    });

    it("image カテゴリに動画をアップロードしたら invalid", async () => {
      const result = await validateFileMagicWith(
        detectorReturning("video/mp4"),
        Buffer.alloc(0),
        "video/mp4",
        "image",
      );
      expect(result.valid).toBe(false);
    });
  });

  describe("Content-Type ヘッダ偽装", () => {
    it("検出 MIME (PNG) と宣言 MIME (JPEG) が乖離していたら invalid", async () => {
      const result = await validateFileMagicWith(
        detectorReturning("image/png"),
        Buffer.alloc(0),
        "image/jpeg",
        "image",
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("一致しません");
    });

    it("EXE を image/jpeg と偽装した場合は invalid（カテゴリ違反として）", async () => {
      // file-type は exe を image として認識しない（application/x-msdownload 等）
      const result = await validateFileMagicWith(
        detectorReturning("application/x-msdownload"),
        Buffer.alloc(0),
        "image/jpeg",
        "image",
      );
      expect(result.valid).toBe(false);
    });
  });

  describe("判定不能ケース", () => {
    it("file-type が undefined を返すと invalid", async () => {
      const result = await validateFileMagicWith(
        detectorReturning(undefined),
        Buffer.alloc(0),
        "image/jpeg",
        "image",
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("判定できませんでした");
    });
  });

  describe("未知カテゴリ", () => {
    it("カテゴリリストに無い場合は検出 MIME をそのまま valid 判定", async () => {
      const result = await validateFileMagicWith(
        detectorReturning("application/zip"),
        Buffer.alloc(0),
        "application/zip",
        "unknown-category",
      );
      expect(result.valid).toBe(true);
      expect(result.actualMime).toBe("application/zip");
    });
  });
});
