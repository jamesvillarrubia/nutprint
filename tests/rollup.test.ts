import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { addToRollup, backfillRollupIfMissing, readRollup, writeRollup } from '../src/services/rollup.js';
import { appendEntry } from '../src/services/ledger.js';
import type { LedgerEntry } from '../src/types/usage.js';

let dir: string;
let rollupPath: string;
let ledgerPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'almonds-rollup-'));
  rollupPath = join(dir, 'state', 'rollup.jsonl');
  ledgerPath = join(dir, 'state', 'ledger.jsonl');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('readRollup', () => {
  it('returns an empty map when the rollup file does not exist yet', () => {
    expect(readRollup(rollupPath)).toEqual(new Map());
  });

  it('parses lines into a date to liters map', () => {
    mkdirSync(dirname(rollupPath), { recursive: true });
    writeFileSync(
      rollupPath,
      `${JSON.stringify({ date: '2026-09-07', liters: 0.01 })}\n${JSON.stringify({ date: '2026-09-08', liters: 0.02 })}\n`,
      'utf8',
    );
    expect(readRollup(rollupPath)).toEqual(
      new Map([
        ['2026-09-07', 0.01],
        ['2026-09-08', 0.02],
      ]),
    );
  });

  it('skips a malformed line and still returns the valid entries', () => {
    mkdirSync(dirname(rollupPath), { recursive: true });
    writeFileSync(rollupPath, `${JSON.stringify({ date: '2026-09-07', liters: 0.01 })}\nnot valid json {{{\n`, 'utf8');
    expect(readRollup(rollupPath)).toEqual(new Map([['2026-09-07', 0.01]]));
  });
});

describe('writeRollup', () => {
  it('round-trips a map through readRollup, creating parent directories as needed', () => {
    const map = new Map([
      ['2026-09-07', 0.01],
      ['2026-09-08', 0.02],
    ]);
    writeRollup(rollupPath, map);
    expect(readRollup(rollupPath)).toEqual(map);
  });

  it('writes atomically: leaves no .tmp file behind', () => {
    writeRollup(rollupPath, new Map([['2026-09-08', 0.01]]));
    expect(existsSync(`${rollupPath}.tmp`)).toBe(false);
  });
});

describe('addToRollup', () => {
  it('creates a new dateKey entry when the rollup file does not exist yet', () => {
    addToRollup(rollupPath, '2026-09-08', 0.05);
    expect(readRollup(rollupPath)).toEqual(new Map([['2026-09-08', 0.05]]));
  });

  it('adds to an existing dateKey rather than overwriting it', () => {
    writeRollup(rollupPath, new Map([['2026-09-08', 0.05]]));
    addToRollup(rollupPath, '2026-09-08', 0.02);
    expect(readRollup(rollupPath)).toEqual(new Map([['2026-09-08', 0.07]]));
  });

  it('skips the write and leaves the existing total unchanged when liters is not finite', () => {
    writeRollup(rollupPath, new Map([['2026-09-08', 0.05]]));
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    addToRollup(rollupPath, '2026-09-08', NaN);

    expect(readRollup(rollupPath)).toEqual(new Map([['2026-09-08', 0.05]]));
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    stderrSpy.mockRestore();
  });

  it('leaves other dateKeys untouched', () => {
    writeRollup(rollupPath, new Map([['2026-09-07', 0.03]]));
    addToRollup(rollupPath, '2026-09-08', 0.02);
    expect(readRollup(rollupPath)).toEqual(
      new Map([
        ['2026-09-07', 0.03],
        ['2026-09-08', 0.02],
      ]),
    );
  });
});

describe('backfillRollupIfMissing', () => {
  it('does nothing when the rollup file already exists', () => {
    writeRollup(rollupPath, new Map([['2026-09-01', 9.99]]));
    appendEntry(ledgerPath, { ts: '2026-09-08T00:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 0.5 } as LedgerEntry);

    backfillRollupIfMissing(rollupPath, ledgerPath);

    expect(readRollup(rollupPath)).toEqual(new Map([['2026-09-01', 9.99]]));
  });

  it('builds the rollup from every ledger entry, aggregated by local calendar date', () => {
    const morning: LedgerEntry = { ts: '2026-09-08T01:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 0.1 };
    const evening: LedgerEntry = { ts: '2026-09-08T20:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 0.2 };
    const otherDay: LedgerEntry = { ts: '2026-09-07T12:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 0.3 };
    appendEntry(ledgerPath, morning);
    appendEntry(ledgerPath, evening);
    appendEntry(ledgerPath, otherDay);

    backfillRollupIfMissing(rollupPath, ledgerPath);

    // Local date keys depend on the runner's TZ; derive the expected keys the same way
    // production code does, from local Date getters, rather than assuming UTC.
    const localKey = (iso: string): string => {
      const d = new Date(iso);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const expected = new Map<string, number>();
    for (const entry of [morning, evening, otherDay]) {
      const key = localKey(entry.ts);
      expected.set(key, (expected.get(key) ?? 0) + entry.liters);
    }

    const result = readRollup(rollupPath);
    for (const [key, value] of expected) {
      expect(result.get(key)).toBeCloseTo(value, 10);
    }
  });

  it('does not create a rollup file when the ledger has no entries', () => {
    backfillRollupIfMissing(rollupPath, ledgerPath);
    expect(existsSync(rollupPath)).toBe(false);
  });
});
