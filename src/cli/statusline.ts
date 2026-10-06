import { homedir } from 'node:os';
import { join } from 'node:path';
import { readAllEntries } from '../services/ledger.js';
import { formatStatusLine, formatStatusLineShort } from '../services/format.js';
import type { LedgerEntry } from '../types/usage.js';

export { formatAlmonds, formatStatusLine, formatStatusLineShort } from '../services/format.js';

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
