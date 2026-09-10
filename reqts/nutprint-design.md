# NutPrint: design

## Outcome

A Claude Code plugin shows a water-usage estimate, converted to almonds, in the
user's status bar: `🥜 Day: X tsp = Y almonds · Week: X gal = Y almonds` (Day's
unit scales to cups or gal above set thresholds; see "Display format" below).
"Day" covers every Claude Code session, across every project and every
account on the machine, since local midnight. "Week" covers the same scope,
trailing 7 days. Both are cross-session totals; neither is scoped to the
one session the statusline happens to be running in. The plugin ships open
source with its constants and their sources documented, so the numbers
survive scrutiny.

## Scope

In:
- A `Stop` hook that reads new token-usage records from the session
  transcript and appends water-liter estimates to a local ledger.
- A statusline script that reads the ledger and renders the display string.
- A sourced constants table and a formula that turns token counts into liters
  and almonds.
- A `SOURCES.md` naming every constant's origin, and flagging which ones are
  measured citations versus documented assumptions.

Won't (v1):
- No provider beyond Anthropic modeled precisely. A non-Anthropic model
  (routed through CCR, a local model, etc.) falls back to one documented
  generic constant set rather than erroring or guessing per-provider.
- No GUI or web dashboard. Status bar text only.
- No network calls at runtime. Every constant is baked into the plugin;
  nothing is looked up live.
- No per-request region detection. The estimate always uses the Project
  Rainier (Indiana) cooling constant, regardless of which AWS region actually
  served a given request. Documented as a known simplification, not silently
  assumed.
- No edits to the user's existing `statusLine` setting. The plugin ships a
  script; the README shows how to point `statusLine.command` at it, including
  how to chain it after an existing statusline command.

## Architecture

TypeScript strict, Node 22, pnpm, tsup, per this project's own stack
defaults. Zero runtime dependencies: only `node:fs`, `node:path`, and
`node:readline` from the standard library. `tsup` builds `src/` to `dist/`;
`plugin.json` and the README's `statusLine.command` both point at the built
`dist/*.js` files, not the TypeScript source.

```
nutprint/
  plugin.json                # registers the Stop hook, points at dist/hooks/on-stop.js
  src/
    hooks/
      on-stop.ts              # reads new transcript bytes, appends to ledger
    cli/
      statusline.ts            # statusLine.command entrypoint
    services/
      estimate.ts               # pure function: usage + model -> liters
    config/
      constants.ts               # every constant, each with a source URL comment
    types/
      usage.ts                    # shared types: TokenUsage, LedgerEntry, Model
  tests/
    estimate.test.ts
    on-stop.test.ts
    statusline.test.ts
  reqts/
    nutprint-design.md
  SOURCES.md
  README.md
  package.json
  tsconfig.json
  tsup.config.ts
```

State lives outside the repo, under `~/.claude/almonds/`:
- `ledger.jsonl` — one line per turn: `{ts, session_id, model, liters}`.
- `offsets/<session_id>` — byte offset already processed for that session's
  transcript, so the Stop hook never re-reads or double-counts a line.

## Data flow

1. Claude Code fires `Stop` after an assistant turn. The hook receives
   `session_id` and `transcript_path`.
2. `on-stop.ts` seeks to the saved offset for `session_id` (0 if none),
   reads only complete new lines (a trailing partial line, per the transcript
   lag the docs warn about, is left for the next tick), and pulls each new
   `message.usage` block.
3. For each usage block, `estimate.ts` computes liters (formula below) and
   `on-stop.ts` appends `{ts, session_id, model, liters}` to `ledger.jsonl`,
   then updates the offset to the last fully-read byte.
4. On every write, entries older than 30 days are dropped from the ledger,
   so the file stays bounded regardless of how long the plugin has been
   installed.
5. `statusline.ts` runs on Claude Code's own statusline refresh interval. It
   filters `ledger.jsonl` by timestamp only, since local midnight for "Day"
   and the trailing 7 days for "Week," summing across every `session_id` in
   range. It ignores the current statusline invocation's own `session_id`
   entirely: both figures are cross-session by design, not scoped to the
   session the statusline happens to be running in. It never reads a
   transcript directly.

