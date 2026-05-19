import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.use({ storageState: resolve(__dirname, "../../.auth/admin.json") });

// パスワード保護動画は seed されていないため、E2E では UI レベルの i18n 文字列だけ確認する。
// 実際のダイアログ表示フローは admin がパスワード設定 → member 視点での閲覧テストで担保する。
test.describe("動画パスワード関連 UI", () => {
  test("新規ページにパスワード入力欄と空欄時プレースホルダが表示される", async ({ page }) => {
    await page.goto("/videos/new");
    await expect(page.getByRole("heading", { name: "動画アップロード" })).toBeVisible({
      timeout: 30_000,
    });

    // videos.form.label.password (ラベル)
    await expect(page.getByText("パスワード（4桁数字）", { exact: false })).toBeVisible();
    // videos.form.label.passwordPlaceholderEmpty
    await expect(page.getByPlaceholder("空欄の場合はパスワードなし")).toBeVisible();
  });

  test("admin が動画にパスワード保護をかけ → 解除する一連の編集 UI が i18n 化されている", async ({
    page,
  }) => {
    await page.goto("/videos/manage");
    await page.waitForLoadState("networkidle");

    // 最初の行の「編集」ボタン（XL 幅）か Dropdown menu 経由
    const xlEdit = page.getByRole("button", { name: "編集" }).first();
    const dropdownMenu = page.getByRole("button", { name: "Open menu" }).nth(1);
    if (await xlEdit.isVisible().catch(() => false)) {
      await xlEdit.click();
    } else {
      await dropdownMenu.click();
      await page.getByRole("menuitem", { name: "編集" }).click();
    }

    await page.waitForURL(/\/videos\/[0-9a-f-]+\/edit$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "動画編集" })).toBeVisible({
      timeout: 30_000,
    });

    // 2 回目の編集で同じ動画を再訪するために URL を保持する。
    // 「最初の行をもう一度押す」だと並列実行や seed 順序変化で別動画に当たる可能性があるため、
    // ID ベースで対象動画を固定する。
    const editUrl = page.url();

    // videos.form.label.password
    await expect(page.getByText("パスワード（4桁数字）", { exact: false })).toBeVisible();

    // パスワード入力欄に 4 桁を入れて保存（videos.edit.saveAction）
    const passwordInput = page.getByPlaceholder("空欄の場合はパスワードなし");
    if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill("1234");
    } else {
      // 既にパスワード保護がかかっている → 「変更する場合のみ入力」プレースホルダ
      await expect(page.getByPlaceholder("変更する場合のみ入力")).toBeVisible();
    }

    await page.getByRole("button", { name: "保存" }).click();
    await page.waitForURL(/\/videos\/manage$/, { timeout: 30_000 });

    // 同じ動画を URL 直指定で再訪（順序依存の排除）
    await page.goto(editUrl);
    await expect(page.getByRole("heading", { name: "動画編集" })).toBeVisible({
      timeout: 30_000,
    });

    // videos.form.label.passwordClearLabel (hasPassword=true でのみ表示)
    await expect(page.getByText("パスワード保護を解除する")).toBeVisible({ timeout: 15_000 });

    // クリーンアップ: 解除して保存
    await page.getByLabel("パスワード保護を解除する").check();
    await page.getByRole("button", { name: "保存" }).click();
    await page.waitForURL(/\/videos\/manage$/, { timeout: 30_000 });
  });
});
