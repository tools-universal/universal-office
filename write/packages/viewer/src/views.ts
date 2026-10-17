import type { FullDocument } from '@universal-office/docx-core';
import type { LayoutPage } from '@universal-office/docx-layout';

/**
 * Modos de exibição do viewer (os do Word):
 *  - `print` — Layout de Impressão: as páginas do documento, roladas na vertical;
 *  - `read`  — Modo de Leitura: as MESMAS páginas lado a lado, ajustadas à tela,
 *              avançando de bloco em bloco (como o modo Leitura do editor);
 *  - `web`   — Layout da Web: o texto refeito na largura do viewer, sem folhas,
 *              cabeçalhos/rodapés nem quebras de seção.
 */
export type ViewMode = 'print' | 'read' | 'web';
export const VIEW_MODES: readonly ViewMode[] = ['read', 'print', 'web'];

/** Margem do texto no Layout da Web (twips): o Word usa um recuo pequeno da janela. */
const WEB_MARGIN = 288;
/** Altura da "folha" do Layout da Web (twips, ~11 m): uma folha só para quase todo
 *  documento; as que passarem disso continuam em outra, emendada sem espaço. */
const WEB_PAGE_H = 31680 * 20;

/**
 * Documento para o Layout da Web: o motor diagrama numa folha da largura do
 * viewer e altura enorme — sem cabeçalho/rodapé, sem colunas, seções contínuas.
 * Notas de rodapé ficam no pé dessa folha e não aparecem (como no Word, que não
 * as mostra neste modo).
 */
export function webDocument(full: FullDocument, widthTw: number): FullDocument {
  const w = Math.max(2880, Math.round(widthTw));
  return {
    ...full,
    sections: full.sections.map((s) => {
      const { cols: _cols, ...sp } = s.sectPr;
      return {
        ...s,
        sectPr: {
          ...sp, pageWidthTwips: w, pageHeightTwips: WEB_PAGE_H,
          marginLeftTwips: WEB_MARGIN, marginRightTwips: WEB_MARGIN,
          marginTopTwips: WEB_MARGIN, marginBottomTwips: WEB_MARGIN, titlePg: false,
        },
        ...(s.sect ? { sect: { type: 'continuous' } as typeof s.sect } : {}),
        headerBlocks: {}, footerBlocks: {}, headers: {}, footers: {},
      };
    }),
  };
}

/**
 * Altura exibida da folha no Layout da Web: até o fim do CORPO (linhas do
 * documento e objetos junto delas) + margem — o resto da folha enorme é vazio.
 */
export function webPageHeight(p: LayoutPage): number {
  let bottom = 0;
  for (const l of p.lines) if (/^b\d/.test(l.ref)) bottom = Math.max(bottom, l.y + l.height);
  // objetos que descem além da última linha (imagens/formas ancoradas)
  const limit = bottom + 14400;
  for (const it of p.items) {
    const b = it.t === 'rect' || it.t === 'image' || it.t === 'shape' ? it.y + it.h : it.t === 'line' ? Math.max(it.y1, it.y2) : it.t === 'glyphs' ? it.y : 0;
    if (b <= limit) bottom = Math.max(bottom, b);
  }
  return Math.min(p.heightTw, Math.max(1440, bottom + WEB_MARGIN));
}

/** Quantas páginas lado a lado no Modo de Leitura (~880 px por página, como o editor). */
export function readPagesPerView(widthPx: number): number {
  return Math.max(1, Math.round(widthPx / 880));
}
