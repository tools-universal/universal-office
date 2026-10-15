/**
 * Subfluxo de gráfico do BIFF8 (BOF dt=0x20 … EOF) → `c:chartSpace`
 * consumido pelo motor único de gráficos (shared/charts).
 */
import type { BiffRecord } from './biff.js';
import type { XlsGlobals } from './globals.js';

/** XML do chartSpace ou undefined (gráfico não suportado). */
export function chartSpaceXml(_g: XlsGlobals, _records: BiffRecord[]): string | undefined {
  return undefined;
}
