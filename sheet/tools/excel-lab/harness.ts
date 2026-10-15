// Entry do harness de comparação com o Excel (bundled pelo corpus-render via
// esbuild). Expõe window.harness com loadBook/paintRegion para o Playwright:
// cada aba é pintada a 100% na região A1..(nCols, nRows) em canvas de tamanho
// EXATO — o mesmo recorte que o oráculo exporta como imagem vinculada (câmera).
import { FontResolver } from '@universal-office/fonts';
import '../../packages/sheet/src/universal-sheet';
import type { UniversalSheetElement } from '../../packages/sheet/src/universal-sheet';

// substitutas abertas (Carlito, Caladea, Liberation…), como no app
FontResolver.shared().configure({ baseUrl: '/packages/sheet/demo/fonts' });

const us = document.getElementById('us') as UniversalSheetElement;
const cv = document.getElementById('cv') as HTMLCanvasElement;

declare global {
  interface Window {
    harness: {
      loadBook(url: string): Promise<string[]>;
      paintRegion(name: string, nCols: number, nRows: number): { w: number; h: number } | null;
      cellTexts(name: string): [string, string][];
      gridEdges(name: string, nCols: number, nRows: number): { xs: number[]; ys: number[] };
    };
  }
}

window.harness = {
  /** Carrega a pasta e resolve com os nomes das abas. */
  async loadBook(url: string): Promise<string[]> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
    us.loadXlsx(new Uint8Array(await res.arrayBuffer()));
    return us.getSheetNames();
  },
  /** Pinta a região da aba (pelo nome) no canvas visível; null se não existe. */
  paintRegion(name: string, nCols: number, nRows: number): { w: number; h: number } | null {
    const i = us.getSheetNames().indexOf(name);
    if (i < 0) return null;
    return us.renderRegionToCanvas(i, cv, nCols, nRows);
  },
  /** Texto exibido por célula da aba (para comparar com o Range.Text do Excel). */
  cellTexts(name: string): [string, string][] {
    const i = us.getSheetNames().indexOf(name);
    if (i < 0) return [];
    us.selectSheet(i);
    return us.debugCellDisplays().map((d) => [d.ref, d.display]);
  },
  /** Bordas das colunas/linhas (px a 100%) — geometria × Range.Width/Height do Excel. */
  gridEdges(name: string, nCols: number, nRows: number): { xs: number[]; ys: number[] } {
    const i = us.getSheetNames().indexOf(name);
    return i < 0 ? { xs: [], ys: [] } : us.debugGridEdges(i, nCols, nRows);
  },
};
