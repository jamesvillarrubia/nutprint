import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
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
  const entries: LedgerEntry[] = [];
  for (const line of content.split('\n')) {
    if (line.trim().length === 0) {
      continue;
    }
    try {
      entries.push(JSON.parse(line) as LedgerEntry);
    } catch {
      continue;
    }
  }
  return entries;
}

export function pruneOldEntries(ledgerPath: string, retentionDays: number, now: Date = new Date()): void {
  if (!existsSync(ledgerPath)) {
    return;
  }
  const cutoffMs = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const remaining = readAllEntries(ledgerPath).filter((entry) => new Date(entry.ts).getTime() >= cutoffMs);
  const body = remaining.map((entry) => JSON.stringify(entry)).join('\n');
  const tmpPath = `${ledgerPath}.tmp`;
  writeFileSync(tmpPath, remaining.length > 0 ? `${body}\n` : '', 'utf8');
  renameSync(tmpPath, ledgerPath);
}
