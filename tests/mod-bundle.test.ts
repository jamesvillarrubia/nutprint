import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));

describe('the hooks module Claude Code loads', () => {
  it('is named by hooks/hooks.json', () => {
    const hooksJson = JSON.parse(readFileSync(root('hooks/hooks.json'), 'utf8'));
    expect(hooksJson).toEqual({ modules: ['../dist/mod/register.js'] });
  });

  // A hooks module runs with no Node: one `node:` import and the module does not load.
  it('imports no Node built-in', () => {
    const bundle = readFileSync(root('dist/mod/register.js'), 'utf8');
    expect(bundle).toMatch(/export\s*\{[^}]*\bregister\b/);
    expect(bundle).not.toMatch(/from\s*["']node:|require\(/);
  });
});
