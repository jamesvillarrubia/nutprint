import { describe, it, expect } from 'vitest';
import { computeTotals, formatAlmonds, formatStatusLine } from '../src/cli/statusline.js';
import type { LedgerEntry } from '../src/types/usage.js';

// computeTotals's "Day" boundary is local midnight; pin the test process to
// UTC so the UTC-labeled timestamps below land on the same calendar day the
// assertions expect, regardless of the machine running the test.
process.env.TZ = 'UTC';

describe('computeTotals', () => {
  it('sums entries within each window across every session_id', () => {
    const now = new Date('2026-09-08T18:00:00.000Z');
    const entries: LedgerEntry[] = [
      { ts: '2026-09-08T01:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 1 },
      { ts: '2026-09-08T10:00:00.000Z', session_id: 's2', model: 'claude-sonnet-5', liters: 2 },
      { ts: '2026-09-06T10:00:00.000Z', session_id: 's3', model: 'claude-sonnet-5', liters: 4 },
      { ts: '2026-08-01T10:00:00.000Z', session_id: 's4', model: 'claude-sonnet-5', liters: 100 },
    ];

    const { dayLiters, weekLiters } = computeTotals(entries, now);

    expect(dayLiters).toBeCloseTo(3, 10);
    expect(weekLiters).toBeCloseTo(7, 10);
  });

  it('returns zero for both windows with no entries', () => {
    expect(computeTotals([], new Date('2026-09-08T18:00:00.000Z'))).toEqual({ dayLiters: 0, weekLiters: 0 });
  });
});

describe('formatAlmonds', () => {
  it('rounds to a whole number below 10', () => {
    expect(formatAlmonds(0.0028)).toBe('0');
    expect(formatAlmonds(9.6)).toBe('10');
  });

  it('keeps one decimal at or above 10', () => {
    expect(formatAlmonds(10)).toBe('10.0');
    expect(formatAlmonds(150.37)).toBe('150.4');
  });
});

describe('formatStatusLine', () => {
  it('renders the exact display format', () => {
    // dayLiters -> tsp: 0.01 * 202.9 = 2.029 -> "2.0"; almonds: 0.01 / 6.2 = 0.0016 -> "0"
    // weekLiters -> gal: 5 * 0.264172 = 1.32086 -> "1.3"; almonds: 5 / 6.2 = 0.8065 -> "1"
    const line = formatStatusLine(0.01, 5);
    expect(line).toBe('🥜 Day: 2.0 tsp = 0 almonds · Week: 1.3 gal = 1 almonds');
  });
});
