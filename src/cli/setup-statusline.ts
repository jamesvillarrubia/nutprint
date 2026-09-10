import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface StatusLineSettings {
  type?: string;
  command?: string;
  [key: string]: unknown;
}

export interface SettingsLike {
  statusLine?: StatusLineSettings;
  [key: string]: unknown;
}

export type SetupResult =
  | { status: 'configured' }
  | { status: 'already-configured' }
  | { status: 'conflict'; existingCommand: string };

export function defaultNutprintCommand(): string {
  return `node ${join(homedir(), '.claude', 'almonds', 'statusline.js')}`;
}

export function defaultWrapperPath(): string {
  return join(homedir(), '.claude', 'almonds', 'statusline-wrapper.sh');
}

export function planSetup(settings: SettingsLike, nutprintCommand: string): SetupResult {
  const current = settings.statusLine?.command;
  if (!current) return { status: 'configured' };
  if (current.includes(nutprintCommand)) return { status: 'already-configured' };
  return { status: 'conflict', existingCommand: current };
}

export function applyDirectSetup(settings: SettingsLike, nutprintCommand: string): SettingsLike {
  return { ...settings, statusLine: { type: 'command', command: nutprintCommand } };
}

export function buildChainWrapper(existingCommand: string, nutprintCommand: string): string {
  return `#!/usr/bin/env bash\n${existingCommand}\nprintf ' · '\n${nutprintCommand}\n`;
}

function readSettings(settingsPath: string): SettingsLike {
  if (!existsSync(settingsPath)) return {};
  return JSON.parse(readFileSync(settingsPath, 'utf8')) as SettingsLike;
}

function writeSettings(settingsPath: string, settings: SettingsLike): void {
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

export function runSetup(settingsPath: string, nutprintCommand: string, chain: boolean, wrapperPath: string = defaultWrapperPath()): SetupResult {
  const settings = readSettings(settingsPath);
  const plan = planSetup(settings, nutprintCommand);

  if (plan.status === 'already-configured') return plan;

  if (plan.status === 'conflict' && !chain) return plan;

  if (existsSync(settingsPath)) {
    copyFileSync(settingsPath, `${settingsPath}.bak`);
  }

  if (plan.status === 'conflict' && chain) {
    mkdirSync(dirname(wrapperPath), { recursive: true });
    writeFileSync(wrapperPath, buildChainWrapper(plan.existingCommand, nutprintCommand), 'utf8');
    chmodSync(wrapperPath, 0o755);
    writeSettings(settingsPath, applyDirectSetup(settings, `bash ${wrapperPath}`));
    return { status: 'configured' };
  }

  writeSettings(settingsPath, applyDirectSetup(settings, nutprintCommand));
  return { status: 'configured' };
}

function main(): void {
  const chain = process.argv.includes('--chain');
  const settingsPath = join(homedir(), '.claude', 'settings.json');
  const result = runSetup(settingsPath, defaultNutprintCommand(), chain);
  process.stdout.write(JSON.stringify(result));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
