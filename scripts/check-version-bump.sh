#!/usr/bin/env bash
# Fails when shipped plugin files differ from <base-ref> but .claude-plugin/plugin.json's
# version does not. `claude plugin update` compares only that version string, so a change
# shipped under an old version never reaches an existing install.
# Usage: scripts/check-version-bump.sh <base-ref>
set -euo pipefail
base=$1
shipped=(dist hooks commands .claude-plugin/plugin.json)

if git diff --quiet "$base" -- "${shipped[@]}"; then
  exit 0
fi
old=$(git show "$base:.claude-plugin/plugin.json" | jq -r .version)
new=$(jq -r .version .claude-plugin/plugin.json)
if [ "$old" = "$new" ]; then
  echo "::error::shipped files changed since $base but the plugin version is still $new; bump it in .claude-plugin/plugin.json, .claude-plugin/marketplace.json and package.json"
  exit 1
fi
echo "plugin version $old -> $new"
