import { writeFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { request } from "@playwright/test";
import { TEST_USERS, type TestUserKey } from "./test-users";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

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
  userKey: TestUserKey,
  outputPath: string,
  baseURL: string,
): Promise<void> {
  const user = TEST_USERS[userKey];

  const apiContext = await request.newContext();
  const res = await apiContext.post(`${API_URL}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  if (!res.ok()) {
    throw new Error(`API login failed for ${userKey}: ${res.status()} ${await res.text()}`);
  }
  const { accessToken, refreshToken } = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  await apiContext.dispose();

  const origin = baseURL.replace(/\/$/, "");
  const url = new URL(origin);
  const storageState = {
    cookies: [
      {
        name: "accessToken",
        value: accessToken,
        domain: url.hostname,
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [
      {
        origin,
        localStorage: [
          { name: "accessToken", value: accessToken },
          { name: "refreshToken", value: refreshToken },
        ],
      },
    ],
  };
  await writeFile(outputPath, JSON.stringify(storageState, null, 2), "utf-8");
}
