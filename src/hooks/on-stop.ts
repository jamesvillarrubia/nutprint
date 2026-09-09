import { homedir } from 'node:os';
import { join } from 'node:path';
import { LEDGER_RETENTION_DAYS } from '../config/constants.js';
import { estimateLiters } from '../services/estimate.js';
import { appendEntry, pruneOldEntries } from '../services/ledger.js';
import { readOffset, writeOffset } from '../services/offsets.js';
import { addToRollup, backfillRollupIfMissing, localDateKey } from '../services/rollup.js';
import { readNewUsageRecords } from '../services/transcript.js';
import type { LedgerEntry } from '../types/usage.js';

export interface StopHookInput {
  session_id: string;
  transcript_path: string;
}

export interface StopHookPaths {
  ledgerPath: string;
  offsetDir: string;
  rollupPath: string;
}

export function defaultPaths(): StopHookPaths {
  const base = join(homedir(), '.claude', 'almonds');
  return {
    ledgerPath: join(base, 'ledger.jsonl'),
    offsetDir: join(base, 'offsets'),
    rollupPath: join(base, 'rollup.jsonl'),
  };
}

export function processStopEvent(input: StopHookInput, paths: StopHookPaths, now: Date = new Date()): void {
  backfillRollupIfMissing(paths.rollupPath, paths.ledgerPath);

  const fromByte = readOffset(paths.offsetDir, input.session_id);
  const { records, newOffset } = readNewUsageRecords(input.transcript_path, fromByte);

  let newLiters = 0;
  for (const record of records) {
    const liters = estimateLiters(record.usage, record.model);
    const entry: LedgerEntry = {
      ts: now.toISOString(),
      session_id: input.session_id,
      model: record.model,
      liters,
    };
    appendEntry(paths.ledgerPath, entry);
    newLiters += liters;
  }

  writeOffset(paths.offsetDir, input.session_id, newOffset);

  if (records.length > 0) {
    addToRollup(paths.rollupPath, localDateKey(now), newLiters);
  }

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
