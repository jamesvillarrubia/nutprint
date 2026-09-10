# NutPrint

[![CI](https://github.com/jamesvillarrubia/nutprint/actions/workflows/ci.yml/badge.svg)](https://github.com/jamesvillarrubia/nutprint/actions/workflows/ci.yml)

Shows AI water usage in your Claude Code status bar, converted to
almonds: `D 1🥜 | W 150🥜`. A `--long` flag spells it out:
`🥜 Day: 3.5 tsp = 1 almonds · Week: 2.4 gal = 150 almonds`.

"Day" and "Week" cover every Claude Code session on this machine, across
every project and every account, not just the one the status bar happens
to be running in.

Every constant behind the number is cited or flagged as an assumption in
[`SOURCES.md`](./SOURCES.md). This is a playful estimate, not a
measurement Anthropic or AWS publishes; it exists to make a point about
where AI's water use is worst and best, not to be exact.

## Install

```bash
claude plugin marketplace add jamesvillarrubia/nutprint
claude plugin install nutprint@nutprint
```

`claude plugin update nutprint` picks up a new release later; no reinstall,
no rebuild. This repo also ships its built `dist/` in git for exactly that
reason.

Cloning the repo and building it yourself still works (`pnpm install &&
pnpm build`, then point Claude Code's plugin flow at the local checkout);
the marketplace install above is just the shorter path.

## Point your status bar at it

Inside Claude Code, run:

```
/nutprint:setup-statusline
```

That sets `statusLine.command` in `~/.claude/settings.json` for you. If you
already have a `statusLine.command`, it asks before touching anything: chain
NutPrint onto your existing one (wrapping both in a small generated script),
or leave it alone and hand you the one line to add yourself. It backs up
`settings.json` before writing to it either way.

Prefer to do it by hand? Add this to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/almonds/statusline.js"
  }
}
```

That fixed path (`~/.claude/almonds/statusline.js`), not the plugin's own
install directory, is deliberate: Claude Code caches an installed plugin
under a version-numbered path
(`~/.claude/plugins/cache/nutprint/nutprint/0.1.0/...`), which would move on
every `claude plugin update`. NutPrint's own `Stop` hook re-copies its
statusline script to the fixed path on every session, so `statusLine.command`
never has to change. That also means the fixed path won't exist until you've
finished at least one Claude Code session after installing.

Already have a `statusLine.command` and doing this by hand? Chain them in a
small wrapper script instead of replacing it:

```bash
#!/usr/bin/env bash
your-existing-statusline-command
printf ' · '
node ~/.claude/almonds/statusline.js
```

Point `statusLine.command` at that wrapper script instead.

The default form is compact: `D 11.3🥜 | W 11.3🥜`. Add `--long` for the
spelled-out form: `🥜 Day: 3.5 tsp = 1 almonds · Week: 2.4 gal = 150 almonds`.

## Why the numbers are what they are

Short version: a data center's water draw is blue water (physically
withdrawn), so this project compares it to the blue-water share of a
California almond's footprint (6.2 L), not the popular blended
green+blue+grey figure (~12 L) that most "gallons per almond" claims
quote. Full reasoning and every citation: [`SOURCES.md`](./SOURCES.md).

## New construction versus legacy infrastructure

NutPrint measures water in almonds instead of liters because a raw liter
count reads as a large, hard-to-place number by itself. A per-almond
figure gives a reader a reference point they can check.

Project Rainier, the AWS facility that trains and serves Claude, runs at
0.15 L/kWh on-site. The industry-average facility this project uses as a
fallback for other models runs at 1.9 L/kWh. Data centers in hot,
evaporative-cooling climates like Arizona have recorded peaks above
9 L/kWh. `SOURCES.md` cites all three figures.

New AI data centers exist because compute demand already exists. A
construction block does not remove that demand. The workload moves to an
existing facility, typically one with a worse water footprint than the
blocked facility would have had. New construction, sited with real
resource planning, can beat the legacy infrastructure it displaces demand
onto, on the water axis specifically.

NutPrint takes no position on where a specific new data center should be
sited; that decision raises other questions this project does not
address. NutPrint also does not claim AI water use is zero-impact. This
project has two aims. First, to make the comparison fun: an intuitive
number beats an abstract one. Second, to push the wider conversation on
AI water usage toward a full accounting, one that weighs every large
consumer equally, including the almond farming this project uses as its
own comparison point.

## License

MIT, see [`LICENSE`](./LICENSE).
