import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.use({ storageState: resolve(__dirname, "../../.auth/admin.json") });

test.describe("動画タスク進捗ページ（admin 専用）", () => {
  test("一覧から task を持つ動画の進捗ページに遷移し、表ヘッダ・バッジが表示される", async ({
    page,
  }) => {
    // 一覧（admin なら全件見える）
    await page.goto("/videos");
    await expect(page.getByRole("heading", { name: "動画" })).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    // seed の動画順序に依存しないよう、表示中の動画リンク一覧を取得して
    // 「タスク進捗を見る」リンクが出る最初の動画を見つけて遷移する。
    // 最大 10 件まで試行（それ以上はテスト対象の選び方が不適切）。
    const videoLinks = await page.locator('a[href^="/videos/"]').all();
    const candidateHrefs = (
      await Promise.all(videoLinks.map((l) => l.getAttribute("href")))
    ).filter((h): h is string => !!h && /^\/videos\/[0-9a-f-]+$/.test(h));

    let taskProgressUrl: string | null = null;
    for (const href of candidateHrefs.slice(0, 10)) {
      await page.goto(href);
      await page.waitForURL(/\/videos\/[0-9a-f-]+$/, { timeout: 30_000 });
      const link = page.getByRole("link", { name: "タスク進捗を見る" });
      if (await link.isVisible().catch(() => false)) {
        taskProgressUrl = `${href}/task-progress`;
        break;
      }
    }
    test.skip(!taskProgressUrl, "タスクを持つ動画が見つからない（seed を要確認）");

    await page.goto(taskProgressUrl!);
    await page.waitForURL(/\/task-progress$/, { timeout: 30_000 });

    // タイトル（videos.taskProgress.title）
    await expect(page.getByRole("heading", { name: "タスク進捗" })).toBeVisible({
      timeout: 30_000,
    });

    // 表ヘッダ（videos.taskProgress.table.*）
    await expect(page.getByRole("columnheader", { name: "メンバー" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "ステータス" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "更新 / 完了日時" })).toBeVisible();
  });
});

test.describe("動画タスク進捗ページ（member は forbidden）", () => {
  test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

  test("member が直接アクセスすると『アクセス権限がありません』が表示される", async ({ page }) => {
    // 適当な動画 ID で task-progress に直接アクセス（クライアント側で role を見て弾く）
    await page.goto("/videos");
    await expect(page.getByRole("heading", { name: "動画" })).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    const firstLink = page.locator('a[href^="/videos/"]').first();
    await expect(firstLink).toBeVisible({ timeout: 30_000 });
    const href = await firstLink.getAttribute("href");
    if (!href) throw new Error("動画リンクが見つかりません");

    await page.goto(`${href}/task-progress`);
    // videos.taskProgress.forbidden
    await expect(page.getByText("アクセス権限がありません")).toBeVisible({ timeout: 15_000 });
  });
});
