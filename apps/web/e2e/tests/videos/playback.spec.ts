import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

test.describe("動画再生", () => {
  test("動画一覧から詳細を開いてプレイヤーが表示される", async ({ page }) => {
    await page.goto("/videos");
    await expect(page.getByRole("heading", { name: "動画" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    const firstVideoLink = page.locator('a[href^="/videos/"]').first();
    await expect(firstVideoLink).toBeVisible({ timeout: 60_000 });
    const href = await firstVideoLink.getAttribute("href");
    if (!href) throw new Error("動画リンクが見つかりません");

    await firstVideoLink.click();
    await page.waitForURL(new RegExp(`${href.replace(/[/]/g, "\\/")}$`), {
      timeout: 60_000,
    });

    await expect(page.locator("video")).toBeVisible({ timeout: 30_000 });
  });
});
