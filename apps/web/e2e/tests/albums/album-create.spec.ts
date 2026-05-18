import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { uniqueLabel } from "../../helpers/test-id";

test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

test.describe("アルバム作成", () => {
  test("メンバーがアルバムを作成して一覧で確認できる", async ({ page }, testInfo) => {
    const title = uniqueLabel(testInfo, "テストアルバム");
    const caption = `E2E テストで作成したキャプションです。${Date.now()}`;

    await page.goto("/albums");
    await expect(page.getByRole("heading", { name: "アルバム" })).toBeVisible();

    // 一覧右上の「作成」ボタンから新規ページへ
    await page.getByRole("link", { name: "作成" }).click();
    await expect(page.getByRole("heading", { name: "アルバム作成" })).toBeVisible();

    // フォーム入力
    await page.getByPlaceholder("アルバムのタイトル").fill(title);
    await page.getByPlaceholder("アルバムのキャプション（任意）").fill(caption);

    // 公開ステータスを「公開」に切り替えて一覧で見えるようにする
    await page.getByLabel("公開ステータス").click();
    await page.getByRole("option", { name: "公開" }).click();

    // フッターの作成ボタン
    await page.getByRole("button", { name: "作成" }).click();

    // 詳細ページに遷移してタイトルが表示される
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });

    // 一覧ページに戻ってもタイトルが表示される
    await page.goto("/albums");
    await page.getByPlaceholder("アルバムを検索...").fill(title);
    await page.getByPlaceholder("アルバムを検索...").press("Enter");
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
  });

  test("アルバムが 1 件もないときの空表示文言が出る", async ({ page }) => {
    await page.goto("/albums");
    await expect(page.getByRole("heading", { name: "アルバム" })).toBeVisible();
    // 検索でヒットしないキーワードを入れて空表示を確認
    await page.getByPlaceholder("アルバムを検索...").fill(`__NO_HIT_${Date.now()}__`);
    await page.getByPlaceholder("アルバムを検索...").press("Enter");
    await expect(page.getByText("アルバムがありません")).toBeVisible({ timeout: 10_000 });
  });
});
