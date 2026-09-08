import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { LedgerEntry } from '../types/usage.js';

export function appendEntry(ledgerPath: string, entry: LedgerEntry): void {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  appendFileSync(ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

export function readAllEntries(ledgerPath: string): LedgerEntry[] {
  if (!existsSync(ledgerPath)) {
    return [];
  }
  const content = readFileSync(ledgerPath, 'utf8');
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LedgerEntry);
}

export function pruneOldEntries(ledgerPath: string, retentionDays: number, now: Date = new Date()): void {
  if (!existsSync(ledgerPath)) {
    return;
  }
  const cutoffMs = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const remaining = readAllEntries(ledgerPath).filter((entry) => new Date(entry.ts).getTime() >= cutoffMs);
  const body = remaining.map((entry) => JSON.stringify(entry)).join('\n');
  writeFileSync(ledgerPath, remaining.length > 0 ? `${body}\n` : '', 'utf8');
}
