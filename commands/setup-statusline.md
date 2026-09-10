---
description: Point your status bar at NutPrint
allowed-tools: Bash(node:*), AskUserQuestion
---

Result: !`node ${CLAUDE_PLUGIN_ROOT}/dist/cli/setup-statusline.js`

The command above printed one JSON object with a `status` field. Do not run
any other setup or edit `~/.claude/settings.json` yourself; only the script
above and, if needed, the `--chain` re-run below should touch that file.

- `{"status":"configured"}`: tell the user their status bar is set up.
  `statusLine.command` in `~/.claude/settings.json` now runs NutPrint. They
  can start a new Claude Code session to see it.
- `{"status":"already-configured"}`: tell the user this is already done,
  nothing changed.
- `{"status":"conflict","existingCommand":"..."}`: another command already
  owns `statusLine.command` (shown verbatim in `existingCommand`). Show the
  user that exact command, then use AskUserQuestion to offer exactly two
  options: (1) chain NutPrint onto it (their existing status line keeps
  running, NutPrint's output is appended after a " · " separator, via a
  generated wrapper script at `~/.claude/almonds/statusline-wrapper.sh`), or
  (2) leave it alone and show them the one line to add manually. Never chain
  without the user picking that option first. If they pick chain, run
  `node ${CLAUDE_PLUGIN_ROOT}/dist/cli/setup-statusline.js --chain` and report
  its result the same way. The original `settings.json` is backed up to
  `settings.json.bak` before any chained write.
