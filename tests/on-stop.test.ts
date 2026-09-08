import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processStopEvent } from '../src/hooks/on-stop.js';
import { readAllEntries } from '../src/services/ledger.js';
import { readOffset } from '../src/services/offsets.js';

let dir: string;
let transcriptPath: string;
let ledgerPath: string;
let offsetDir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'almonds-on-stop-'));
  transcriptPath = join(dir, 'session.jsonl');
  ledgerPath = join(dir, 'state', 'ledger.jsonl');
  offsetDir = join(dir, 'state', 'offsets');
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

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, { ledgerPath, offsetDir }, now);

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
    const paths = { ledgerPath, offsetDir };

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);
    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);

    expect(readAllEntries(ledgerPath)).toHaveLength(1);
  });

  it('keeps offsets independent across sessions sharing one ledger', () => {
    const transcriptB = join(dir, 'session-b.jsonl');
    writeFileSync(transcriptPath, `${usageLine(1000)}\n`, 'utf8');
    writeFileSync(transcriptB, `${usageLine(500)}\n`, 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');
    const paths = { ledgerPath, offsetDir };

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);
    processStopEvent({ session_id: 'session-b', transcript_path: transcriptB }, paths, now);

    const entries = readAllEntries(ledgerPath);
    expect(entries.map((e) => e.session_id).sort()).toEqual(['session-a', 'session-b']);
  });
});
