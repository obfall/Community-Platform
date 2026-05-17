import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.use({ storageState: resolve(__dirname, "../../.auth/admin.json") });

test.describe("動画アップロードページ", () => {
  test("各カード（シリーズ・動画情報・講師・配布資料・タスク・公開設定）が表示される", async ({
    page,
  }) => {
    await page.goto("/videos/new");

    await expect(page.getByRole("heading", { name: "動画アップロード" })).toBeVisible({
      timeout: 30_000,
    });

    // videos.form.card.* のタイトル
    await expect(page.getByRole("heading", { name: "シリーズ・順番" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "動画情報" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "担当講師" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "配布資料" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "タスク" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "公開設定" })).toBeVisible();
  });

  test("ファイルピッカーのヒントとパスワード/閲覧期限ラベルが表示される", async ({ page }) => {
    await page.goto("/videos/new");
    await expect(page.getByRole("heading", { name: "動画アップロード" })).toBeVisible({
      timeout: 30_000,
    });

    // videos.form.label.filePickerHint / filePickerSizeHint
    await expect(page.getByText("クリックして動画ファイルを選択")).toBeVisible();
    await expect(page.getByText("MP4, MOV, WebM（最大 500MB）")).toBeVisible();

    // videos.form.label.password / passwordPlaceholderEmpty
    await expect(page.getByText("パスワード（4桁数字）", { exact: false })).toBeVisible();
    await expect(page.getByPlaceholder("空欄の場合はパスワードなし")).toBeVisible();

    // videos.form.label.availableUntilHint
    await expect(page.getByText("空欄の場合は無期限")).toBeVisible();
  });

  test("アップロードボタンはタイトル/ファイル未入力時は disabled", async ({ page }) => {
    await page.goto("/videos/new");
    await expect(page.getByRole("heading", { name: "動画アップロード" })).toBeVisible({
      timeout: 30_000,
    });

    // videos.new.uploadAction
    const uploadButton = page.getByRole("button", { name: "アップロード" }).last();
    await expect(uploadButton).toBeDisabled();
  });
});
