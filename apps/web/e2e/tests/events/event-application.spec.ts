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

  test("申込実行 → 詳細ページに「申込済み」ボタン → 再申込は重複ブロック画面", async ({ page }) => {
    // 既存テストで申込済みになっている可能性を避けるため、別タイトルのイベントを使う。
    // デモシードに複数の「カジュアル交流イベント」がある前提（03-events.ts）。
    await page.goto("/events");
    await page.getByRole("link").filter({ hasText: "カジュアル交流イベント" }).nth(1).click();

    // 詳細ページの URL を保持してあとで戻って検証する
    await page.waitForURL(/\/events\/[0-9a-f-]+$/, { timeout: 30_000 });
    const detailUrl = page.url();

    // 既に myParticipation がある（シードでランダム seed されている）場合はスキップ
    const alreadyApplied = await page
      .getByRole("button", { name: "申込済み" })
      .isVisible()
      .catch(() => false);
    test.skip(alreadyApplied, "シードによって既に申込済みのためスキップ");

    await page.getByRole("button", { name: "参加申込" }).click();
    await page.waitForURL(/\/apply$/);

    // チケット選択
    const ticket = page.getByRole("radio").first();
    await expect(ticket).toBeVisible({ timeout: 15_000 });
    await ticket.check();

    // submit。メール/氏名はアカウント固定（readOnly）なので追加入力なしで通る前提。
    await page.getByRole("button", { name: /申込/, exact: false }).last().click();

    // onSuccess で詳細ページにリダイレクト
    await page.waitForURL(detailUrl, { timeout: 30_000 });
    await expect(page.getByRole("button", { name: "申込済み" })).toBeVisible({ timeout: 15_000 });

    // 直接 /apply に再アクセスすると重複ブロック画面が出る
    await page.goto(`${detailUrl}/apply`);
    await expect(page.getByText("このイベントには既に申込済みです")).toBeVisible({
      timeout: 15_000,
    });
  });
});
