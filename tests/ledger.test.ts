import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendEntry, pruneOldEntries, readAllEntries } from '../src/services/ledger.js';
import type { LedgerEntry } from '../src/types/usage.js';

let dir: string;
let ledgerPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'almonds-ledger-'));
  ledgerPath = join(dir, 'nested', 'ledger.jsonl');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('ledger', () => {
  it('returns an empty array when the ledger file does not exist yet', () => {
    expect(readAllEntries(ledgerPath)).toEqual([]);
  });

  it('appends entries and creates parent directories as needed', () => {
    const entry: LedgerEntry = { ts: '2026-09-08T00:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 0.01 };
    appendEntry(ledgerPath, entry);
    appendEntry(ledgerPath, { ...entry, session_id: 's2', liters: 0.02 });

    const entries = readAllEntries(ledgerPath);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(entry);
    expect(entries[1].session_id).toBe('s2');
  });

  it('prunes entries older than retentionDays, keeping newer ones', () => {
    const now = new Date('2026-09-08T00:00:00.000Z');
    const old: LedgerEntry = { ts: '2026-08-01T00:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 0.01 };
    const recent: LedgerEntry = { ts: '2026-09-07T00:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 0.02 };
    appendEntry(ledgerPath, old);
    appendEntry(ledgerPath, recent);

    pruneOldEntries(ledgerPath, 30, now);

    const entries = readAllEntries(ledgerPath);
    expect(entries).toEqual([recent]);
  });
});