## Formula

Per turn, tokens split into four buckets: `input`, `cache_creation`,
`cache_read`, `output`.

1. Energy per bucket, in Wh:
   - `output`: `tokens * 9.4 J/token`. Cited: fit to Jegham et al.'s
     measured Claude-3.7-Sonnet energy at three context lengths (see
     `SOURCES.md`).
   - `input` and `cache_creation`: `tokens * (0.06 * 9.4 J/token)`. Cited:
     same fit. Long-context input tokens measure far cheaper per token
     than short-context ones.
   - `cache_read`: `tokens * (0.1 * 9.4 J/token)`. **Assumption**, not a
     citation: a KV-cache hit is a memory lookup, not a full forward pass.
   - Sum the four, convert J to Wh, then to kWh.
2. Water, in liters: `kWh * (0.15 + 3.142)`.
   - `0.15` L/kWh: AWS's reported water-usage-effectiveness at the Project
     Rainier campus (New Carlisle, Indiana), the facility where Anthropic
     trains and serves Claude on its Trainium2 fleet. Cited.
   - `3.142` L/kWh: Jegham et al.'s Anthropic/AWS-specific source (off-site)
     water intensity, the water cost of generating the electricity itself.
     Cited; supersedes this project's earlier EIA/USGS national-average
     figure (1.8) now that a source tied to the same infrastructure as the
     energy constants above is available.
