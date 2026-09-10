import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  CUP_THRESHOLD_LITERS,
  GAL_PER_LITER,
  GAL_THRESHOLD_LITERS,
  LITERS_PER_ALMOND,
  TSP_PER_CUP,
  TSP_PER_LITER,
} from '../config/constants.js';
import { readAllEntries } from '../services/ledger.js';
import type { LedgerEntry } from '../types/usage.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeTotals(entries: LedgerEntry[], now: Date): { dayLiters: number; weekLiters: number } {
  const dayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStartMs = now.getTime() - 7 * DAY_MS;

  let dayLiters = 0;
  let weekLiters = 0;
  for (const entry of entries) {
    const tsMs = new Date(entry.ts).getTime();
    if (tsMs >= weekStartMs) {
      weekLiters += entry.liters;
    }
    if (tsMs >= dayStartMs) {
      dayLiters += entry.liters;
    }
  }
  return { dayLiters, weekLiters };
}

export function formatAlmonds(n: number): string {
  if (n < 1) return n.toFixed(1);
  return n < 10 ? String(Math.round(n)) : n.toFixed(1);
}

function formatDay(dayLiters: number): string {
  if (dayLiters < CUP_THRESHOLD_LITERS) {
    return `${(dayLiters * TSP_PER_LITER).toFixed(1)} tsp`;
  }
  if (dayLiters < GAL_THRESHOLD_LITERS) {
    return `${((dayLiters * TSP_PER_LITER) / TSP_PER_CUP).toFixed(1)} cups`;
  }
  return `${(dayLiters * GAL_PER_LITER).toFixed(1)} gal`;
}

export function formatStatusLine(dayLiters: number, weekLiters: number): string {
  const dayDisplay = formatDay(dayLiters);
  const weekGal = (weekLiters * GAL_PER_LITER).toFixed(1);
  const dayAlmonds = formatAlmonds(dayLiters / LITERS_PER_ALMOND);
  const weekAlmonds = formatAlmonds(weekLiters / LITERS_PER_ALMOND);
  return `🥜 Day: ${dayDisplay} = ${dayAlmonds} almonds · Week: ${weekGal} gal = ${weekAlmonds} almonds`;
}

export function formatStatusLineShort(dayLiters: number, weekLiters: number): string {
  const dayAlmonds = formatAlmonds(dayLiters / LITERS_PER_ALMOND);
  const weekAlmonds = formatAlmonds(weekLiters / LITERS_PER_ALMOND);
  return `D ${dayAlmonds}🥜 | W ${weekAlmonds}🥜`;
}

export function renderStatusLine(argv: string[], dayLiters: number, weekLiters: number): string {
  return argv.includes('--long')
    ? formatStatusLine(dayLiters, weekLiters)
    : formatStatusLineShort(dayLiters, weekLiters);
}

function main(): void {
  try {
    const ledgerPath = join(homedir(), '.claude', 'almonds', 'ledger.jsonl');
    const entries = readAllEntries(ledgerPath);
    const { dayLiters, weekLiters } = computeTotals(entries, new Date());
    process.stdout.write(renderStatusLine(process.argv, dayLiters, weekLiters));
  } catch {
    process.stdout.write('🥜 (unavailable)');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
