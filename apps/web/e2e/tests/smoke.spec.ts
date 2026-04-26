import { test, expect } from "@playwright/test";

test.describe("smoke: 未ログイン状態の基本導線", () => {
  test("ルートにアクセスするとログイン画面へリダイレクトされる", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("ログイン画面にメール・パスワード・送信ボタンが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });
});
