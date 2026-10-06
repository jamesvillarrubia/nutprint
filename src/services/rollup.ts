import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { readAllEntries } from './ledger.js';
import { localDateKey, parseRollup } from './rollup-totals.js';

export { localDateKey } from './rollup-totals.js';

export function readRollup(rollupPath: string): Map<string, number> {
  if (!existsSync(rollupPath)) {
    return new Map();
  }
  return parseRollup(readFileSync(rollupPath, 'utf8'));
}

export function writeRollup(rollupPath: string, rollup: Map<string, number>): void {
  mkdirSync(dirname(rollupPath), { recursive: true });
  const lines: string[] = [];
  for (const [date, liters] of rollup) {
    lines.push(JSON.stringify({ date, liters }));
  }
  const body = lines.join('\n');
  const tmpPath = `${rollupPath}.tmp`;
  writeFileSync(tmpPath, lines.length > 0 ? `${body}\n` : '', 'utf8');
  renameSync(tmpPath, rollupPath);
}

export function addToRollup(rollupPath: string, dateKey: string, liters: number): void {
  if (!Number.isFinite(liters)) {
    process.stderr.write(`nutprint: skipped non-finite liters value (${liters}) for rollup date ${dateKey}\n`);
    return;
  }
  const rollup = readRollup(rollupPath);
  rollup.set(dateKey, (rollup.get(dateKey) ?? 0) + liters);
  writeRollup(rollupPath, rollup);
}

export function backfillRollupIfMissing(rollupPath: string, ledgerPath: string): void {
  if (existsSync(rollupPath)) {
    return;
  }
  const entries = readAllEntries(ledgerPath);
  if (entries.length === 0) {
    return;
  }
  const rollup = new Map<string, number>();
  for (const entry of entries) {
    const dateKey = localDateKey(new Date(entry.ts));
    rollup.set(dateKey, (rollup.get(dateKey) ?? 0) + entry.liters);
  }
  writeRollup(rollupPath, rollup);
}
