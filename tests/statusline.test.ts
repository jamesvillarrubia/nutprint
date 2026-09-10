import { describe, it, expect } from 'vitest';
import { computeTotals, formatAlmonds, formatStatusLine, formatStatusLineShort } from '../src/cli/statusline.js';
import {
  CUP_THRESHOLD_LITERS,
  GAL_THRESHOLD_LITERS,
  GAL_PER_LITER,
  TSP_PER_LITER,
  TSP_PER_CUP,
  LITERS_PER_ALMOND,
} from '../src/config/constants.js';
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
  it('keeps one decimal below 1, so a sub-1 value never rounds up to a bare "1"', () => {
    expect(formatAlmonds(0.0028)).toBe('0.0');
    expect(formatAlmonds(0.82)).toBe('0.8');
  });

  it('rounds to a whole number from 1 up to 10', () => {
    expect(formatAlmonds(9.6)).toBe('10');
  });

  it('rounds to a whole number at the sub-1/integer-rounding boundary', () => {
    expect(formatAlmonds(1)).toBe('1');
  });

  it('keeps one decimal at or above 10', () => {
    expect(formatAlmonds(10)).toBe('10.0');
    expect(formatAlmonds(150.37)).toBe('150.4');
  });
});

describe('formatStatusLine', () => {
  it('renders the exact display format', () => {
    // dayLiters -> tsp: 0.01 * 202.9 = 2.029 -> "2.0"; almonds: 0.01 / 6.2 = 0.0016 -> "0.0"
    // weekLiters -> gal: 5 * 0.264172 = 1.32086 -> "1.3"; almonds: 5 / 6.2 = 0.8065 -> "0.8"
    const line = formatStatusLine(0.01, 5);
    expect(line).toBe('🥜 Day: 2.0 tsp = 0.0 almonds · Week: 1.3 gal = 0.8 almonds');
  });

  it('shows Day in cups once it clears the tsp tier (1 L = 202.9 tsp / 48 tsp per cup = 4.2 cups)', () => {
    // dayLiters=1 -> almonds: 1 / 6.2 = 0.1613 -> "0.2"
    // weekLiters=6.2 -> gal: 6.2 * 0.264172 = 1.6379 -> "1.6"; almonds: 6.2 / 6.2 = 1 -> "1"
    const line = formatStatusLine(1, 6.2);
    expect(line).toBe('🥜 Day: 4.2 cups = 0.2 almonds · Week: 1.6 gal = 1 almonds');
  });

  it('shows Day in gal (Week formatting) once it clears the cup tier (10 * 0.264172 = 2.6417 -> "2.6")', () => {
    // dayLiters=10 -> almonds: 10 / 6.2 = 1.6129 -> "2"
    // weekLiters=6.2 -> gal: 1.6379 -> "1.6"; almonds: 6.2 / 6.2 = 1 -> "1"
    const line = formatStatusLine(10, 6.2);
    expect(line).toBe('🥜 Day: 2.6 gal = 2 almonds · Week: 1.6 gal = 1 almonds');
  });

  it('lands exactly at CUP_THRESHOLD_LITERS in the cups tier, not tsp', () => {
    // At dayLiters == CUP_THRESHOLD_LITERS, formatDay's `< CUP_THRESHOLD_LITERS`
    // check is false, so it falls into the cups branch (== TSP_PER_CUP tsp == 1 cup).
    const dayCups = ((CUP_THRESHOLD_LITERS * TSP_PER_LITER) / TSP_PER_CUP).toFixed(1);
    const dayAlmonds = formatAlmonds(CUP_THRESHOLD_LITERS / LITERS_PER_ALMOND);
    const weekGal = (0 * GAL_PER_LITER).toFixed(1);
    const weekAlmonds = formatAlmonds(0 / LITERS_PER_ALMOND);
    const line = formatStatusLine(CUP_THRESHOLD_LITERS, 0);
    expect(line).toBe(`🥜 Day: ${dayCups} cups = ${dayAlmonds} almonds · Week: ${weekGal} gal = ${weekAlmonds} almonds`);
  });

  it('lands exactly at GAL_THRESHOLD_LITERS in the gal tier, not cups', () => {
    // At dayLiters == GAL_THRESHOLD_LITERS, formatDay's `< GAL_THRESHOLD_LITERS`
    // check is false, so it falls into the gal branch (== 1 gal, same formatting Week uses).
    const dayGal = (GAL_THRESHOLD_LITERS * GAL_PER_LITER).toFixed(1);
    const dayAlmonds = formatAlmonds(GAL_THRESHOLD_LITERS / LITERS_PER_ALMOND);
    const weekGal = (0 * GAL_PER_LITER).toFixed(1);
    const weekAlmonds = formatAlmonds(0 / LITERS_PER_ALMOND);
    const line = formatStatusLine(GAL_THRESHOLD_LITERS, 0);
    expect(line).toBe(`🥜 Day: ${dayGal} gal = ${dayAlmonds} almonds · Week: ${weekGal} gal = ${weekAlmonds} almonds`);
  });

  it('renders the all-zero day/week line', () => {
    const line = formatStatusLine(0, 0);
    expect(line).toBe('🥜 Day: 0.0 tsp = 0.0 almonds · Week: 0.0 gal = 0.0 almonds');
  });
});

describe('formatStatusLineShort', () => {
  it('renders "D <almonds>🥜 | W <almonds>🥜" with no unit conversion', () => {
    // dayLiters=70.06 -> almonds: 70.06 / 6.2 = 11.3; weekLiters=70.06 -> same
    const line = formatStatusLineShort(70.06, 70.06);
    expect(line).toBe('D 11.3🥜 | W 11.3🥜');
  });

  it('renders the all-zero day/week line', () => {
    const line = formatStatusLineShort(0, 0);
    expect(line).toBe('D 0.0🥜 | W 0.0🥜');
  });
});
