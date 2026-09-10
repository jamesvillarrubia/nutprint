import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyDirectSetup,
  buildChainWrapper,
  planSetup,
  runSetup,
} from '../src/cli/setup-statusline.js';

const NUTPRINT_COMMAND = 'node ~/.claude/almonds/statusline.js';

describe('planSetup', () => {
  it('plans a direct write when settings.json has no statusLine at all', () => {
    expect(planSetup({}, NUTPRINT_COMMAND)).toEqual({ status: 'configured' });
  });

  it('reports already-configured when statusLine.command already is the nutprint command', () => {
    const settings = { statusLine: { type: 'command', command: NUTPRINT_COMMAND } };
    expect(planSetup(settings, NUTPRINT_COMMAND)).toEqual({ status: 'already-configured' });
  });

  it('reports a conflict, naming the existing command, when something else already owns statusLine', () => {
    const settings = { statusLine: { type: 'command', command: 'bash ~/other-provider.sh' } };
    expect(planSetup(settings, NUTPRINT_COMMAND)).toEqual({
      status: 'conflict',
      existingCommand: 'bash ~/other-provider.sh',
    });
  });
});

describe('applyDirectSetup', () => {
  it('sets statusLine to the nutprint command while preserving every other settings key', () => {
    const settings = { theme: 'dark', otherKey: { nested: true } };
    const result = applyDirectSetup(settings, NUTPRINT_COMMAND);
    expect(result).toEqual({
      theme: 'dark',
      otherKey: { nested: true },
      statusLine: { type: 'command', command: NUTPRINT_COMMAND },
    });
  });
});

describe('buildChainWrapper', () => {
  it('runs the existing command, then a separator, then the nutprint command', () => {
    const script = buildChainWrapper('bash ~/other-provider.sh', NUTPRINT_COMMAND);
    expect(script).toContain('#!/usr/bin/env bash');
    expect(script).toContain('bash ~/other-provider.sh');
    expect(script).toContain(NUTPRINT_COMMAND);
    expect(script.indexOf('bash ~/other-provider.sh')).toBeLessThan(script.indexOf(NUTPRINT_COMMAND));
  });
});

describe('runSetup', () => {
  let dir: string;
  let settingsPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'almonds-setup-'));
    settingsPath = join(dir, 'settings.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates settings.json with statusLine set when none exists yet', () => {
    const result = runSetup(settingsPath, NUTPRINT_COMMAND, false);

    expect(result.status).toBe('configured');
    const written = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(written.statusLine.command).toBe(NUTPRINT_COMMAND);
  });

  it('is idempotent: running it again reports already-configured and does not rewrite the file', () => {
    runSetup(settingsPath, NUTPRINT_COMMAND, false);
    const firstWrite = readFileSync(settingsPath, 'utf8');

    const result = runSetup(settingsPath, NUTPRINT_COMMAND, false);

    expect(result.status).toBe('already-configured');
    expect(readFileSync(settingsPath, 'utf8')).toBe(firstWrite);
  });

  it('does not touch an existing different statusLine.command without --chain, and leaves settings.json untouched', () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(settingsPath, JSON.stringify({ statusLine: { type: 'command', command: 'bash ~/mine.sh' } }, null, 2), 'utf8');

    const result = runSetup(settingsPath, NUTPRINT_COMMAND, false);

    expect(result).toEqual({ status: 'conflict', existingCommand: 'bash ~/mine.sh' });
    const stillThere = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(stillThere.statusLine.command).toBe('bash ~/mine.sh');
    expect(existsSync(`${settingsPath}.bak`)).toBe(false);
  });

  it('with chain=true, backs up the original, writes a wrapper script, and points statusLine at the wrapper', () => {
    writeFileSync(settingsPath, JSON.stringify({ statusLine: { type: 'command', command: 'bash ~/mine.sh' } }, null, 2), 'utf8');

    const result = runSetup(settingsPath, NUTPRINT_COMMAND, true);

    expect(result.status).toBe('configured');
    expect(existsSync(`${settingsPath}.bak`)).toBe(true);
    const backup = JSON.parse(readFileSync(`${settingsPath}.bak`, 'utf8'));
    expect(backup.statusLine.command).toBe('bash ~/mine.sh');

    const written = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(written.statusLine.command).toContain('statusline-wrapper.sh');
    const wrapperPath = written.statusLine.command.replace(/^bash /, '');
    const wrapperScript = readFileSync(wrapperPath, 'utf8');
    expect(wrapperScript).toContain('bash ~/mine.sh');
    expect(wrapperScript).toContain(NUTPRINT_COMMAND);
  });

  it('preserves unrelated settings keys when writing', () => {
    writeFileSync(settingsPath, JSON.stringify({ theme: 'dark' }, null, 2), 'utf8');

    runSetup(settingsPath, NUTPRINT_COMMAND, false);

    const written = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(written.theme).toBe('dark');
  });
});
