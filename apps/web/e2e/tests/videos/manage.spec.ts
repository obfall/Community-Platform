import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.use({ storageState: resolve(__dirname, "../../.auth/admin.json") });

test.describe("動画管理ページ", () => {
  test("管理ページの主要 UI（タイトル・表ヘッダ・操作メニュー）が表示される", async ({ page }) => {
    await page.goto("/videos/manage");

    await expect(page.getByRole("heading", { name: "動画管理" })).toBeVisible({
      timeout: 30_000,
    });

    // 表ヘッダ — videos.manage.table.* から来る
    await expect(page.getByRole("columnheader", { name: "タイトル" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "シリーズ" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "公開状態" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "配信状態" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "再生時間" })).toBeVisible();
  });

  test("右上のメニューから新規アップロードとシリーズ追加ダイアログが開ける", async ({ page }) => {
    await page.goto("/videos/manage");
    await expect(page.getByRole("heading", { name: "動画管理" })).toBeVisible({
      timeout: 30_000,
    });

    // 右上 MoreHorizontal メニュー
    await page.getByRole("button", { name: "Open menu" }).first().click();

    // メニュー項目（videos.manage.uploadAction / addSeriesAction）
    await expect(page.getByRole("menuitem", { name: "アップロード" })).toBeVisible();
    await page.getByRole("menuitem", { name: "シリーズ追加" }).click();

    // ダイアログ（videos.manage.seriesDialog.*）
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "シリーズ追加" })).toBeVisible();
    await expect(page.getByLabel("シリーズ名")).toBeVisible();
    await expect(page.getByRole("button", { name: "作成" })).toBeVisible();
  });

  test("削除アクションから確認ダイアログが開く（実行はキャンセル）", async ({ page }) => {
    await page.goto("/videos/manage");
    await page.waitForLoadState("networkidle");

    // 最初の行の削除ボタン（XL 幅 or DropdownMenu のどちらか可視）
    const xlDelete = page.getByRole("button", { name: "削除" }).first();
    const dropdownMenu = page.getByRole("button", { name: "Open menu" }).nth(1); // 0 番目は右上メニュー

    if (await xlDelete.isVisible().catch(() => false)) {
      await xlDelete.click();
    } else {
      await dropdownMenu.click();
      await page.getByRole("menuitem", { name: "削除" }).click();
    }

    // AlertDialog（videos.manage.deleteDialog.*）
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "動画を削除しますか？" })).toBeVisible();
    // 実際の削除は行わずキャンセル
    await page.getByRole("button", { name: "キャンセル" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
  });
});
