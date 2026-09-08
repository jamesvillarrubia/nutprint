import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readOffset, writeOffset } from '../src/services/offsets.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'almonds-offsets-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('offsets', () => {
  it('returns 0 for a session with no saved offset', () => {
    expect(readOffset(dir, 'session-a')).toBe(0);
  });

  it('round-trips a written offset, and creates the directory if needed', () => {
    const offsetDir = join(dir, 'nested');
    writeOffset(offsetDir, 'session-a', 12345);
    expect(readOffset(offsetDir, 'session-a')).toBe(12345);
  });

  it('keeps offsets for different sessions independent', () => {
    writeOffset(dir, 'session-a', 100);
    writeOffset(dir, 'session-b', 200);
    expect(readOffset(dir, 'session-a')).toBe(100);
    expect(readOffset(dir, 'session-b')).toBe(200);
  });
});
