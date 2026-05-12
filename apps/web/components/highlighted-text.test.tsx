import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HighlightedText } from "./highlighted-text";

describe("HighlightedText: pgroonga ハイライト描画", () => {
  it("html 指定時、許可されたタグ（span.keyword）はそのまま描画される", () => {
    render(
      <HighlightedText
        html={'重要な<span class="keyword">イベント</span>のお知らせ'}
        fallback="重要なイベントのお知らせ"
      />,
    );
    const span = document.querySelector("span.keyword");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("イベント");
  });

  it("XSS の <script> タグは DOMPurify により除去される", () => {
    render(<HighlightedText html={'<script>alert("xss")</script>テキスト'} fallback="テキスト" />);
    expect(document.querySelector("script")).toBeNull();
  });

  it("html 未指定時は fallback プレーンテキストを描画する", () => {
    render(<HighlightedText html={null} fallback="プレーン" />);
    expect(screen.getByText("プレーン")).toBeInTheDocument();
  });

  it("html / fallback 両方未指定なら空要素を描画する", () => {
    const { container } = render(<HighlightedText />);
    expect(container.querySelector("span")?.textContent).toBe("");
  });

  it("as=div 指定で div として描画される", () => {
    render(<HighlightedText html={null} fallback="テキスト" as="div" />);
    expect(screen.getByText("テキスト").tagName.toLowerCase()).toBe("div");
  });
});
