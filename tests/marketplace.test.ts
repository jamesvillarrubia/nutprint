import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const marketplace = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../.claude-plugin/marketplace.json', import.meta.url)),
    'utf-8',
  ),
);
const pluginManifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../plugin.json', import.meta.url)), 'utf-8'),
);

describe('.claude-plugin/marketplace.json', () => {
  it('lists nutprint as a plugin sourced from the repo root', () => {
    const entry = marketplace.plugins.find((p: { name: string }) => p.name === 'nutprint');
    expect(entry).toBeDefined();
    expect(entry.source).toBe('./');
  });

  it('keeps its listed version in sync with plugin.json', () => {
    const entry = marketplace.plugins.find((p: { name: string }) => p.name === 'nutprint');
    expect(entry.version).toBe(pluginManifest.version);
  });
});