3. Almonds: `liters / 6.2`. `6.2` L/almond is the blue-water-only share of a
   California almond's footprint: a study commissioned by the Almond Board
   of California (Fulton et al., "Water-indexed benefits and impacts of
   California almonds") splits the almond water footprint into blue
   (irrigation) 635 gal/lb, green (rain) 68 gal/lb, and grey (pollutant
   dilution) 526 gal/lb of 1,229 gal/lb total, that is, blue water is 51.6%
   of the total. A data center's cooling and grid-generation water draw is
   itself blue water (physically withdrawn, not a dilution-capacity figure
   and not rainfall), so the comparison uses the almond's blue-water share
   alone: `12 L/almond total * 0.516 = 6.2 L/almond`. `SOURCES.md` states
   this reasoning explicitly and also names the un-adjusted 12 L total-
   footprint figure most popular sources quote, so a reader can see why this
   design's number is lower than the one they may have seen elsewhere.
   California grows roughly 80% of the world's almonds, in a Central Valley
   basin where about 75% of the state's rainfall falls north of Sacramento;
   the low green-water share (5.5% of the total footprint) is the same
   physical fact as the state's broader water stress, not a coincidence, and
   `SOURCES.md` says so.
4. Display units: Week always shows gallons: `liters * 0.264172`. Day scales
   by threshold, using the same gallon formatting Week uses once it clears
   the gallon threshold: below `CUP_THRESHOLD_LITERS` (1 cup, ~0.237 L)
   shows teaspoons (`liters * 202.9`); from `CUP_THRESHOLD_LITERS` up to
   `GAL_THRESHOLD_LITERS` (1 gallon, ~3.785 L) shows cups
   (`liters * 202.9 / 48`); at or above `GAL_THRESHOLD_LITERS` shows gallons
   (`liters * 0.264172`), same as Week.

Every non-Anthropic model uses one fallback constant set (documented in
`constants.ts`) built from the same output-token energy figure and the
industry-average WUE (1.9 L/kWh) instead of the Project Rainier figure,
since there is no equivalent named facility to cite.

## Display format

`🥜 Day: <amount> <unit> = <almonds> almonds · Week: <gal> gal = <almonds> almonds`

A `--short` flag on the CLI selects a compact form instead:
`D <almonds>🥜 | W <almonds>🥜`. Same almond rounding as the long form, no
unit conversion (day and week are both almond counts only, no tsp/cups/gal).

Day's `<unit>` is tsp, cups, or gal, picked by threshold on the day's raw
liter total: below `CUP_THRESHOLD_LITERS` (1 cup) shows tsp; from
`CUP_THRESHOLD_LITERS` up to `GAL_THRESHOLD_LITERS` (1 gallon) shows cups;
at or above `GAL_THRESHOLD_LITERS` shows gal, formatted the same way Week's
gallon figure is. Week always shows gal.

Rounding: one decimal place for tsp, cups, and gal. Almonds: below 1 shows
one decimal (so a small nonzero amount doesn't round to a bare "0"); from 1
up to 10 rounds to a whole number (a fractional almond count in this range
reads as a rounding artifact); at or above 10 shows one decimal again (the
fraction is small relative to the whole number and worth keeping so the
"week" figure doesn't look suspiciously round).

## Testing

- `test:` `estimate.ts`, given a fixed usage object and the documented
  constants, returns the exact liter value computed by hand in
  `SOURCES.md`'s worked example.
- `test:` running `on-stop.ts` twice against the same transcript file (no
  new lines added between runs) appends nothing to the ledger the second
  time.
- `test:` a transcript with a trailing partial (non-newline-terminated)
  line does not advance the offset past that partial line.
- `test:` ledger entries older than 30 days are absent from the file after
  any write.
- `test:` `statusline.ts`, given a fixture ledger with entries from multiple
  `session_id`s, sums across all of them for both Day and Week rather than
  filtering to one session.
- `test:` `statusline.ts`, given a fixture ledger, renders the exact format
  string above.
- `test:` a usage record whose `model` is not in `constants.ts`'s known list
  uses the fallback constant set rather than raising.

## Regional spread (documentation only, not used in v1's computed number)

The point of this table is not a better constant. It is that "AI data
centers use water" and "almonds use water" are both true and both useless
without naming which facility and which farm. v1's formula still uses one
fixed constant per side (Formula, above); this table exists so `SOURCES.md`
and the README can make the externality point explicit rather than implying
the technology or the crop is uniformly bad.

- **AI side.** Measured worst case: data centers in Arizona have recorded
  peak monthly WUE above 9 L/kWh (hot climate, evaporative cooling). Best
  case: Microsoft's and Oracle's newer closed-loop, non-evaporative,
  direct-to-chip designs report WUE near 0 (the loop is filled once, then
  recirculates with no ongoing evaporation). Project Rainier's 0.15 L/kWh,
  the figure this design actually uses, sits well toward the good end but
  is not the best possible.
- **Almond side.** California's intensively irrigated orchards require
  roughly 12,000-13,000 m³/ha. Spain's traditional Mediterranean rainfed
  (dry-farmed) orchards require roughly 8,500 m³/ha and draw far more of
  that from green water rather than irrigation, though Spain's newer
  high-density orchards are shifting toward irrigation too, so this
  contrast is narrowing over time, not fixed.

Both sides show the same shape: a facility or a farm sited and engineered
without regard to local water stress imposes a cost a facility or farm sited
and engineered with regard to it does not. Neither side's badness is
inherent to the technology or the crop.

## Future extensions (not v1)

- A generated, local HTML report (e.g. `almonds report` opens
  `~/.claude/almonds/report.html` in the default browser) showing usage
  trends over time and the almond-equivalent for a day, a month, and a year,
  visually (a chart, not just numbers). This stays out of v1's scope
  ("No GUI or web dashboard," above); the ledger's append-only design
  already carries enough history to support it later without a schema
  change.
- The same report brackets the user's own estimate between the worst-case
  and best-case regional examples above, on both the AI side and the almond
  side, so the visual makes the externality point (this is about where you
  built it, not what you built) rather than a single flat number.

## Open questions

- Public plugin name: decided as NutPrint (kebab: `nutprint`).
- Whether to chain an existing `statusLine.command` automatically (read the
  user's current setting, wrap it) or leave that entirely to the README's
  manual instructions, is deferred to the implementation plan.
