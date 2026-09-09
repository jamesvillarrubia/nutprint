import { homedir } from 'node:os';
import { join } from 'node:path';
import { GAL_PER_LITER, LITERS_PER_ALMOND, TSP_PER_LITER } from '../config/constants.js';
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
  return n < 10 ? String(Math.round(n)) : n.toFixed(1);
}

export function formatStatusLine(dayLiters: number, weekLiters: number): string {
  const dayTsp = (dayLiters * TSP_PER_LITER).toFixed(1);
  const weekGal = (weekLiters * GAL_PER_LITER).toFixed(1);
  const dayAlmonds = formatAlmonds(dayLiters / LITERS_PER_ALMOND);
  const weekAlmonds = formatAlmonds(weekLiters / LITERS_PER_ALMOND);
  return `🥜 Day: ${dayTsp} tsp = ${dayAlmonds} almonds · Week: ${weekGal} gal = ${weekAlmonds} almonds`;
}

function main(): void {
  try {
    const ledgerPath = join(homedir(), '.claude', 'almonds', 'ledger.jsonl');
    const entries = readAllEntries(ledgerPath);
    const { dayLiters, weekLiters } = computeTotals(entries, new Date());
    process.stdout.write(formatStatusLine(dayLiters, weekLiters));
  } catch {
    process.stdout.write('🥜 (unavailable)');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
