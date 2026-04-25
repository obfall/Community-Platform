import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const E2E_DB_URL = "postgresql://postgres:postgres@localhost:5432/community_e2e";

const e2eApiEnv: Record<string, string> = {
  DATABASE_URL: E2E_DB_URL,
  DIRECT_URL: E2E_DB_URL,
  JWT_SECRET: "e2e-test-only-jwt-secret-must-be-32-chars-or-more",
  JWT_REFRESH_SECRET: "e2e-test-only-refresh-secret-must-be-32-chars-or-more",
  NODE_ENV: "test",
  PORT: "4000",
  CORS_ORIGIN: "http://localhost:3000",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
};

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  globalSetup: require.resolve("./global-setup"),
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "on-failure", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @community-platform/api dev",
      port: 4000,
      timeout: 180_000,
      reuseExistingServer: false,
      env: e2eApiEnv,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "pnpm --filter @community-platform/web dev",
      port: 3000,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:4000/api",
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
