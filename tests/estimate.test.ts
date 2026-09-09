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

    // output: 6240 * 1.8 = 11232 J
    // input: 2 * 1.8 * 0.3 = 1.08 J
    // cache_creation: 2367 * 1.8 * 0.3 = 1278.18 J
    // cache_read: 106518 * 1.8 * 0.1 = 19173.24 J
    // total: 31684.5 J = 0.00880125 kWh
    // liters: 0.00880125 * (0.15 + 1.8) = 0.0171624375
    expect(liters).toBeCloseTo(0.0171624375, 8);
  });

  it('uses the fallback WUE for a non-Anthropic model', () => {
    const usage: TokenUsage = {
      input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 1000,
    };

    const liters = estimateLiters(usage, 'gpt-4o');

    // output: 1000 * 1.8 = 1800 J = 0.0005 kWh
    // liters: 0.0005 * (1.9 + 1.8) = 0.00185
    expect(liters).toBeCloseTo(0.00185, 8);
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
