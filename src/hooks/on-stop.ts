import { homedir } from 'node:os';
import { join } from 'node:path';
import { LEDGER_RETENTION_DAYS } from '../config/constants.js';
import { estimateLiters } from '../services/estimate.js';
import { appendEntry, pruneOldEntries } from '../services/ledger.js';
import { readOffset, writeOffset } from '../services/offsets.js';
import { readNewUsageRecords } from '../services/transcript.js';
import type { LedgerEntry } from '../types/usage.js';

export interface StopHookInput {
  session_id: string;
  transcript_path: string;
}

export interface StopHookPaths {
  ledgerPath: string;
  offsetDir: string;
}

export function defaultPaths(): StopHookPaths {
  const base = join(homedir(), '.claude', 'almonds');
  return {
    ledgerPath: join(base, 'ledger.jsonl'),
    offsetDir: join(base, 'offsets'),
  };
}

export function processStopEvent(input: StopHookInput, paths: StopHookPaths, now: Date = new Date()): void {
  const fromByte = readOffset(paths.offsetDir, input.session_id);
  const { records, newOffset } = readNewUsageRecords(input.transcript_path, fromByte);

  for (const record of records) {
    const entry: LedgerEntry = {
      ts: now.toISOString(),
      session_id: input.session_id,
      model: record.model,
      liters: estimateLiters(record.usage, record.model),
    };
    appendEntry(paths.ledgerPath, entry);
  }

  writeOffset(paths.offsetDir, input.session_id, newOffset);
  pruneOldEntries(paths.ledgerPath, LEDGER_RETENTION_DAYS, now);
}

function main(): void {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    raw += chunk;
  });
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(raw) as StopHookInput;
      processStopEvent(input, defaultPaths());
    } catch (err) {
      process.stderr.write(`nutprint: on-stop hook failed: ${(err as Error).message}\n`);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
