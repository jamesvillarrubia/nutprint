```yaml
rung: epic
id: REPORT
title: a local visual report shows usage in context, not just a number
parent: docs/goals/VISION.md#the-pitch
status: proposed
owner: james
updated: 2026-09-08
```

A report command generates a local HTML file at `~/.claude/almonds/report.html`
and opens it in the default browser. The report charts almond-equivalent
usage over the history the ledger holds. It brackets the user's own number
between the worst-case and best-case regional examples in `SOURCES.md`'s
Regional spread section, on both the AI side and the almond side. The
bracket makes the point that siting and engineering set the externality,
not the technology or the crop.

## Done when

- `test:` the report command writes a valid HTML file to
  `~/.claude/almonds/report.html` from a fixture ledger and the file opens
  in the default browser (or the open call is mocked and asserted).
- `test:` the chart shows almond-equivalent totals bucketed by day, by
  month, and by year, for whatever history the ledger currently holds.
- `test:` the chart draws the worst-case and best-case regional bracket
  lines from `SOURCES.md`'s Regional spread figures on both the AI axis
  and the almond axis.

## Won't

- Won't read raw ledger entries for month or year buckets. `epic-ROLLUP.md`
  keeps a durable per-day rollup that survives the ledger's 30-day
  prune window; REPORT-1 depends on ROLLUP shipping first (or reads
  whatever rollup history exists so far if it ships ahead of ROLLUP).
- Won't add a hosted service, an account, or any sync. The report stays a
  local file.

## Depends on

- `epic-ROLLUP.md`, for month/year totals that outlive the ledger's
  30-day retention window.

## Stories

1. REPORT-1 · proposed · unscheduled · report command and page renders
   almond-equivalent totals from the ledger · tasks 0/1
2. REPORT-2 · proposed · unscheduled · report brackets the user's number
   against regional best/worst-case examples · tasks 0/1

## Threads
