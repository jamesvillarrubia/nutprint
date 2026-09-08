import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, appendFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readNewUsageRecords } from '../src/services/transcript.js';

let dir: string;
let transcriptPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'almonds-transcript-'));
  transcriptPath = join(dir, 'session.jsonl');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const usageLine = (model: string, outputTokens: number) =>
  JSON.stringify({
    type: 'assistant',
    message: {
      model,
      usage: {
        input_tokens: 1,
        cache_creation_input_tokens: 2,
        cache_read_input_tokens: 3,
        output_tokens: outputTokens,
      },
    },
  });

describe('readNewUsageRecords', () => {
  it('reads every usage-bearing line from byte 0', () => {
    writeFileSync(transcriptPath, `${usageLine('claude-sonnet-5', 10)}\n${usageLine('claude-sonnet-5', 20)}\n`, 'utf8');

    const { records, newOffset } = readNewUsageRecords(transcriptPath, 0);

    expect(records).toHaveLength(2);
    expect(records[0].model).toBe('claude-sonnet-5');
    expect(records[0].usage.output_tokens).toBe(10);
    expect(records[1].usage.output_tokens).toBe(20);
    expect(newOffset).toBe(statSync(transcriptPath).size);
  });

  it('skips lines with no usage, such as a stop_hook_summary system line', () => {
    const noUsageLine = JSON.stringify({ type: 'system', subtype: 'stop_hook_summary' });
    writeFileSync(transcriptPath, `${noUsageLine}\n${usageLine('claude-sonnet-5', 5)}\n`, 'utf8');

    const { records } = readNewUsageRecords(transcriptPath, 0);

    expect(records).toHaveLength(1);
    expect(records[0].usage.output_tokens).toBe(5);
  });

  it('only reads bytes after fromByte, so a second call after new lines only sees the new ones', () => {
    writeFileSync(transcriptPath, `${usageLine('claude-sonnet-5', 10)}\n`, 'utf8');
    const first = readNewUsageRecords(transcriptPath, 0);
    expect(first.records).toHaveLength(1);

    appendFileSync(transcriptPath, `${usageLine('claude-sonnet-5', 20)}\n`, 'utf8');
    const second = readNewUsageRecords(transcriptPath, first.newOffset);

    expect(second.records).toHaveLength(1);
    expect(second.records[0].usage.output_tokens).toBe(20);
  });

  it('does not advance past a trailing partial (non-newline-terminated) line', () => {
    const completeLine = usageLine('claude-sonnet-5', 10);
    const partialLine = '{"type":"assistant","message":{"model":"claude-sonnet-5"';
    writeFileSync(transcriptPath, `${completeLine}\n${partialLine}`, 'utf8');

    const { records, newOffset } = readNewUsageRecords(transcriptPath, 0);

    expect(records).toHaveLength(1);
    expect(newOffset).toBe(Buffer.byteLength(`${completeLine}\n`, 'utf8'));
  });

  it('returns no records and the same offset when there are no new bytes', () => {
    writeFileSync(transcriptPath, `${usageLine('claude-sonnet-5', 10)}\n`, 'utf8');
    const size = statSync(transcriptPath).size;

    const { records, newOffset } = readNewUsageRecords(transcriptPath, size);

    expect(records).toHaveLength(0);
    expect(newOffset).toBe(size);
  });
});
