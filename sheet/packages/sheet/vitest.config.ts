import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// o motor de cálculo vem do src do pacote irmão (como o build:demo), sem depender
// do link do workspace nem do dist; @universal-office/ui também pelo src (as barras
// usam o framework de shared/ui/src/toolbar, que o dist/ pode não ter ainda); o
// leitor de desenhos do Slides (slides-core) idem, como no build:demo
export default defineConfig({
  resolve: {
    alias: {
      '@universal-office/sheet-calc': fileURLToPath(new URL('../calc/src/index.ts', import.meta.url)),
      '@universal-office/ui': fileURLToPath(new URL('../../../shared/ui/src/index.ts', import.meta.url)),
      '@universal-office/slides-core': fileURLToPath(new URL('../../../slides/packages/slides-core/src/index.ts', import.meta.url)),
    },
  },
});
