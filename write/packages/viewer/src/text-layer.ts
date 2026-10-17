import type { Paragraph } from '@universal-office/docx-core';
import type { LaidOutLine } from '@universal-office/docx-layout';

/**
 * Camada de texto SELECIONÁVEL sobre o canvas (como a do PDF.js): o texto de
 * cada linha diagramada, invisível, nas posições do motor — o navegador
 * seleciona, copia e busca (Ctrl+F) nela; o desenho continua sendo o do canvas.
 * Uma palavra por <span> (com o espaço que a segue), esticada à largura que o
 * motor deu a ela; <br> no fim de cada linha (o texto copiado quebra igual).
 */

let measureCtx: CanvasRenderingContext2D | null = null;
const measure = (text: string, font: string): number => {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return 0;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
};

/**
 * Preenche `target` com o texto das `lines` (twips) na escala `pxPerTw`,
 * deslocado `topTw` para cima (a faixa começa em `topTw`).
 * `para(ref)` resolve o parágrafo da linha (null: sem texto selecionável).
 */
export function fillTextLayer(
  target: HTMLElement, lines: readonly LaidOutLine[], para: (ref: string) => Paragraph | null,
  pxPerTw: number, topTw: number,
): void {
  const texts = new Map<Paragraph, string>();
  const frag = document.createDocumentFragment();
  for (const line of lines) {
    const p = para(line.ref);
    const chars = line.chars;
    if (!p || !chars?.length) continue;
    let text = texts.get(p);
    if (text === undefined) { text = p.runs.map((r) => r.text).join(''); texts.set(p, text); }
    const h = line.height * pxPerTw;
    if (!(h > 0.5)) continue;
    const font = `${h}px sans-serif`;
    const top = (line.y - topTw) * pxPerTw;
    let word = '', x0 = 0, x1 = 0, open = false;
    const flush = (): void => {
      if (!open || !word) { open = false; word = ''; return; }
      const span = document.createElement('span');
      span.textContent = word;
      const w = (x1 - x0) * pxPerTw;
      span.style.left = `${x0 * pxPerTw}px`;
      span.style.top = `${top}px`;
      span.style.fontSize = `${h}px`;
      const natural = measure(word, font);
      if (natural > 0 && w > 0) span.style.transform = `scaleX(${w / natural})`;
      frag.appendChild(span);
      open = false;
      word = '';
    };
    for (const c of chars) {
      const ch = text[c.o];
      if (ch === undefined) continue; // número de lista, marcadores: não estão no texto do parágrafo
      if (!open) { open = true; x0 = c.x; }
      word += ch === '\t' ? ' ' : ch;
      x1 = c.x + c.w;
      if (ch === ' ' || ch === '\t' || ch === ' ') flush();
    }
    flush();
    frag.appendChild(document.createElement('br'));
  }
  target.textContent = '';
  target.appendChild(frag);
}

export const TEXT_LAYER_CSS = `
.udv-text { position: absolute; left: 0; top: 0; right: 0; bottom: 0; line-height: 1; overflow: hidden; font-size: 1px; color: transparent; }
.udv-text span {
  position: absolute; white-space: pre; color: transparent; transform-origin: 0 0;
  cursor: text; font-family: sans-serif;
}
.udv-text ::selection { background: var(--udv-selection, rgba(0, 95, 255, .28)); color: transparent; }
.udv-noselect .udv-text { display: none; }
.udv-noselect .udv-page { user-select: none; -webkit-user-select: none; }
`;
