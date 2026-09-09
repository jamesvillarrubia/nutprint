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

## Threads
