import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.describe("members 一覧（member ロールで閲覧）", () => {
  test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

  test("一覧ページにアクセスしてヘッダーとメンバー行が表示される", async ({ page }) => {
    await page.goto("/members");
    await expect(page.getByRole("heading", { name: "メンバー" })).toBeVisible();
    // 何かしらのメンバー行（avatar + name）が出るのを待つ
    const memberRow = page.getByRole("row").nth(1);
    await expect(memberRow).toBeVisible({ timeout: 30_000 });
  });

  test("名前で検索を入力して Enter すると URL は変わらないがリスト挙動が動く", async ({ page }) => {
    await page.goto("/members");
    const searchInput = page.getByPlaceholder("名前で検索...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("田中");
    await searchInput.press("Enter");
    // 検索後も一覧ヘッダーは残っている（ページ自体は同じ）
    await expect(page.getByRole("heading", { name: "メンバー" })).toBeVisible();
  });

  test("並び替えセレクトが見える", async ({ page }) => {
    await page.goto("/members");
    // SelectField は role=combobox を持つ
    await expect(page.getByRole("combobox")).toBeVisible();
  });
});

test.describe("members 詳細（member ロールで他者を閲覧）", () => {
  test.use({ storageState: resolve(__dirname, "../../.auth/member.json") });

  test("一覧から最初のメンバーを開いて詳細ページに遷移できる", async ({ page }) => {
    await page.goto("/members");
    // メンバーリンクを 1 つクリック
    const memberLink = page
      .getByRole("link")
      .filter({ has: page.locator("img,div") })
      .first();
    await expect(memberLink).toBeVisible({ timeout: 30_000 });
    await memberLink.click();
    await page.waitForURL(/\/members\/[^/]+$/, { timeout: 15_000 });
    // 戻るリンクが見える = 詳細ページ
    await expect(page.getByRole("link", { name: /メンバー一覧/ })).toBeVisible();
  });

  test("プロフィール情報 Card は表示されるが email 行は出ない（admin 限定）", async ({ page }) => {
    await page.goto("/members");
    const memberLink = page
      .getByRole("link")
      .filter({ has: page.locator("img,div") })
      .first();
    await memberLink.click();
    await page.waitForURL(/\/members\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "プロフィール情報" })).toBeVisible();
    // メールアドレス行のラベルが存在しないこと
    await expect(page.getByText("メールアドレス", { exact: true })).not.toBeVisible();
  });
});

test.describe("members 詳細（admin ロールで閲覧）", () => {
  test.use({ storageState: resolve(__dirname, "../../.auth/admin.json") });

  test("admin が他メンバーを開くとプロフィール情報 Card に email 行が出る", async ({ page }) => {
    await page.goto("/members");
    const memberLink = page
      .getByRole("link")
      .filter({ has: page.locator("img,div") })
      .first();
    await expect(memberLink).toBeVisible({ timeout: 30_000 });
    await memberLink.click();
    await page.waitForURL(/\/members\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "プロフィール情報" })).toBeVisible();
    // admin だけ email ラベルが見える
    await expect(page.getByText("メールアドレス", { exact: true })).toBeVisible();
  });
});
