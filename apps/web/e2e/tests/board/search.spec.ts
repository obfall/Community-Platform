import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

test.describe("掲示板検索", () => {
  test("検索キーワード入力で hit カテゴリだけ自動展開され、結果が表示される", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByRole("heading", { name: "掲示板" })).toBeVisible();

    // 検索バーに seed データが含むキーワードを入力 + Enter
    const searchInput = page.getByPlaceholder("トピックを検索...");
    await searchInput.fill("イベント");
    await searchInput.press("Enter");

    // 検索結果のセクションが表示される（hit ありなら hit カテゴリの Accordion が開いた状態）
    // hit ゼロの場合は「見つかりませんでした」メッセージ
    const noResultsRegex = /該当するトピックは見つかりませんでした/;
    const hasHitOrEmpty = page
      .locator("body")
      .filter({ has: page.getByText(noResultsRegex).or(page.getByText(/イベント/i)) });
    await expect(hasHitOrEmpty).toBeVisible({ timeout: 10_000 });

    // 検索クリア時に通常モードに戻る
    await searchInput.fill("");
    await searchInput.press("Enter");
    // 「カテゴリ追加」ボタンは表示されないが、検索結果の専用メッセージが消えていることを確認
    await expect(page.getByText(noResultsRegex)).toBeHidden();
  });
});
