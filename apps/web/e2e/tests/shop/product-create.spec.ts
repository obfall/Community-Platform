import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { uniqueLabel } from "../../helpers/test-id";

// 商品登録は ec_shop の create_product 権限（デフォルト owner / admin）が必要
test.use({ storageState: resolve(__dirname, "../../.auth/owner.json") });

test.describe("EC: 商品登録", () => {
  test("オーナーが商品を登録して EC管理 の一覧で確認できる", async ({ page }, testInfo) => {
    const name = uniqueLabel(testInfo, "テスト商品");

    await page.goto("/shop/manage");
    await expect(page.getByRole("heading", { name: "EC管理" })).toBeVisible({ timeout: 30_000 });

    // 右上の「商品登録」リンクから新規ページへ
    await page.getByRole("link", { name: "商品登録" }).click();
    await expect(page.getByRole("heading", { name: "商品登録" })).toBeVisible();

    // 必須項目（商品名・価格）を入力
    await page.getByPlaceholder("商品名を入力").fill(name);
    await page.getByPlaceholder("1000").fill("1500");

    // 登録 → EC管理 に戻る
    await page.getByRole("button", { name: "登録" }).click();
    await expect(page).toHaveURL(/\/shop\/manage/, { timeout: 15_000 });

    // 一覧を商品名で検索して表示を確認
    await page.getByPlaceholder("商品を検索...").fill(name);
    await page.getByPlaceholder("商品を検索...").press("Enter");
    await expect(page.getByRole("link", { name }).first()).toBeVisible({ timeout: 15_000 });
  });

  test("商品名・価格が未入力のとき登録ボタンは disabled", async ({ page }) => {
    await page.goto("/shop/new");
    await expect(page.getByRole("heading", { name: "商品登録" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "登録" })).toBeDisabled();
  });
});

test.describe("EC: ショップ一覧", () => {
  test("一覧の見出しが表示され、ヒットしない検索で空表示文言が出る", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "ショップ" })).toBeVisible({ timeout: 30_000 });

    await page.getByPlaceholder("商品を検索...").fill(`__NO_HIT_${Date.now()}__`);
    await page.getByPlaceholder("商品を検索...").press("Enter");
    await expect(page.getByText("商品がありません")).toBeVisible({ timeout: 10_000 });
  });
});
