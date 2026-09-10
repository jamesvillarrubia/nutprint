```yaml
rung: epic
id: PUBLISH
title: a stranger finds this repo, trusts the numbers, and gets the statusline running
parent: docs/goals/VISION.md#the-pitch
status: proposed
owner: james
updated: 2026-09-09
```

NutPrint's code has real citations and real tests. Its README still names a
placeholder repo URL, there's no CI, and the install path assumes a reader
already trusts the project enough to clone and build it from source. PUBLISH
closes that gap: the repository itself, not just the code, reaches a bar
where a stranger can land on it, believe the numbers, and end up with a
working statusline.

## Done when

- `test:` README's install section names this repository's real URL
  (`github.com/jamesvillarrubia/nutprint`), not a placeholder.
- `test:` a GitHub Actions workflow runs `pnpm typecheck`, `pnpm test`, and
  `pnpm build` on every push and pull request, and shows green on `main`.
- `James:` a person with no prior context on this project, given only the
  README, reaches a working statusline without an undocumented step or a
  question for James.
- `James:` someone who did not watch `SOURCES.md` get written finds every
  number in it traceable to a named source or an explicit assumption, in
  language they can verify themselves.

## Won't

- Won't publish to the npm registry or a plugin marketplace listing. A git
  clone plus `pnpm install && pnpm build` stays the install path; this
  epic makes that path accurate and complete, not shorter.
- Won't add a hosted demo, a landing page, or any service beyond the
  repository and its README.

## Depends on

- `epic-POLISH.md` POLISH-1 (wrap an existing `statusLine.command` instead
  of asking the reader to hand-edit JSON) narrows the same install gap
  from another side; PUBLISH doesn't duplicate it.

## Stories

1. PUBLISH-1 · proposed · unscheduled · README and `plugin.json` name this
   repository's real URL, license, and a one-line description a stranger
   can act on without asking James · tasks 0/1
2. PUBLISH-2 · proposed · unscheduled · CI runs typecheck, test, and build
   on every push and pull request · tasks 0/1
3. PUBLISH-3 · proposed · unscheduled · a fresh clone, following only the
   README, produces a working statusline on a machine that has never seen
   this repo · tasks 0/1

## Threads
