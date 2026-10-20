import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// @universal-office/ui pelo src (como no tsconfig e nos bundles do demo): as
// barras usam o framework em shared/ui/src/toolbar, que o dist/ pode não ter.
export default defineConfig({
  resolve: {
    alias: {
      '@universal-office/ui': fileURLToPath(new URL('../../../shared/ui/src/index.ts', import.meta.url)),
    },
  },
});
