//
// Every constant here is either a cited measurement or a documented
// assumption. See SOURCES.md for the full citation list and the worked
// example these numbers feed.

// Energy per output token. Cited: mid-range empirical LLM-inference
// energy-per-token measurements (~1.8 J/token).
export const OUTPUT_JOULES_PER_TOKEN = 1.8;

// Assumption, not a citation: prefill/encoding is cheaper per token than
// autoregressive decode. Applied to input and cache_creation tokens.
export const INPUT_ENERGY_RATIO = 0.3;

// Assumption, not a citation: a KV-cache hit is a memory lookup, not a
// full forward pass.
export const CACHE_READ_ENERGY_RATIO = 0.1;

// Cited: AWS's reported water-usage-effectiveness at the Project Rainier
// campus (New Carlisle, Indiana), where Anthropic trains and serves
// Claude on its Trainium2 fleet.
export const ANTHROPIC_DC_WUE_L_PER_KWH = 0.15;

// Cited: industry-average data center WUE. Used for any model that is
// not Anthropic's, since there is no equivalent named facility to cite.
export const FALLBACK_DC_WUE_L_PER_KWH = 1.9;

// Cited: EIA/USGS average US thermoelectric consumptive water use, the
// water cost of generating the electricity itself, on top of
// data-center cooling.
export const GRID_WATER_L_PER_KWH = 1.8;

// Cited: blue-water-only share of a California almond's water footprint.
// 12 L/almond total footprint * 51.6% blue water (Fulton et al.,
// "Water-indexed benefits and impacts of California almonds").
export const LITERS_PER_ALMOND = 6.2;

export const TSP_PER_LITER = 202.9;
export const GAL_PER_LITER = 0.264172;

// Derived/definitional, not a citation: 1 US cup = 48 tsp; 1 US gallon =
// 16 cups = 768 tsp. Used to pick Day's display unit (tsp/cups/gal) so it
// doesn't show an unbounded tsp count.
export const TSP_PER_CUP = 48;
export const CUP_THRESHOLD_LITERS = TSP_PER_CUP / TSP_PER_LITER;
export const GAL_THRESHOLD_LITERS = (16 * TSP_PER_CUP) / TSP_PER_LITER;

export const LEDGER_RETENTION_DAYS = 30;

export function isAnthropicModel(model: string): boolean {
  return model.startsWith('claude-');
}
