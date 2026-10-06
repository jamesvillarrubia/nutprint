import { describe, expect, it } from 'vitest';
import { register, type ModEngine } from '../src/mod/register.js';
import { formatStatusLineShort } from '../src/services/format.js';

process.env.TZ = 'UTC';

type Hook = ($: ModEngine, e: unknown, next: (e: unknown) => Promise<unknown>) => Promise<unknown>;

function loadHooks(): Map<string, Hook> {
  const hooks = new Map<string, Hook>();
  register((event: string, hook: Hook) => {
    hooks.set(event, hook);
  });
  return hooks;
}

function fakeEngine(opts: { rollup?: string; statusLineCommand?: string; home?: string | null; log: string[] }): ModEngine & {
  statuses: Array<string | undefined>;
} {
  const statuses: Array<string | undefined> = [];
  return {
    statuses,
    env: { get: async () => (opts.home === null ? undefined : (opts.home ?? '/home/u')) },
    fs: {
      read: async (path: string) => {
        opts.log.push(`read ${path}`);
        if (opts.rollup === undefined) throw new Error('ENOENT');
        return opts.rollup;
      },
    },
    settings: {
      read: async () =>
        opts.statusLineCommand === undefined ? {} : { statusLine: { command: opts.statusLineCommand } },
    },
    ui: { status: (text: string | undefined) => void statuses.push(text) },
  };
}

const today = new Date().toISOString().slice(0, 10);
const ROLLUP = `{"date":"${today}","liters":0.62}\n`;

describe('nutprint mod', () => {
  it('reads the rollup only after the classic Stop hooks beneath it have run, then sets the status', async () => {
    const log: string[] = [];
    const $ = fakeEngine({ rollup: ROLLUP, log });
    const stop = loadHooks().get('classic.Stop');
    expect(stop).toBeDefined();

    const result = await stop!($, { hook_event_name: 'Stop' }, async (e) => {
      log.push('next');
      return e;
    });

    expect(result).toEqual({ hook_event_name: 'Stop' });
    expect(log).toEqual(['next', 'read /home/u/.claude/almonds/rollup.jsonl']);
    expect($.statuses).toEqual([formatStatusLineShort(0.62, 0.62)]);
  });

  it('shows the status at session start', async () => {
    const $ = fakeEngine({ rollup: ROLLUP, log: [] });
    await loadHooks().get('session.start')!($, {}, async (e) => e);
    expect($.statuses).toEqual([formatStatusLineShort(0.62, 0.62)]);
  });

  it('shows zero before the first Stop event has written a rollup', async () => {
    const $ = fakeEngine({ log: [] });
    await loadHooks().get('session.start')!($, {}, async (e) => e);
    expect($.statuses).toEqual([formatStatusLineShort(0, 0)]);
  });

  it('sets no status when statusLine.command already runs NutPrint from ~/.claude/almonds/', async () => {
    const log: string[] = [];
    const $ = fakeEngine({
      rollup: ROLLUP,
      statusLineCommand: 'bash /home/u/.claude/almonds/statusline-wrapper.sh',
      log,
    });
    await loadHooks().get('session.start')!($, {}, async (e) => e);
    expect($.statuses).toEqual([]);
    expect(log).toEqual([]);
  });

  it('sets no status when HOME is unset, so it never shows a false zero', async () => {
    const log: string[] = [];
    const $ = fakeEngine({ rollup: ROLLUP, home: null, log });
    await loadHooks().get('session.start')!($, {}, async (e) => e);
    expect($.statuses).toEqual([]);
    expect(log).toEqual([]);
  });
});
