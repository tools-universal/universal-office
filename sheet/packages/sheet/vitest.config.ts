import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// o motor de cálculo vem do src do pacote irmão (como o build:demo), sem depender
// do link do workspace nem do dist
export default defineConfig({
  resolve: {
    alias: { '@universal-office/sheet-calc': fileURLToPath(new URL('../calc/src/index.ts', import.meta.url)) },
  },
});
