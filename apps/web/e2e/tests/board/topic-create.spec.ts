import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { uniqueLabel } from "../../helpers/test-id";

test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

test.describe("掲示板投稿", () => {
  test("メンバーがトピックを作成して掲示板で確認できる", async ({ page }, testInfo) => {
    const title = uniqueLabel(testInfo, "テストトピック");
    const body = `E2E テストで作成した本文です。${Date.now()}`;

    await page.goto("/board");
    await expect(page.getByRole("heading", { name: "掲示板" })).toBeVisible();

    await page.getByRole("button", { name: "新規トピック" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("新規トピック")).toBeVisible();

    await dialog.getByLabel("カテゴリ").click();
    const firstOption = page.getByRole("option").first();
    const categoryName = (await firstOption.textContent())?.trim() ?? "";
    await firstOption.click();
    await dialog.getByLabel("タイトル").fill(title);
    await dialog.getByLabel("本文").fill(body);
    await dialog.getByRole("button", { name: "トピックを作成" }).click();

    await expect(dialog).toBeHidden();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: new RegExp(`^${categoryName}\\s*\\(`) })
      .first()
      .click();
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });
  });
});
