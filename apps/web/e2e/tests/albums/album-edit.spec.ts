import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { uniqueLabel } from "../../helpers/test-id";

test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

test.describe("アルバム編集", () => {
  test("作成→編集ページからタイトルを更新できる", async ({ page }, testInfo) => {
    const title = uniqueLabel(testInfo, "編集前アルバム");
    const newTitle = uniqueLabel(testInfo, "編集後アルバム");

    // ---- 作成 ----
    await page.goto("/albums/new");
    await expect(page.getByRole("heading", { name: "アルバム作成" })).toBeVisible();
    await page.getByPlaceholder("アルバムのタイトル").fill(title);
    await page.getByLabel("公開ステータス").click();
    await page.getByRole("option", { name: "公開" }).click();
    await page.getByRole("button", { name: "作成" }).click();

    // 詳細ページに遷移
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });

    // ---- 編集 ----
    await page.getByRole("link", { name: "編集" }).click();
    await expect(page.getByRole("heading", { name: "アルバム編集" })).toBeVisible();

    const titleInput = page.getByLabel("タイトル");
    await titleInput.fill(newTitle);
    await page.getByRole("button", { name: "保存" }).click();

    // 詳細に戻って新タイトルが反映される
    await expect(page.getByRole("heading", { name: newTitle })).toBeVisible({ timeout: 15_000 });
  });
});
