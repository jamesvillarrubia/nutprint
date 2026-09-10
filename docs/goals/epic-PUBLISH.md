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

1. PUBLISH-1 · done · unscheduled · README and `plugin.json` name this
   repository's real URL, license, and a one-line description a stranger
   can act on without asking James · tasks 1/1
2. PUBLISH-2 · done · unscheduled · CI runs typecheck, test, and build
   on every push and pull request · tasks 1/1
3. PUBLISH-3 · done · unscheduled · a fresh clone, following only the
   README, produces a working statusline on a machine that has never seen
   this repo · tasks 1/1

## Threads
- 2026-09-09: All three stories shipped in one pass (`47ddbd1`/`4de849f` merge for
  PUBLISH-1/2, PR #1/`6bb03c7` for the CI badge that also verified PUBLISH-2's
  `pull_request` trigger, PUBLISH-3 verified by a real fresh clone into scratch that built
  and ran clean via README's own steps alone). Both `test:` Done-when items hold with
  command evidence (`docs/tmp/story-PUBLISH-{1,2,3}.md`). The two `James:` items (a
  no-context reader reaches a working statusline; SOURCES.md reads as trustworthy to
  someone who didn't watch it get written) were proxy-verified this session. The
  PUBLISH-3 fresh-clone smoke test stands in for the first. A completeness check
  confirmed every constant that feeds the water/almond calculation (7 of `constants.ts`'s
  13 exports; the other 6 are unit-conversion or policy constants, already flagged
  "derived/definitional, not a citation" in `constants.ts` itself) has a named source or
  flagged assumption in `SOURCES.md`, for the second. Neither is James's own read, though;
  flagged to James as still open in that specific sense.
- 2026-09-09: Re-audited `SOURCES.md` adversarially (re-fetched the Jegham et al. paper's
  abstract and its Table 4/Table 1 directly, quote-checked against what had been written).
  Found and fixed a real defect: the paper's authors were misattributed ("Jegham, Shourou,
  Perakis, and Yasseri" instead of the actual Jegham, Abdelatti, Koh, Elmoubarki, and
  Hendawi), a citation error a skeptical reader would have caught immediately by trying to
  look the paper up. Also added the paper's own verbatim methodology sentence for the
  off-site WUE figure, and fixed a stray em-dash the writing gate should have caught before
  it shipped. The energy/water numbers themselves were independently re-verified against
  the paper's Table 4 and Table 1 and matched exactly; only the citation text was wrong.
