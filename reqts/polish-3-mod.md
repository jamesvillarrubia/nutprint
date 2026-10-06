# POLISH-3: NutPrint as a Claude Code mod

Story: `docs/tmp/story-POLISH-3.md`. Epic: `docs/goals/epic-POLISH.md`.

## Problem

NutPrint shows its count only through `statusLine.command`, which the user sets
by hand or through `/nutprint:setup-statusline`. Claude Code builds with
function-hook mods can pin a plugin's own line under the prompt with
`$.ui.status`, so no settings edit is needed.

## Design

- `hooks/hooks.json` names `../dist/mod/register.js`, bundled by tsup from
  `src/mod/register.ts`.
- The mod hooks `session.start` and `classic.Stop`. In `classic.Stop` it awaits
  `next(e)` first, which runs the classic Stop hooks beneath it (`on-stop.js`
  among them), then reads `~/.claude/almonds/rollup.jsonl` and calls
  `$.ui.status` with the short line.
- The mod reads the rollup, never the ledger: `$.fs.read` rejects files over
  4 MiB, and a real ledger reached 19 MB.
- Day is today's rollup bucket. Week is today plus the six local dates before
  it. `statusline.ts` still uses a rolling 168 hours over the ledger.
- The mod sets no status when the merged settings' `statusLine.command`
  contains `/.claude/almonds/` (the paths `/nutprint:setup-statusline` writes).
- The mod environment has no Node, so the formatters moved to
  `src/services/format.ts` and the rollup parser to
  `src/services/rollup-totals.ts`, both Node-free. `tests/mod-bundle.test.ts`
  fails if `dist/mod/register.js` imports a `node:` module.
- `plugin.json` moved to `.claude-plugin/plugin.json`, the manifest path
  `claude plugin validate` reads.

## Rejected

- Accounting inside the mod from transcripts: the 4 MiB read cap, and `$.fs`
  has no byte-range read.
- Accounting from `turn.complete`'s `usage`: double-counts while the classic
  Stop hook runs, and builds without mods would lose accounting if the Stop
  hook went away.

## Won't

- Detect hand-written status scripts that call NutPrint indirectly.
- Run `claude plugin test` in this repo: it loads every `*.test.ts`, and the
  vitest files import `vitest`, which a hooks module cannot.
