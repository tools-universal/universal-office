import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Pacotes internos pelo src (como o build:demo e o build-pkg): o editor usa os
// ganchos novos do viewer e o framework das barras de shared/ui, que o dist/
// pode ainda não ter.
const src = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@universal-office/slides-viewer': src('../viewer/src/index.ts'),
      '@universal-office/slides-core': src('../slides-core/src/index.ts'),
      '@universal-office/ui': src('../../../shared/ui/src/index.ts'),
      '@universal-office/fonts': src('../../../shared/fonts/src/index.ts'),
      '@universal-office/charts': src('../../../shared/charts/src/index.ts'),
      '@universal-office/drawingml': src('../../../shared/drawingml/src/index.ts'),
    },
  },
});
