import { describe, it, expect } from 'vitest';
import type { TokenUsage } from '../src/types/usage.js';

describe('toolchain sanity', () => {
  it('type-checks and runs a trivial assertion', () => {
    const usage: TokenUsage = {
      input_tokens: 1,
      cache_creation_input_tokens: 2,
      cache_read_input_tokens: 3,
      output_tokens: 4,
    };
    expect(usage.input_tokens + usage.output_tokens).toBe(5);
  });
});
