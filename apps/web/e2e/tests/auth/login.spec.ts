import { test, expect, type Page } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

async function gotoLogin(page: Page) {
  await page.goto("/login");
  await expect(page.getByLabel("メールアドレス")).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
}

test.describe("ログイン", () => {
  test("正しい認証情報でログインしてダッシュボードに到達する", async ({ page }) => {
    await gotoLogin(page);
    await page.getByLabel("メールアドレス").fill("e2e-member@test.com");
    await page.getByLabel("パスワード").fill("qaz1234");
    await page.getByRole("button", { name: "ログイン" }).click();

    await page.waitForURL(/\/dashboard/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("間違ったパスワードでエラー表示されログイン画面に留まる", async ({ page }) => {
    await gotoLogin(page);
    await page.getByLabel("メールアドレス").fill("e2e-member@test.com");
    await page.getByLabel("パスワード").fill("wrong-password");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page.getByText("メールアドレスまたはパスワードが正しくありません")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("退会済みユーザーはログインできない", async ({ page }) => {
    await gotoLogin(page);
    await page.getByLabel("メールアドレス").fill("okada.withdrawn@test.com");
    await page.getByLabel("パスワード").fill("qaz1234");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page.getByText("メールアドレスまたはパスワードが正しくありません")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
