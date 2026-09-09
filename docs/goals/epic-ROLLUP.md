```yaml
rung: epic
id: ROLLUP
title: cached daily totals replace a full-ledger scan on every render
parent: docs/goals/VISION.md#invariants-checked-every-iteration
status: active
owner: james
updated: 2026-09-08
```

Today `statusline.ts` calls `readAllEntries`, which parses every line of
`~/.claude/almonds/ledger.jsonl`, then linear-scans all of them on every
statusline render (`src/services/ledger.ts`, `src/cli/statusline.ts`). The
Stop hook already knows each new entry the moment it appends it. ROLLUP
moves the day/week/month/year sums into a cached rollup keyed by date, so
a render reads a bounded number of buckets instead of the full ledger.
Rollup buckets persist past the ledger's 30-day prune window (the ledger
stays the per-turn detail log; the rollup is the durable aggregate),
which also removes the retention gap flagged in `epic-REPORT.md`: a
month or year chart reads rollup buckets, not pruned raw entries.

## Done when

- `test:` appending a new entry via `on-stop.ts` updates that day's
  rollup bucket without rewriting or rescanning the full ledger.
- `test:` `statusline.ts` computes Day and Week from the rollup, not from
  `readAllEntries` over the full ledger.
- `test:` a rollup bucket for a date outside the ledger's 30-day
  retention window still holds its total after `pruneOldEntries` runs.
- `test:` a ledger with no matching rollup file yet (upgrade path from
  the v1 shipped so far) backfills the rollup once from existing entries,
  then never rescans the full ledger again.

## Won't

- Won't change the ledger's per-entry schema or its 30-day retention.
  The ledger stays the detail log; the rollup is a derived cache.
- Won't add a database. The rollup is a small file
  (`~/.claude/almonds/rollup.jsonl`, one line per day) under the same
  `~/.claude/almonds/` directory.

## Stories

1. ROLLUP-1 · active · unscheduled · on-stop hook writes a per-day
   rollup bucket alongside each ledger append · tasks 0/1
2. ROLLUP-2 · proposed · unscheduled · statusline reads Day/Week from the
   rollup instead of scanning the full ledger, with a one-time backfill
   for existing installs · tasks 0/1

## Threads
