import { describe, expect, it } from 'vitest';
import { parseRollup, rollupTotals } from '../src/services/rollup-totals.js';

// Rollup keys are local dates; pin the zone so the assertions hold anywhere.
process.env.TZ = 'UTC';

describe('parseRollup', () => {
  it('maps each line to date -> liters and skips blank or broken lines', () => {
    const text = '{"date":"2026-10-05","liters":1.5}\n\nnot json\n{"date":"2026-10-06","liters":2}\n';
    expect([...parseRollup(text)]).toEqual([
      ['2026-10-05', 1.5],
      ['2026-10-06', 2],
    ]);
  });
});

describe('rollupTotals', () => {
  it('takes Day from today and Week from today plus the six local dates before it', () => {
    const rollup = new Map([
      ['2026-09-29', 100], // 7 days back: outside the week
      ['2026-09-30', 4], // 6 days back: inside
      ['2026-10-05', 2],
      ['2026-10-06', 1],
    ]);
    const now = new Date('2026-10-06T15:00:00.000Z');
    expect(rollupTotals(rollup, now)).toEqual({ dayLiters: 1, weekLiters: 7 });
  });

  it('answers zero for an empty rollup', () => {
    expect(rollupTotals(new Map(), new Date('2026-10-06T15:00:00.000Z'))).toEqual({
      dayLiters: 0,
      weekLiters: 0,
    });
  });
});
