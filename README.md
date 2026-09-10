# NutPrint

Shows AI water usage in your Claude Code status bar, converted to
almonds: `🥜 Day: 3.5 tsp = 1 almonds · Week: 2.4 gal = 150 almonds`.

"Day" and "Week" cover every Claude Code session on this machine, across
every project and every account, not just the one the status bar happens
to be running in.

Every constant behind the number is cited or flagged as an assumption in
[`SOURCES.md`](./SOURCES.md). This is a playful estimate, not a
measurement Anthropic or AWS publishes; it exists to make a point about
where AI's water use is worst and best, not to be exact.

## Install

```bash
git clone <repo-url>
cd nutprint
pnpm install
pnpm build
```

Fill in `<repo-url>` with your own remote once this repo is pushed somewhere.

Then add the plugin to Claude Code (`claude plugin add ./nutprint`
or your usual local-plugin flow) so its `Stop` hook starts recording
usage.

## Point your status bar at it

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/nutprint/dist/cli/statusline.js"
  }
}
```

Already have a `statusLine.command`? Chain them in a small wrapper
script instead of replacing it:

```bash
#!/usr/bin/env bash
your-existing-statusline-command
printf ' · '
node /absolute/path/to/nutprint/dist/cli/statusline.js
```

Point `statusLine.command` at that wrapper script instead.

Add `--short` for a compact form instead of the default: `D 11.3🥜 | W 11.3🥜`.

## Why the numbers are what they are

Short version: a data center's water draw is blue water (physically
withdrawn), so this project compares it to the blue-water share of a
California almond's footprint (6.2 L), not the popular blended
green+blue+grey figure (~12 L) that most "gallons per almond" claims
quote. Full reasoning and every citation: [`SOURCES.md`](./SOURCES.md).

## License

MIT, see [`LICENSE`](./LICENSE).
