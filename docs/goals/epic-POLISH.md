```yaml
rung: epic
id: POLISH
title: small UX gaps deferred out of v1
parent: docs/goals/VISION.md#the-pitch
status: proposed
owner: james
updated: 2026-09-08
```

POLISH tracks small, user-observable gaps deferred out of NutPrint's v1
scope: places where the plugin works but asks more of the user than it
should. The first: v1's README tells the user to manually edit
`statusLine.command`; POLISH-1 reads the user's existing setting and offers
to wrap it instead of replacing it.

## Done when

- `James:` every story below reaches status done.

## Won't

- Won't silently rewrite `~/.claude/settings.json`. Any chaining stays
  opt-in: a generated wrapper script the user points `statusLine.command`
  at themselves, or an explicit confirm prompt before any file write.

## Stories

1. POLISH-1 · proposed · unscheduled · detect an existing
   `statusLine.command` and offer to wrap it · tasks 0/1
2. POLISH-2 · proposed · unscheduled · James reported live: Day showed
   "1034.4 tsp = 1 almonds" (5.1 L / 6.2 = 0.82, rounds to "1" per the
   below-10 whole-number rule). Math checks out against constants.ts, not
   a bug; likely this exact session's own 250+-turn cache_read volume
   since the Stop hook went live mid-session. Real gaps: (a) no unit
   scaling past tsp for Day as the number grows (illegible past ~1 cup),
   (b) rounding 0.82 up to a bare "1" understates/misleads next to a
   large raw-unit figure · tasks 0/1

## Threads
