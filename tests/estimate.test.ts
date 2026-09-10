import { describe, it, expect } from 'vitest';
import { estimateLiters } from '../src/services/estimate.js';
import type { TokenUsage } from '../src/types/usage.js';

describe('estimateLiters', () => {
  it('matches the worked example in reqts/nutprint-design.md for an Anthropic model', () => {
    const usage: TokenUsage = {
      input_tokens: 2,
      cache_creation_input_tokens: 2367,
      cache_read_input_tokens: 106518,
      output_tokens: 6240,
    };

    const liters = estimateLiters(usage, 'claude-sonnet-5');

    // output: 6240 * 9.4 = 58656 J
    // input: 2 * 9.4 * 0.06 = 1.128 J
    // cache_creation: 2367 * 9.4 * 0.06 = 1334.988 J
    // cache_read: 106518 * 9.4 * 0.1 = 100126.92 J
    // total: 160119.036 J = 0.04447751 kWh
    // liters: 0.04447751 * (0.15 + 3.142) = 0.14641996292
    expect(liters).toBeCloseTo(0.14641996292, 8);
  });

  it('uses the fallback WUE for a non-Anthropic model', () => {
    const usage: TokenUsage = {
      input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 1000,
    };

    const liters = estimateLiters(usage, 'gpt-4o');

    // output: 1000 * 9.4 = 9400 J = 0.0026111111 kWh
    // liters: 0.0026111111 * (1.9 + 3.142) = 0.0131652222
    expect(liters).toBeCloseTo(0.0131652222, 8);
  });

  it('returns 0 for all-zero usage', () => {
    const usage: TokenUsage = {
      input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 0,
    };

    expect(estimateLiters(usage, 'claude-sonnet-5')).toBe(0);
  });
});
