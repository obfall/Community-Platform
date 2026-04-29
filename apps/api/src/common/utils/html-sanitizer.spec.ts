import { sanitizeRichText } from "./html-sanitizer";

describe("sanitizeRichText: HTML サニタイザ", () => {
  describe("script タグ等の禁止タグ", () => {
    it("<script> タグは中身ごと完全に除去される", () => {
      const result = sanitizeRichText("<p>hi</p><script>alert(1)</script>");
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert(1)");
      expect(result).toContain("<p>hi</p>");
    });

    it("<iframe> タグは除去される", () => {
      const result = sanitizeRichText('<iframe src="https://evil.example.com"></iframe>');
      expect(result).not.toContain("iframe");
    });

    it("<div> など許可リスト外のタグは除去される（中身のテキストは残る）", () => {
      const result = sanitizeRichText("<div>text</div>");
      expect(result).not.toContain("<div");
      expect(result).toContain("text");
    });
  });

  describe("on* イベント属性", () => {
    it("<img> の onerror は削除されるが <img> 自体と src/alt は残る", () => {
      const result = sanitizeRichText('<img src="/x.png" alt="x" onerror="alert(1)">');
      expect(result).toContain("<img");
      expect(result).toContain('src="/x.png"');
      expect(result).toContain('alt="x"');
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("alert");
    });

    it("<p onclick> の onclick は削除される", () => {
      const result = sanitizeRichText('<p onclick="alert(1)">x</p>');
      expect(result).not.toContain("onclick");
      expect(result).toContain("<p>x</p>");
    });
  });

  describe("javascript: / data: スキーム", () => {
    it('<a href="javascript:..."> の href は除去される', () => {
      const result = sanitizeRichText('<a href="javascript:alert(1)">link</a>');
      expect(result).not.toContain("javascript:");
      expect(result).not.toContain("alert");
    });

    it("data: URI も拒否される", () => {
      const result = sanitizeRichText('<a href="data:text/html,<script>alert(1)</script>">x</a>');
      expect(result).not.toContain("data:");
      expect(result).not.toContain("script");
    });

    it("https:// は許可される", () => {
      const result = sanitizeRichText('<a href="https://example.com">link</a>');
      expect(result).toContain('href="https://example.com"');
    });

    it("mailto: も許可される", () => {
      const result = sanitizeRichText('<a href="mailto:test@example.com">mail</a>');
      expect(result).toContain('href="mailto:test@example.com"');
    });
  });

  describe("<a> タグの target / rel 自動付与", () => {
    it("<a> には rel=noopener noreferrer と target=_blank が強制付与される", () => {
      const result = sanitizeRichText('<a href="https://example.com">x</a>');
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('target="_blank"');
    });
  });

  describe("許可タグ・属性は保持される", () => {
    it("見出し・段落・装飾タグはそのまま残る", () => {
      const result = sanitizeRichText(
        "<h1>Title</h1><p>Body <strong>bold</strong> <em>italic</em></p>",
      );
      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
    });

    it("リスト系（ul/ol/li）はそのまま残る", () => {
      const result = sanitizeRichText("<ul><li>a</li><li>b</li></ul>");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>a</li>");
    });

    it("テーブル（table/thead/tbody/tr/th/td）はそのまま残る", () => {
      const result = sanitizeRichText(
        "<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>",
      );
      expect(result).toContain("<table>");
      expect(result).toContain("<th>H</th>");
      expect(result).toContain("<td>D</td>");
    });

    it("class 属性は保持される", () => {
      const result = sanitizeRichText('<p class="note">x</p>');
      expect(result).toContain('class="note"');
    });
  });
});
