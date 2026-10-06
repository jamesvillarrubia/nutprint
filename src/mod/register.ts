// Claude Code hooks module (a "mod"): pins NutPrint's almond count under the prompt with
// $.ui.status, so no statusLine.command edit is needed. The classic Stop hook in
// plugin.json still does the accounting; this module only reads its rollup.
// Runs with no Node: everything outside reaches it through `$`, and it imports only
// Node-free files. tsup bundles it to dist/mod/register.js, which hooks/hooks.json names.
import { formatStatusLineShort } from '../services/format.js';
import { parseRollup, rollupTotals } from '../services/rollup-totals.js';

// The slice of Claude Code's `$` this module calls; the full type is the engine's
// `EngineInterface` from 'claude-code', which `claude plugin validate` checks against.
export interface ModEngine {
  env: { get(name: 'HOME'): Promise<string | undefined> };
  fs: { read(path: string): Promise<string> };
  settings: { read(): Promise<{ statusLine?: { command?: string } }> };
  ui: { status(text: string | undefined): void };
}

type Next = (e: unknown) => Promise<unknown>;
type Hook = ($: ModEngine, e: unknown, next: Next) => Promise<unknown>;
type On = (event: string, hook: Hook) => unknown;

// /nutprint:setup-statusline points statusLine.command at a file under this directory.
const ALMONDS_DIR = '/.claude/almonds/';

async function showStatus($: ModEngine): Promise<void> {
  const settings = await $.settings.read();
  if (settings.statusLine?.command?.includes(ALMONDS_DIR)) {
    return;
  }
  const home = await $.env.get('HOME');
  if (home === undefined) {
    return;
  }
  // Missing before the first Stop event has written it: show zero, as the ledger reader does.
  const text = await $.fs.read(`${home}/.claude/almonds/rollup.jsonl`).catch(() => '');
  const { dayLiters, weekLiters } = rollupTotals(parseRollup(text), new Date());
  $.ui.status(formatStatusLineShort(dayLiters, weekLiters));
}

// A function declaration: `claude plugin validate` refuses the `var register = ...` that
// tsup emits for `export const register`.
export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    await showStatus($);
    return next(e);
  });
  // `next` runs the settings and plugin Stop hooks beneath, on-stop.js among them,
  // so the rollup read afterwards includes this turn.
  on('classic.Stop', async ($, e, next) => {
    const result = await next(e);
    await showStatus($);
    return result;
  });
}
