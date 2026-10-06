# MISTAKES

## 2026-10-06: the mod shipped under version 0.1.0 and never reached the installed copy

**What happened:** PR #2 merged the mod into main without changing `version`. `claude plugin update nutprint@nutprint` refreshed the marketplace clone to `d82b4dc`, then answered `nutprint is already at the latest version (0.1.0)` and kept the `ee6b965` copy, which has no `hooks/`.
**Root cause:** `claude plugin update` compares only the `version` string; this repo has no release tooling that bumps it.
**Consequence:** James's install kept running the old plugin after the merge, while the README said `claude plugin update` picks up new releases.
**Prevention:** `scripts/check-version-bump.sh` runs on every PR and fails when `dist/`, `hooks/`, `commands/` or `.claude-plugin/plugin.json` change without a version bump.
