import type { Paragraph } from '@universal-office/docx-core';
import type { LaidOutLine } from '@universal-office/docx-layout';

/**
 * Camada de texto sobre o canvas — a MESMA serve à seleção (como a do PDF.js)
 * e aos leitores de tela:
 *  - um bloco por parágrafo (<p>; título = <h1>…<h6>, ou role=heading com
 *    aria-level do 7 ao 9), na ordem das linhas: o leitor navega por títulos
 *    e parágrafos;
 *  - modo DETALHADO (páginas em tela): uma palavra por <span> (com o espaço que a
 *    segue) esticada à largura que o motor deu a ela — selecionar, copiar,
 *    Ctrl+F; <br> no fim de cada linha (o texto copiado quebra igual);
 *  - modo SIMPLES (as demais páginas): o texto do bloco inteiro na posição da
 *    1ª linha — o leitor de tela lê o documento todo, sem o custo de medir cada
 *    palavra; vira detalhado quando a página entra em tela.
 * O texto é transparente: o desenho continua sendo o do canvas.
 */

let measureCtx: CanvasRenderingContext2D | null = null;
const measure = (text: string, font: string): number => {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return 0;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
};

/** Bloco do parágrafo: <p> ou o título no nível certo. */
function blockFor(level: number | undefined): HTMLElement {
  if (level === undefined) return document.createElement('p');
  if (level <= 6) return document.createElement(`h${level}`);
  const d = document.createElement('div');
  d.setAttribute('role', 'heading');
  d.setAttribute('aria-level', String(level));
  return d;
}

/**
 * Preenche `target` com o texto das `lines` (twips) na escala `pxPerTw`,
 * deslocado `topTw` para cima (a faixa começa em `topTw`).
 * `para(ref)` resolve o parágrafo da linha (null: sem texto); `levelOf` dá o
 * nível de título; `detailed` = palavra por palavra (seleção).
 */
export function fillTextLayer(
  target: HTMLElement, lines: readonly LaidOutLine[], para: (ref: string) => Paragraph | null,
  levelOf: (p: Paragraph) => number | undefined, pxPerTw: number, topTw: number, detailed: boolean,
): void {
  const texts = new Map<Paragraph, string>();
  const frag = document.createDocumentFragment();
  let block: HTMLElement | null = null, blockPara: Paragraph | null = null;
  for (const line of lines) {
    const p = para(line.ref);
    const chars = line.chars;
    if (!p || !chars?.length) continue;
    let text = texts.get(p);
    if (text === undefined) { text = p.runs.map((r) => r.text).join(''); texts.set(p, text); }
    const h = line.height * pxPerTw;
    if (!(h > 0.5)) continue;
    const top = (line.y - topTw) * pxPerTw;
    if (p !== blockPara || !block) {
      block = blockFor(levelOf(p));
      blockPara = p;
      frag.appendChild(block);
      if (!detailed) {
        // simples: o bloco inteiro onde começa (o leitor rola até ele)
        block.className = 'udv-simple';
        block.style.left = `${line.x * pxPerTw}px`;
        block.style.top = `${top}px`;
        block.style.width = `${Math.max(1, line.width * pxPerTw)}px`;
        block.style.height = `${h}px`;
      }
    }
    if (!detailed) {
      const seg = text.slice(line.start, line.end);
      block.textContent = (block.textContent ?? '') + (block.textContent ? ' ' : '') + seg.replace(/\s+/g, ' ').trim();
      continue;
    }
    const font = `${h}px sans-serif`;
    let word = '', x0 = 0, x1 = 0, open = false;
    const b = block;
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
      b.appendChild(span);
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
    b.appendChild(document.createElement('br'));
  }
  target.textContent = '';
  target.appendChild(frag);
}

export const TEXT_LAYER_CSS = `
.udv-text { position: absolute; left: 0; top: 0; right: 0; bottom: 0; line-height: 1; overflow: hidden; font-size: 1px; color: transparent; }
.udv-text > * { position: absolute; left: 0; top: 0; margin: 0; padding: 0; font: inherit; color: transparent; }
.udv-text > .udv-simple { overflow: hidden; white-space: nowrap; user-select: none; -webkit-user-select: none; }
.udv-text span {
  position: absolute; white-space: pre; color: transparent; transform-origin: 0 0;
  cursor: text; font-family: sans-serif; font-weight: normal;
}
.udv-text ::selection { background: var(--udv-selection, rgba(0, 95, 255, .28)); color: transparent; }
.udv-noselect .udv-text, .udv-noselect .udv-text * { user-select: none; -webkit-user-select: none; cursor: default; }
`;
