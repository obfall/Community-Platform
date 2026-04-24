// Deterministic PRNG (mulberry32). Fixed seed = reproducible demo data.
let state = 0x13371337;

export function setSeed(seed: number): void {
  state = seed >>> 0;
}

export function rand(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function randomBoolean(probability = 0.5): boolean {
  return rand() < probability;
}

export function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick from empty array");
  return arr[Math.floor(rand() * arr.length)]!;
}

export function pickMany<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}
