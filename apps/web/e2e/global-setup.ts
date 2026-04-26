/* eslint-disable no-console -- E2E setup logs are intentional progress output */
import { execSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { FullConfig } from "@playwright/test";
import { saveAuthState } from "./fixtures/auth";

const DEFAULT_E2E_DB_URL = "postgresql://postgres:postgres@localhost:5432/community_e2e";

function assertNotProductionLike(url: string): void {
  const lowered = url.toLowerCase();
  if (lowered.includes("supabase.co") || lowered.includes("supabase.com")) {
    throw new Error(
      `[global-setup] Refusing to run E2E against Supabase URL: ${url}\n` +
        `E2E は必ずローカル Docker の community_e2e DB を使ってください。`,
    );
  }
  if (!lowered.includes("community_e2e") && !lowered.includes("/test")) {
    throw new Error(
      `[global-setup] DB URL に 'community_e2e' か '/test' が含まれていません: ${url}\n` +
        `事故防止のため E2E は専用 DB のみ許可します。`,
    );
  }
}

async function resetDatabase(databaseUrl: string, directUrl: string): Promise<void> {
  const repoRoot = resolve(__dirname, "../../..");
  console.log(`[global-setup] Resetting E2E database: ${redact(databaseUrl)}`);
  execSync("pnpm --filter @community-platform/api db:reset:demo", {
    stdio: "inherit",
    cwd: repoRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: directUrl,
      JWT_SECRET: process.env.JWT_SECRET ?? "e2e-test-only",
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "e2e-test-only",
      NODE_ENV: "test",
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "playwright-e2e",
    },
  });
}

async function generateAuthStates(authDir: string, baseURL: string): Promise<void> {
  console.log("[global-setup] Generating storageState for admin / owner / member...");
  await saveAuthState("admin", resolve(authDir, "admin.json"), baseURL);
  await saveAuthState("owner", resolve(authDir, "owner.json"), baseURL);
  await saveAuthState("member", resolve(authDir, "member.json"), baseURL);
  console.log("[global-setup] storageState generated");
}

export default async function globalSetup(config: FullConfig) {
  const databaseUrl = process.env.E2E_DATABASE_URL ?? DEFAULT_E2E_DB_URL;
  const directUrl = process.env.E2E_DIRECT_URL ?? DEFAULT_E2E_DB_URL;

  assertNotProductionLike(databaseUrl);
  assertNotProductionLike(directUrl);

  if (!process.env.SKIP_DB_RESET) {
    await resetDatabase(databaseUrl, directUrl);
  } else {
    console.log("[global-setup] SKIP_DB_RESET set — DB reset をスキップ");
  }

  const authDir = resolve(__dirname, ".auth");
  await mkdir(authDir, { recursive: true });

  const baseURL =
    config.projects[0]?.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  await generateAuthStates(authDir, baseURL);

  console.log("[global-setup] Done");
}

function redact(url: string): string {
  return url.replace(/:\/\/[^@]+@/, "://***@");
}
