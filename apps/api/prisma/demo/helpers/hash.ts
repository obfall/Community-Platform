import bcrypt from "bcrypt";

export const DEMO_PASSWORD = "qaz1234";

let cachedHash: string | null = null;

export async function getDemoPasswordHash(): Promise<string> {
  if (cachedHash) return cachedHash;
  cachedHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return cachedHash;
}
