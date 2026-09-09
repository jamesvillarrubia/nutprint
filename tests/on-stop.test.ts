import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultPaths, processStopEvent } from '../src/hooks/on-stop.js';
import { appendEntry, readAllEntries } from '../src/services/ledger.js';
import { readOffset } from '../src/services/offsets.js';
import { localDateKey, readRollup } from '../src/services/rollup.js';
import type { LedgerEntry } from '../src/types/usage.js';

let dir: string;
let transcriptPath: string;
let ledgerPath: string;
let offsetDir: string;
let rollupPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'almonds-on-stop-'));
  transcriptPath = join(dir, 'session.jsonl');
  ledgerPath = join(dir, 'state', 'ledger.jsonl');
  offsetDir = join(dir, 'state', 'offsets');
  rollupPath = join(dir, 'state', 'rollup.jsonl');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const usageLine = (outputTokens: number) =>
  JSON.stringify({
    message: {
      model: 'claude-sonnet-5',
      usage: { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: outputTokens },
    },
  });

describe('processStopEvent', () => {
  it('appends one ledger entry per usage-bearing line and advances the offset', () => {
    writeFileSync(transcriptPath, `${usageLine(1000)}\n${usageLine(2000)}\n`, 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, { ledgerPath, offsetDir, rollupPath }, now);

    const entries = readAllEntries(ledgerPath);
    expect(entries).toHaveLength(2);
    expect(entries[0].session_id).toBe('session-a');
    expect(entries[0].model).toBe('claude-sonnet-5');
    expect(entries[0].ts).toBe(now.toISOString());
    expect(entries[0].liters).toBeGreaterThan(0);
    expect(readOffset(offsetDir, 'session-a')).toBeGreaterThan(0);
  });

  it('does not double-count on a second call with no new transcript bytes', () => {
    writeFileSync(transcriptPath, `${usageLine(1000)}\n`, 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');
    const paths = { ledgerPath, offsetDir, rollupPath };

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);
    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);

    expect(readAllEntries(ledgerPath)).toHaveLength(1);
  });

  it('keeps offsets independent across sessions sharing one ledger', () => {
    const transcriptB = join(dir, 'session-b.jsonl');
    writeFileSync(transcriptPath, `${usageLine(1000)}\n`, 'utf8');
    writeFileSync(transcriptB, `${usageLine(500)}\n`, 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');
    const paths = { ledgerPath, offsetDir, rollupPath };

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);
    processStopEvent({ session_id: 'session-b', transcript_path: transcriptB }, paths, now);

    const entries = readAllEntries(ledgerPath);
    expect(entries.map((e) => e.session_id).sort()).toEqual(['session-a', 'session-b']);
  });

  it("adds a rollup entry keyed by now's local date, summing this event's new liters", () => {
    writeFileSync(transcriptPath, `${usageLine(1000)}\n${usageLine(2000)}\n`, 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');
    const paths = { ledgerPath, offsetDir, rollupPath };

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);

    const entries = readAllEntries(ledgerPath);
    const expectedLiters = entries.reduce((sum, entry) => sum + entry.liters, 0);
    const rollup = readRollup(rollupPath);
    expect(rollup.get(localDateKey(now))).toBeCloseTo(expectedLiters, 10);
  });

  it('backfills the rollup from pre-existing ledger entries before adding this event, when rollup.jsonl is missing', () => {
    const oldEntry: LedgerEntry = { ts: '2026-09-01T00:00:00.000Z', session_id: 'session-old', model: 'claude-sonnet-5', liters: 0.5 };
    appendEntry(ledgerPath, oldEntry);
    writeFileSync(transcriptPath, `${usageLine(1000)}\n`, 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');
    const paths = { ledgerPath, offsetDir, rollupPath };

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);

    const rollup = readRollup(rollupPath);
    expect(rollup.get(localDateKey(new Date(oldEntry.ts)))).toBeCloseTo(oldEntry.liters, 10);
    const newEntries = readAllEntries(ledgerPath).filter((e) => e.session_id === 'session-a');
    const expectedLiters = newEntries.reduce((sum, entry) => sum + entry.liters, 0);
    expect(rollup.get(localDateKey(now))).toBeCloseTo(expectedLiters, 10);
  });

  it('does not overwrite an existing rollup.jsonl with a backfill', () => {
    writeFileSync(transcriptPath, `${usageLine(1000)}\n`, 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');
    const paths = { ledgerPath, offsetDir, rollupPath };
    // Seed a rollup file with data that has no corresponding ledger entry; a backfill would wipe it out.
    processStopEvent({ session_id: 'seed', transcript_path: transcriptPath }, paths, new Date('2026-01-01T00:00:00.000Z'));
    const seededRollup = readRollup(rollupPath);
    expect(seededRollup.get(localDateKey(new Date('2026-01-01T00:00:00.000Z')))).toBeGreaterThan(0);

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);

    const rollup = readRollup(rollupPath);
    expect(rollup.get(localDateKey(new Date('2026-01-01T00:00:00.000Z')))).toEqual(
      seededRollup.get(localDateKey(new Date('2026-01-01T00:00:00.000Z'))),
    );
  });

  it('advances the offset before addToRollup runs, so a rollup write failure does not cause a duplicate ledger append on retry', () => {
    writeFileSync(transcriptPath, `${usageLine(1000)}\n`, 'utf8');
    // rollupPath is a directory, not a file: readRollup's readFileSync throws EISDIR
    // inside addToRollup, without ever making backfillRollupIfMissing throw (it only
    // checks existsSync, which is true for a directory too).
    mkdirSync(rollupPath, { recursive: true });
    const paths = { ledgerPath, offsetDir, rollupPath };
    const now = new Date('2026-09-08T12:00:00.000Z');

    expect(() =>
      processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now),
    ).toThrow();

    expect(readOffset(offsetDir, 'session-a')).toBeGreaterThan(0);
    expect(readAllEntries(ledgerPath)).toHaveLength(1);

    // Retry with the same transcript: the offset already advanced past the read bytes,
    // so no new records are found and no duplicate ledger entry is appended.
    expect(() =>
      processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now),
    ).not.toThrow();

    expect(readAllEntries(ledgerPath)).toHaveLength(1);
  });

  it('does not create rollup.jsonl when a Stop event has no new usage records and the ledger is empty', () => {
    writeFileSync(transcriptPath, '', 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');
    const paths = { ledgerPath, offsetDir, rollupPath };

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);

    expect(existsSync(rollupPath)).toBe(false);
  });
});

describe('defaultPaths', () => {
  it('includes rollupPath alongside ledgerPath and offsetDir under the same base directory', () => {
    const paths = defaultPaths();
    expect(paths.rollupPath.endsWith(join('almonds', 'rollup.jsonl'))).toBe(true);
  });
});
