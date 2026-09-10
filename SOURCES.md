# Sources

Every constant lives in `src/config/constants.ts`. This file explains where
each one comes from and works the example the tests check against.

## Energy per token

- `OUTPUT_JOULES_PER_TOKEN = 9.4` and `INPUT_ENERGY_RATIO = 0.06`: fit to
  Jegham, Abdelatti, Koh, Elmoubarki, and Hendawi, "How Hungry is AI?
  Benchmarking Energy, Water, and Carbon Footprint of LLM Inference"
  (arXiv:2505.09598). Not peer-reviewed (arXiv preprint, first posted May
  2025, revised through at least v6), but the only source found that
  measures actual Claude requests rather than an industry-wide average or a
  back-solved estimate.

  The paper reports measured Wh for Claude-3.7-Sonnet at three context
  lengths:

  | Config | Input | Output | Measured energy |
  |---|---|---|---|
  | Short | 100 | 300 | 0.836 ± 0.102 Wh |
  | Medium | 1,000 | 1,000 | 2.781 ± 0.277 Wh |
  | Long | 10,000 | 1,500 | 5.518 ± 0.751 Wh |

  This project's formula splits energy into `output_tokens * x` plus
  `input_tokens * x * r`, so `x` and `r` can be solved from any two rows.
  Using medium and long: `x ≈ 9.44 J/token`, `r ≈ 0.06`. Checked against the
  short row: predicted 0.80 Wh, measured 0.836 ± 0.102 Wh (inside the error
  bar). Rounded to `9.4` and `0.06`.

  This replaces the project's earlier assumption of `1.8 J/token` and
  `INPUT_ENERGY_RATIO = 0.3` (an unmeasured "prefill is parallel, so
  cheaper" guess). The fitted `r ≈ 0.06` still points the same direction
  (input cheaper than output) but by a larger margin, because long-context
  prefill amortizes far better than a fixed 0.3 ratio assumed.

  **Why not the peer-reviewed source instead:** Oviedo, Kazhamiaka,
  Choukse, Kim, Luers, Nakagawa, Bianchini, and Lavista Ferres, "Energy use
  of AI inference, efficiency pathways, and test-time scaling" (*Joule*,
  April 2026) is peer-reviewed and reports a much lower figure (median 0.31
  Wh/query, IQR 0.16–0.60 Wh) consistent with `1.8 J/token`. But it reports
  an aggregate across Microsoft's own production models, not a per-model or
  per-provider breakdown, and Microsoft's own blog post summarizing it
  ("Scaling AI with 8 to 20x energy efficiency," June 2026) cites this same
  paper for its "0.0–0.067 mL water per query" claim. The low-end figures
  researched for this project all trace back to one source, and that
  source isn't Claude-specific. Jegham et al. is the only source found
  that measures Claude requests directly, at the cost of not being
  peer-reviewed.

- `CACHE_READ_ENERGY_RATIO = 0.1`: **not a citation, a documented
  assumption.** A KV-cache hit is a memory lookup rather than a full
  forward pass. No public source, peer-reviewed or not, gives a direct
  energy measurement for a cache read. This ratio remains this project's
  own guess, and stays the dominant term in any cache-heavy workload's
  estimate (cache reads commonly outnumber output tokens 100:1 or more in
  real Claude Code sessions).

## Data-center and grid water

- `ANTHROPIC_DC_WUE_L_PER_KWH = 0.15`: AWS's reported water-usage-
  effectiveness at the Project Rainier campus in New Carlisle, Indiana,
  the facility where Anthropic trains and serves Claude on over a million
  Trainium2 chips. Jegham et al. (above) separately report an "AWS-
  reported" on-site WUE of 0.18 L/kWh, close enough to corroborate this
  figure without replacing it; Project Rainier is the more specific,
  named-facility citation.
- `FALLBACK_DC_WUE_L_PER_KWH = 1.9`: industry-average data center WUE,
  used for any non-Anthropic model, since there is no equivalent named
  facility to cite for an arbitrary provider.
- `GRID_WATER_L_PER_KWH = 3.142`: Jegham et al.'s Anthropic/AWS-specific
  source (off-site) water intensity, the water evaporated per kWh of
  electricity generated, on top of data-center cooling water. The paper's
  own words for how it assigns this figure (Section 4.1): "For AWS-hosted
  Anthropic and Meta models, we apply AWS-reported PUE and site-level WUE,
  using U.S. national averages for source WUE." Replaces this project's
  earlier figure of 1.8 L/kWh (USGS/NREL's thermoelectric-only consumptive
  figure) now that a source tied to the same infrastructure as the energy
  constants above is available. The two figures are not the same
  measurement re-read differently: 1.8 L/kWh covers thermoelectric plants
  only, while a source-WUE figure covering the full U.S. generation mix
  (thermoelectric plus hydroelectric, whose reservoir evaporation is far
  higher per kWh) plausibly lands higher; independent published ranges for
  this kind of full-mix water-intensity factor run from about 0.8 to 9
  L/kWh depending on region and generation mix, and 3.142 sits inside that
  range.

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
  0.15 L/kWh on-site, sits well toward the good end but is not the best
  possible.
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
output:         6240 * 9.4               = 58656 J
input:             2 * 9.4 * 0.06        =     1.128 J
cache_creation: 2367 * 9.4 * 0.06        =  1334.988 J
cache_read:   106518 * 9.4 * 0.1         = 100126.92 J
total:                                     160119.036 J = 0.04447751 kWh
liters:  0.04447751 * (0.15 + 3.142)     = 0.14641996292 L
almonds: 0.14641996292 / 6.2             = 0.02362 almonds
```

`tests/estimate.test.ts` asserts this exact value.
