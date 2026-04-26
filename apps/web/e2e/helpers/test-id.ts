import type { TestInfo } from "@playwright/test";

export function uniqueLabel(testInfo: TestInfo, base: string): string {
  const safeTitle = testInfo.title.replace(/[^\w]+/g, "_").slice(0, 20);
  return `E2E_${safeTitle}_${Date.now()}_${base}`;
}
