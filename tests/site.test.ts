import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(
  fileURLToPath(new URL('../site/index.html', import.meta.url)),
  'utf-8',
);

describe('site/index.html', () => {
  it('declares an absolute og:image for social previews', () => {
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/^https:\/\//);
  });

  it('carries the required Open Graph tags', () => {
    for (const prop of ['og:title', 'og:description', 'og:url', 'og:type']) {
      expect(html).toContain(`<meta property="${prop}"`);
    }
  });

  it('carries a summary_large_image Twitter card', () => {
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image"',
    );
    expect(html).toContain('<meta name="twitter:image"');
  });

  it('links to SOURCES.md for the math', () => {
    expect(html).toMatch(/href="[^"]*SOURCES\.md"/);
  });

  it('shows the marketplace install sequence', () => {
    expect(html).toContain('claude plugin marketplace add jamesvillarrubia/nutprint');
    expect(html).toContain('claude plugin install nutprint@nutprint');
  });
});
