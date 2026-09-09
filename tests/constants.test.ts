import { describe, it, expect } from 'vitest';
import {
  OUTPUT_JOULES_PER_TOKEN,
  INPUT_ENERGY_RATIO,
  CACHE_READ_ENERGY_RATIO,
  ANTHROPIC_DC_WUE_L_PER_KWH,
  FALLBACK_DC_WUE_L_PER_KWH,
  GRID_WATER_L_PER_KWH,
  LITERS_PER_ALMOND,
  TSP_PER_LITER,
  GAL_PER_LITER,
  LEDGER_RETENTION_DAYS,
  isAnthropicModel,
} from '../src/config/constants.js';

describe('constants', () => {
  it('match the sourced values in reqts/nutprint-design.md', () => {
    expect(OUTPUT_JOULES_PER_TOKEN).toBe(1.8);
    expect(INPUT_ENERGY_RATIO).toBe(0.3);
    expect(CACHE_READ_ENERGY_RATIO).toBe(0.1);
    expect(ANTHROPIC_DC_WUE_L_PER_KWH).toBe(0.15);
    expect(FALLBACK_DC_WUE_L_PER_KWH).toBe(1.9);
    expect(GRID_WATER_L_PER_KWH).toBe(1.8);
    expect(LITERS_PER_ALMOND).toBe(6.2);
    expect(TSP_PER_LITER).toBe(202.9);
    expect(GAL_PER_LITER).toBe(0.264172);
    expect(LEDGER_RETENTION_DAYS).toBe(30);
  });

  it('recognizes Anthropic models by the claude- prefix', () => {
    expect(isAnthropicModel('claude-sonnet-5')).toBe(true);
    expect(isAnthropicModel('claude-opus-5')).toBe(true);
    expect(isAnthropicModel('gpt-4o')).toBe(false);
    expect(isAnthropicModel('llama-3')).toBe(false);
  });
});
