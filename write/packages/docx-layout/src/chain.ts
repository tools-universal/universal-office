// Caixas de texto VINCULADAS (wps:txbx id + wps:linkedTxbx id/seq): o conteúdo da 1ª
// caixa da cadeia flui pelas seguintes — cada caixa com a sua largura (o resto quebra de
// novo), viúvas/órfãs e o espaço depois como na quebra de linha de tabela; o que não cabe
// na última fica nela (transborda, recortado). Oráculo txbxlink.
import { forEachTextbox, type Block, type DrawingTextbox, type FullDocument, type Paragraph, type Run } from '@universal-office/docx-core';
import type { LaidOutLine } from './tree.js';

export interface TextboxChain {
  /** a 1ª caixa (com o conteúdo) e as vinculadas, na ordem do seq */
  members: DrawingTextbox[];
}

/** Parágrafos que continuam um parágrafo partido na caixa anterior (sem marcador, sem
 *  recuo da 1ª linha, sem espaço antes) — layoutStatic passa `continuation` ao preparar. */
export const CONTINUATION = new WeakSet<Paragraph>();

/** Cadeias do documento: o corpo e cada cabeçalho/rodapé à parte (os ids das histórias
 *  são da parte). Caixa → a cadeia dela. */
export function indexChains(full: FullDocument): Map<DrawingTextbox, TextboxChain> {
  const out = new Map<DrawingTextbox, TextboxChain>();
  const scan = (blocks: readonly Block[]): void => {
    const heads = new Map<number, DrawingTextbox>();
    const links: DrawingTextbox[] = [];
    forEachTextbox(blocks, (tb) => {
      if (tb.link) links.push(tb);
      else if (tb.story !== undefined && !heads.has(tb.story)) heads.set(tb.story, tb);
    });
    if (!links.length) return;
    for (const [id, head] of heads) {
      const ms = links.filter((l) => l.link!.id === id).sort((a, b) => a.link!.seq - b.link!.seq);
      if (!ms.length) continue;
      const chain: TextboxChain = { members: [head, ...ms] };
      for (const m of chain.members) out.set(m, chain);
    }
  };
  scan(full.blocks);
  const seen = new Set<readonly Block[]>();
  for (const s of full.sections) {
    for (const set of [s.headerBlocks, s.footerBlocks]) {
      for (const bs of Object.values(set ?? {})) {
        if (bs && !seen.has(bs)) { seen.add(bs); scan(bs); }
      }
    }
  }
  return out;
}

/** O parágrafo a partir de `offset` (no texto concatenado dos runs): a continuação na
 *  caixa seguinte. Run cortado no meio vira dois; campo/objeto não se corta (fica inteiro). */
export function sliceParagraphFrom(p: Paragraph, offset: number): Paragraph {
  const runs: Run[] = [];
  let pos = 0;
  for (const r of p.runs) {
    const len = r.text.length;
    if (pos + len <= offset) { pos += len; continue; }
    if (pos >= offset || r.field || r.fieldResult || r.image || r.textbox || r.shape || r.group || r.custom || r.math) runs.push(r);
    else runs.push({ ...r, text: r.text.slice(offset - pos) });
    pos += len;
  }
  const out: Paragraph = { ...p, runs };
  CONTINUATION.add(out);
  return out;
}

/** Bloco de cima do ref de uma linha do conteúdo ("txbx/b3", "txbx/b3/r0/c1/b0" → 3). */
export function topBlockOf(ref: string): number {
  const m = /^[^/]+\/b(\d+)/.exec(ref);
  return m ? +m[1]! : -1;
}

/** Linha de tabela do ref de uma linha do conteúdo ("txbx/b3/r2/c0/b0" → 2), ou -1. */
export function topRowOf(ref: string): number {
  const m = /^[^/]+\/b\d+\/r(\d+)\//.exec(ref);
  return m ? +m[1]! : -1;
}

/** Refs e offsets das linhas do resto para os blocos ORIGINAIS: o bloco j do resto é o
 *  map[j] do conteúdo da 1ª caixa; o 1º, se continua um parágrafo, soma `cont` aos offsets;
 *  se é o resto de uma tabela partida entre as caixas, soma `rows` às linhas dela. */
export function remapLines(lines: readonly LaidOutLine[], map: readonly number[], cont: number, rows = 0): LaidOutLine[] {
  return lines.map((l) => {
    const m = /^([^/]+)\/b(\d+)(.*)$/.exec(l.ref);
    if (!m) return l;
    const j = +m[2]!;
    const tail = j === 0 && rows ? m[3]!.replace(/^\/r(\d+)/, (_s, r: string) => `/r${+r + rows}`) : m[3];
    const ref = `${m[1]}/b${map[j] ?? j}${tail}`;
    // offsets só na continuação (o próprio parágrafo, não células de tabela)
    if (j !== 0 || !cont || m[3]) return ref === l.ref ? l : { ...l, ref };
    return { ...l, ref, start: l.start + cont, end: l.end + cont, ...(l.chars ? { chars: l.chars.map((c) => ({ ...c, o: c.o + cont })) } : {}) };
  });
}
