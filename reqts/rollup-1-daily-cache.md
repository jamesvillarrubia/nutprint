# ROLLUP-1: a durable per-day rollup, written at Stop-hook time

Story: `docs/tmp/story-ROLLUP-1.md`. Epic: `docs/goals/epic-ROLLUP.md`.

## Problem

`on-stop.ts` calls `pruneOldEntries` on every Stop event, which reads and re-parses the
entire ledger, then rewrites the whole file, every turn. `statusline.ts` reads and
linear-scans the entire ledger on every render. Neither cost bounds itself as history grows,
and neither can serve a month/year total once an entry ages past the ledger's 30-day
retention: the data is gone.

## Chosen approach: a single rollup file, keyed by date, updated in place

`~/.claude/almonds/rollup.jsonl`, one line per calendar day (local time, matching
`statusline.ts`'s existing day-boundary logic):
`{"date":"2026-09-08","liters":0.0421}`

`src/services/rollup.ts`:
- `readRollup(path): Map<string, number>` — parses the file into a date→liters map. Empty
  map if the file does not exist.
- `writeRollup(path, map)` — atomic write (tmp file + rename, matching `pruneOldEntries`'s
  existing pattern in `ledger.ts`).
- `addToRollup(path, dateKey, liters)` — reads the map, adds `liters` to `map[dateKey]`
  (default 0), writes it back. Called once per Stop event from `on-stop.ts`, right after the
  ledger append loop, with the sum of the new entries' liters for `now`'s local date.
- `backfillRollupIfMissing(rollupPath, ledgerPath)` — if `rollupPath` does not exist,
  build it once from every entry currently in the ledger (bounded: ledger is already capped
  at 30 days), then write it. Called at the top of `processStopEvent`, before the append
  loop, so an existing v1 install gets a correct rollup on its very next turn.

## Why this over the alternatives considered (MoSCoW 2, see story file)

- Rejected: fold the ledger and the rollup into one file (drop the per-turn detail log).
  `epic-ROLLUP.md`'s Won't list rules this out explicitly; the ledger stays the detail log,
  the rollup is a derived cache.
- Rejected: do nothing, extend `LEDGER_RETENTION_DAYS` instead. Makes the per-turn file
  bigger and the full-file rewrite in `pruneOldEntries` more expensive, the opposite of the
  goal, and still discards the express purpose (retention past a wide window would grow
  ledger.jsonl without bound for a heavy user).
- Rejected: append-only rollup (one line per turn, unaggregated, summed at read time).
  Cheaper write (pure append) but does not bound read cost by day count; a month/year read
  still sums many lines per bucket. Does not solve the reader-side problem ROLLUP-2 depends
  on.

## Scope of this story

Write side only. `addToRollup`/`backfillRollupIfMissing` wire into `on-stop.ts`.
`statusline.ts` still reads the ledger directly (unchanged) until ROLLUP-2 migrates it to
read `rollup.jsonl`. This keeps each story independently testable: ROLLUP-1 proves the
rollup is correct and durable; ROLLUP-2 proves the reader gets the same numbers from it.
