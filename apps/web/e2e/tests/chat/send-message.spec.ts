import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

async function openNewRoomDialog(page: Page) {
  await page.goto("/chat");
  await expect(page.getByRole("heading", { name: "チャット" })).toBeVisible();
  await page.getByRole("heading", { name: "チャット" }).locator("..").getByRole("button").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("新規チャット")).toBeVisible();
  return dialog;
}

test.describe("チャット送信", () => {
  test("DMルームを作成してメッセージを送信できる", async ({ page }) => {
    const dialog = await openNewRoomDialog(page);

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

  test("ルーム未選択時はプレースホルダー文言が表示される", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByRole("heading", { name: "チャット" })).toBeVisible();
    // 右側パネル（メッセージ未選択状態）にプレースホルダーが出る
    await expect(page.getByText("チャットルームを選択してください")).toBeVisible();
  });

  test("グループルームを作成してメッセージを送信できる", async ({ page }) => {
    const dialog = await openNewRoomDialog(page);

    // 種別をグループに切り替え
    await dialog.getByLabel("種別").click();
    await page.getByRole("option", { name: "グループ" }).click();

    const groupName = `E2E グループ ${Date.now()}`;
    await dialog.getByPlaceholder("グループ名を入力").fill(groupName);

    // メンバーを 1 人追加
    await dialog.getByPlaceholder("名前を入力して検索...").fill("E2E Owner");
    await dialog.locator("button", { hasText: "E2E Owner" }).first().click();

    await dialog.getByRole("button", { name: "作成" }).click();
    await expect(dialog).toBeHidden();

    // 作成したグループのヘッダーが右パネルに表示される
    await expect(page.getByRole("heading", { name: groupName })).toBeVisible({ timeout: 15_000 });

    const messageInput = page.getByPlaceholder("メッセージを入力...");
    const message = `Group msg ${Date.now()}`;
    await messageInput.fill(message);
    await messageInput.press("Enter");
    await expect(page.getByText(message, { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});
