import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

async function gotoRegister(page: import("@playwright/test").Page) {
  await page.goto("/register");
  await expect(page.getByLabel("名前")).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState("networkidle");
}

test.describe("ユーザー登録", () => {
  test("新規ユーザーが登録できてダッシュボードに到達する", async ({ page }) => {
    const email = `e2e-register-${Date.now()}@test.com`;
    await gotoRegister(page);
    await page.getByLabel("名前").fill("E2E テストユーザー");
    await page.getByLabel("メールアドレス").fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill("Password1!");
    await page.getByLabel("パスワード（確認）").fill("Password1!");
    await page.getByRole("button", { name: "アカウント作成" }).click();

    await page.waitForURL(/\/dashboard/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("既存メールでは登録できない", async ({ page }) => {
    await gotoRegister(page);
    await page.getByLabel("名前").fill("重複テスト");
    await page.getByLabel("メールアドレス").fill("e2e-admin@test.com");
    await page.getByLabel("パスワード", { exact: true }).fill("Password1!");
    await page.getByLabel("パスワード（確認）").fill("Password1!");
    await page.getByRole("button", { name: "アカウント作成" }).click();

    await expect(page.getByText("このメールアドレスは既に登録されています")).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("パスワード不一致で登録できない", async ({ page }) => {
    await gotoRegister(page);
    await page.getByLabel("名前").fill("不一致テスト");
    await page.getByLabel("メールアドレス").fill(`e2e-mismatch-${Date.now()}@test.com`);
    await page.getByLabel("パスワード", { exact: true }).fill("Password1!");
    await page.getByLabel("パスワード（確認）").fill("Different1!");
    await page.getByRole("button", { name: "アカウント作成" }).click();

    await expect(page.getByText("パスワードが一致しません")).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });
});
