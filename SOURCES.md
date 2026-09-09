# Sources

Every constant lives in `src/config/constants.ts`. This file explains where
each one comes from and works the example the tests check against.

## Energy per token

- `OUTPUT_JOULES_PER_TOKEN = 1.8`: mid-range of empirical LLM-inference
  energy-per-token measurements (roughly 0.0001-0.002 Wh/token across
  published benchmarks; 1.8 J/token is the midpoint, ~5e-4 Wh/token).
- `INPUT_ENERGY_RATIO = 0.3` and `CACHE_READ_ENERGY_RATIO = 0.1`: **not
  citations, documented assumptions.** Prefill/encoding is cheaper per
  token than autoregressive decode, and a KV-cache hit is a memory lookup
  rather than a full forward pass. No public per-bucket breakdown exists
  to cite directly; these ratios are this project's own estimate.

## Data-center and grid water

- `ANTHROPIC_DC_WUE_L_PER_KWH = 0.15`: AWS's reported water-usage-
  effectiveness at the Project Rainier campus in New Carlisle, Indiana,
  the facility where Anthropic trains and serves Claude on over a million
  Trainium2 chips.
- `FALLBACK_DC_WUE_L_PER_KWH = 1.9`: industry-average data center WUE,
  used for any non-Anthropic model, since there is no equivalent named
  facility to cite for an arbitrary provider.
- `GRID_WATER_L_PER_KWH = 1.8`: EIA/USGS average US thermoelectric
  consumptive water use (water evaporated per kWh of electricity
  generated), on top of data-center cooling water.

## Almonds

- `LITERS_PER_ALMOND = 6.2`: the blue-water-only share of a California
  almond's water footprint. A study commissioned by the Almond Board of
  California (Fulton et al., "Water-indexed benefits and impacts of
  California almonds") splits the almond water footprint into blue
  (irrigation) 635 gal/lb, green (rain) 68 gal/lb, and grey (pollutant
  dilution) 526 gal/lb, of 1,229 gal/lb total: blue water is 51.6% of the
  total. A data center's cooling and grid-generation water draw is
  physically withdrawn blue water, not a pollutant-dilution figure and
  not rainfall, so this project compares like to like: the almond's
  blue-water share alone, `12 L/almond total * 0.516 = 6.2 L/almond`. The
  popular "1 gallon" or "12 liter" total-footprint figures most sources
  quote are the un-adjusted number; this project's figure is
  deliberately lower, for the reason above, not by mistake.

  California grows roughly 80% of the world's almonds, in a Central
  Valley basin where about 75% of the state's rainfall falls north of
  Sacramento. The almond's low green-water share (5.5% of its total
  footprint) is the same underlying fact as the region's water stress:
  there is little rain to grow it on.

## Regional spread (context, not used in the computed number)

This project's formula uses one fixed constant per side. The spread below
exists to make one point: neither AI infrastructure nor almond farming is
uniformly water-heavy. Where and how it is built decides that.

- **AI side.** Measured worst case: data centers in Arizona have recorded
  peak monthly WUE above 9 L/kWh (hot climate, evaporative cooling). Best
  case: Microsoft's and Oracle's newer closed-loop, non-evaporative,
  direct-to-chip designs report WUE near 0 (the loop fills once, then
  recirculates with no ongoing evaporation). This project's own figure,
  0.15 L/kWh, sits well toward the good end but is not the best possible.
- **Almond side.** California's intensively irrigated orchards require
  roughly 12,000-13,000 m³/ha. Spain's traditional Mediterranean rainfed
  (dry-farmed) orchards require roughly 8,500 m³/ha and draw far more of
  that from green water, though Spain's newer high-density orchards are
  shifting toward irrigation too.

## Worked example

Given `{ input_tokens: 2, cache_creation_input_tokens: 2367,
cache_read_input_tokens: 106518, output_tokens: 6240 }` on
`claude-sonnet-5`:

```
output:         6240 * 1.8               = 11232 J
input:             2 * 1.8 * 0.3          =  1.08 J
cache_creation: 2367 * 1.8 * 0.3          = 1278.18 J
cache_read:   106518 * 1.8 * 0.1          = 19173.24 J
total:                                      31684.5 J = 0.00880125 kWh
liters:  0.00880125 * (0.15 + 1.8)        = 0.0171624375 L
almonds: 0.0171624375 / 6.2               = 0.00277 almonds
```

`tests/estimate.test.ts` asserts this exact value.
