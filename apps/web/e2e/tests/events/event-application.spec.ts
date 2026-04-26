import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

test.describe("イベント申込", () => {
  test("募集中イベントの申込ページに遷移してチケットを選択できる", async ({ page }) => {
    await page.goto("/events");
    await expect(page.getByRole("heading", { name: "イベント" })).toBeVisible();

    await page.getByRole("link").filter({ hasText: "カジュアル交流イベント" }).first().click();

    const applyButton = page.getByRole("button", { name: "参加申込" });
    await expect(applyButton).toBeVisible({ timeout: 90_000 });
    await applyButton.click();

    await page.waitForURL(/\/apply$/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "参加申込" })).toBeVisible({
      timeout: 30_000,
    });

    const ticket = page.getByRole("radio").first();
    await expect(ticket).toBeVisible({ timeout: 15_000 });
    await ticket.check();
  });
});
