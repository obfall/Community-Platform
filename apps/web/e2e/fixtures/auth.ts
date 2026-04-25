import type { Browser, Page } from "@playwright/test";
import { TEST_USERS, type TestUserKey } from "./test-users";

export async function loginViaUi(page: Page, userKey: TestUserKey): Promise<void> {
  const user = TEST_USERS[userKey];
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  });
}

export async function saveAuthState(
  browser: Browser,
  userKey: TestUserKey,
  outputPath: string,
  baseURL: string,
): Promise<void> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  try {
    await loginViaUi(page, userKey);
    await context.storageState({ path: outputPath });
  } finally {
    await context.close();
  }
}
