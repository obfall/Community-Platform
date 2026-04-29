import { sanitizeFilename } from "./filename-sanitizer";
import { BusinessException } from "@/common/exceptions";

describe("sanitizeFilename: ファイル名サニタイザ", () => {
  describe("正常系", () => {
    it("通常の英字ファイル名はそのまま返す", () => {
      expect(sanitizeFilename("photo.jpg")).toBe("photo.jpg");
    });

    it("日本語ファイル名はそのまま返す（NFC 正規化後）", () => {
      expect(sanitizeFilename("写真.jpg")).toBe("写真.jpg");
    });

    it("拡張子なしファイル名も許可", () => {
      expect(sanitizeFilename("README")).toBe("README");
    });
  });

  describe("危険なパターンの拒否", () => {
    it("'..' を含むファイル名は拒否（パストラバーサル）", () => {
      expect(() => sanitizeFilename("../etc/passwd")).toThrow(BusinessException);
    });

    it("制御文字（NULL バイト）を含むファイル名は拒否", () => {
      expect(() => sanitizeFilename("file\x00.jpg")).toThrow(BusinessException);
    });

    it("パス区切り文字 '/' を含むファイル名は拒否", () => {
      expect(() => sanitizeFilename("dir/file.jpg")).toThrow(BusinessException);
    });

    it("バックスラッシュを含むファイル名は拒否", () => {
      expect(() => sanitizeFilename("dir\\file.jpg")).toThrow(BusinessException);
    });

    it("先頭が '.' のファイル名は拒否（隠しファイル）", () => {
      expect(() => sanitizeFilename(".env")).toThrow(BusinessException);
    });

    it("空文字は拒否", () => {
      expect(() => sanitizeFilename("")).toThrow(BusinessException);
    });
  });

  describe("長さ制限", () => {
    it("255 文字を超えるファイル名は切り詰める", () => {
      const long = "a".repeat(300) + ".txt";
      const result = sanitizeFilename(long);
      expect(result.length).toBe(255);
    });

    it("ちょうど 255 文字はそのまま", () => {
      const exact = "a".repeat(255);
      const result = sanitizeFilename(exact);
      expect(result).toBe(exact);
    });
  });
});
