```yaml
rung: vision
id: nutprint
title: AI's water cost, in almonds, in the status bar
status: active
owner: james
updated: 2026-09-08
```

## The pitch

NutPrint reads Claude Code's own token-usage records and converts them to
liters of water, then to almonds, in the status bar:
`🥜 Day: X tsp = Y almonds · Week: X gal = Y almonds`. A developer sees the
number every session, without opening a report or running a command.

## The pillars

- Cited numbers. Every constant in `constants.ts` traces to a source URL
  or a documented assumption in `SOURCES.md`.
- No network calls at runtime. Every constant ships baked into the
  plugin; nothing is looked up live.
- Cross-session totals. Day and Week sum every Claude Code session on the
  machine, across every project and every account.
- Visual history. A local report charts usage across a day, a month, and
  a year, without a server, a database, or an account.
- Open source. MIT license, public repository, so a reader can check the
  math themselves.

## Definition of done

A release is done when every constant in `constants.ts` carries a
citation or a flagged assumption in `SOURCES.md`, `pnpm test` passes, and
the statusline renders without a network call. NutPrint has no final
release; each version meets this bar or it does not ship.

## Hard constraints

- No network call at runtime. Every number in `constants.ts` is a
  compile-time constant.
- No data leaves the machine. The ledger and every rollup or report file
  stay under `~/.claude/almonds/`; nothing uploads.
- One fixed constant set per model class per release. Live per-region
  detection is out of scope; `SOURCES.md`'s Regional spread section
  documents the real spread as context, not as a computed input.

## Invariants (checked every iteration)

- Every constant in `constants.ts` has a matching citation or assumption
  flag in `SOURCES.md`, updated in the same commit as the constant.
- The worked example in `reqts/nutprint-design.md` and the output of
  `src/services/estimate.ts` compute the same number; a change to one
  without the other is a defect.
- Aggregates update incrementally. A new usage record updates a cached
  rollup at write time; the statusline and the report both read the
  rollup, not a full scan of raw ledger history, on every render.
- `pnpm test` and `pnpm build` pass before any commit that touches `src/`.

## Out of scope

- A hosted service, an account, or any sync. Every ledger, rollup, and
  report file stays on the user's own machine.
- Per-provider precision beyond Anthropic. A non-Anthropic model uses the
  one documented fallback constant set.
- Silent edits to the user's `statusLine.command`. Any automatic chaining
  requires the user's explicit action (running a command, or approving a
  generated wrapper), never an unattended file rewrite.

## Taste (judgement, never verified by a test)

- The display string reads as a fact, not an argument. No moralizing
  language beyond the plugin's own name.
- Rounding favors readability over false precision: whole almonds below
  10, one decimal above 10.

## Standing rules

- TypeScript strict, Node 22, pnpm, tsup, per this machine's global stack
  default.
- Every commit that changes a number in `constants.ts` updates
  `SOURCES.md` in the same commit.
- Every commit that changes `src/` rebuilds and commits `dist/` in the
  same commit. `dist/` is tracked in git (not gitignored) because the
  plugin marketplace install pulls a `github`-source repo with no build
  step; CI fails the build if `dist/` drifts from `src/`
  (`.github/workflows/ci.yml`'s `git diff --exit-code -- dist` check).
- James commits directly to `main`; an outside contributor's change goes
  through a PR.
