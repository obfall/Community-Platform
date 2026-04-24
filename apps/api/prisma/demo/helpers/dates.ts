import { rand } from "./random";

export const SEED_BASE_DATE = new Date("2026-04-24T10:00:00+09:00");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysAgo(n: number, base: Date = SEED_BASE_DATE): Date {
  return new Date(base.getTime() - n * MS_PER_DAY);
}

export function daysAhead(n: number, base: Date = SEED_BASE_DATE): Date {
  return new Date(base.getTime() + n * MS_PER_DAY);
}

export function hoursAgo(n: number, base: Date = SEED_BASE_DATE): Date {
  return new Date(base.getTime() - n * 60 * 60 * 1000);
}

export function randomDateBetween(start: Date, end: Date): Date {
  const diff = end.getTime() - start.getTime();
  return new Date(start.getTime() + rand() * diff);
}
