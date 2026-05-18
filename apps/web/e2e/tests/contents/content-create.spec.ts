import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { uniqueLabel } from "../../helpers/test-id";

test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

test.describe("コンテンツ作成", () => {
  test("メンバーがコンテンツを作成して一覧で確認できる", async ({ page }, testInfo) => {
    const name = uniqueLabel(testInfo, "テストコンテンツ");
    const description = `E2E テストで作成した説明です。${Date.now()}`;

    await page.goto("/content");
    await expect(page.getByRole("heading", { name: "コンテンツ" })).toBeVisible();

    // 一覧右上の「作成」ボタンから新規ページへ
    await page.getByRole("link", { name: "作成" }).click();
    await expect(page.getByRole("heading", { name: "コンテンツ作成" })).toBeVisible();

    // フォーム入力
    await page.getByPlaceholder("コンテンツ名を入力").fill(name);
    await page.getByPlaceholder("コンテンツの説明（任意）").fill(description);

    // 公開ステータスを「公開」に切り替えて一覧で見えるようにする
    await page.getByLabel("公開ステータス").click();
    await page.getByRole("option", { name: "公開" }).click();

    // フッターの作成ボタン
    await page.getByRole("button", { name: "作成" }).click();

    // 一覧ページに遷移してタイトルが表示される
    await expect(page).toHaveURL(/\/content$/);
    await page.getByPlaceholder("コンテンツを検索...").fill(name);
    await page.getByPlaceholder("コンテンツを検索...").press("Enter");
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  });

  test("コンテンツが 1 件もないときの空表示文言が出る", async ({ page }) => {
    await page.goto("/content");
    await expect(page.getByRole("heading", { name: "コンテンツ" })).toBeVisible();
    // 検索でヒットしないキーワードを入れて空表示を確認
    await page.getByPlaceholder("コンテンツを検索...").fill(`__NO_HIT_${Date.now()}__`);
    await page.getByPlaceholder("コンテンツを検索...").press("Enter");
    await expect(page.getByText("コンテンツがありません")).toBeVisible({ timeout: 10_000 });
  });
});
