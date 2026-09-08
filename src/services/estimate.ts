import {
  ANTHROPIC_DC_WUE_L_PER_KWH,
  CACHE_READ_ENERGY_RATIO,
  FALLBACK_DC_WUE_L_PER_KWH,
  GRID_WATER_L_PER_KWH,
  INPUT_ENERGY_RATIO,
  OUTPUT_JOULES_PER_TOKEN,
  isAnthropicModel,
} from '../config/constants.js';
import type { TokenUsage } from '../types/usage.js';

export function estimateLiters(usage: TokenUsage, model: string): number {
  const outputJoules = usage.output_tokens * OUTPUT_JOULES_PER_TOKEN;
  const inputJoules = usage.input_tokens * OUTPUT_JOULES_PER_TOKEN * INPUT_ENERGY_RATIO;
  const cacheCreationJoules =
    usage.cache_creation_input_tokens * OUTPUT_JOULES_PER_TOKEN * INPUT_ENERGY_RATIO;
  const cacheReadJoules =
    usage.cache_read_input_tokens * OUTPUT_JOULES_PER_TOKEN * CACHE_READ_ENERGY_RATIO;

  const totalJoules = outputJoules + inputJoules + cacheCreationJoules + cacheReadJoules;
  const kWh = totalJoules / 3_600_000;

  const wuePerKwh = isAnthropicModel(model) ? ANTHROPIC_DC_WUE_L_PER_KWH : FALLBACK_DC_WUE_L_PER_KWH;
  return kWh * (wuePerKwh + GRID_WATER_L_PER_KWH);
}
