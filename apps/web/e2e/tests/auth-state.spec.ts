import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

const authDir = resolve(__dirname, "../.auth");

test.describe("storageState: 事前ログイン状態の検証", () => {
  test("admin の storageState で /dashboard にアクセスできる", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: resolve(authDir, "admin.json"),
    });
    const page = await context.newPage();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await context.close();
  });

  test("owner の storageState で /dashboard にアクセスできる", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: resolve(authDir, "owner.json"),
    });
    const page = await context.newPage();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await context.close();
  });

  test("member の storageState で /dashboard にアクセスできる", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: resolve(authDir, "member.json"),
    });
    const page = await context.newPage();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await context.close();
  });
});
