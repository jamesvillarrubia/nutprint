import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'hooks/on-stop': 'src/hooks/on-stop.ts',
    'cli/statusline': 'src/cli/statusline.ts',
    'cli/setup-statusline': 'src/cli/setup-statusline.ts',
    'mod/register': 'src/mod/register.ts',
  },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  dts: false,
  sourcemap: false,
  splitting: false,
});
