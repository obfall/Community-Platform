import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

test.describe("チャット送信", () => {
  test("DMルームを作成してメッセージを送信できる", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByRole("heading", { name: "チャット" })).toBeVisible();

    await page.getByRole("heading", { name: "チャット" }).locator("..").getByRole("button").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("新規チャット")).toBeVisible();

    await dialog.getByPlaceholder("名前を入力して検索...").fill("E2E Owner");

    await dialog.locator("button", { hasText: "E2E Owner" }).first().click();

    await dialog.getByRole("button", { name: "作成" }).click();
    await expect(dialog).toBeHidden();

    const messageInput = page.getByPlaceholder("メッセージを入力...");
    await expect(messageInput).toBeVisible({ timeout: 15_000 });

    const message = `E2E test ${Date.now()}`;
    await messageInput.fill(message);
    await messageInput.press("Enter");

    await expect(page.getByText(message, { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});
