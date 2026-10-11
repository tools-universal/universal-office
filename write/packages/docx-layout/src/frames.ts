import type { Block, Paragraph, Run, DrawingTextbox, FramePr } from '@universal-office/docx-core';
import { DEFAULT_RUN_PROPS } from '@universal-office/docx-core';

/**
 * Molduras de texto (w:framePr sem capitular). O Word tira do fluxo os
 * parágrafos seguidos com a mesma moldura e os põe numa caixa flutuante,
 * ancorada no parágrafo seguinte (o texto em volta a contorna) — medido no
 * oráculo frames:
 *  - sem w:w a largura é a da linha mais longa (quebrando na largura da coluna);
 *    a altura é a do conteúdo — w:h vale como mínima, ou exata com hRule="exact";
 *  - âncoras padrão: horizontal relativa à coluna, vertical à MARGEM; vAnchor
 *    "text" é relativa ao topo do parágrafo âncora;
 *  - wrap around/auto (padrão) contorna dos dois lados, notBeside só acima e
 *    abaixo, none não afasta o texto; hSpace/vSpace são as distâncias.
 * Sem parágrafo depois (fim do contêiner, tabela, outra seção), a moldura fica
 * no lugar em que estaria no fluxo, sem ocupar altura.
 */

/** dados da moldura que a caixa de texto sintética não carrega */
export interface FrameInfo { autoWidth: boolean; hRule: 'auto' | 'exact' | 'atLeast'; h: number }
export const FRAME_INFO = new WeakMap<DrawingTextbox, FrameInfo>();
/** parágrafos de moldura retirados do fluxo (não ocupam nada) */
export const FRAME_SKIP = new WeakSet<Paragraph>();
/** moldura sem parágrafo âncora: carregada pelo seu 1º parágrafo, no lugar dele */
export const FRAME_CARRY = new WeakMap<Paragraph, Run>();
/** parágrafos DENTRO da caixa (não são levantados de novo) */
const INNER = new WeakSet<Paragraph>();
/** caixa sintética de cada moldura (pelo 1º parágrafo) e cópia do parágrafo âncora */
const runCache = new WeakMap<Paragraph, Run>();
const anchorCache = new WeakMap<Paragraph, { runs: Run[]; para: Paragraph }>();

export function frameOf(p: Paragraph): FramePr | undefined {
  const f = p.ppr?.framePr;
  if (!f || (f.dropCap && f.dropCap !== 'none') || INNER.has(p)) return undefined;
  return f;
}

const sameFrame = (a: FramePr, b: FramePr): boolean => {
  const ks = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof FramePr>;
  for (const k of ks) if (a[k] !== b[k]) return false;
  return true;
};

function frameRun(paras: Paragraph[], f: FramePr): Run {
  const hit = runCache.get(paras[0]!);
  if (hit) return hit;
  const inner = paras.map((p) => {
    const ppr = { ...p.ppr };
    delete ppr.framePr;
    const q: Paragraph = { ...p, ppr };
    INNER.add(q);
    return q;
  });
  const hRule = f.hRule ?? (f.h ? 'atLeast' : 'auto');
  const wrap = f.wrap === 'none' ? 'none' : f.wrap === 'notBeside' ? 'topAndBottom' : 'square';
  const hFrom = f.hAnchor === 'page' ? 'page' : f.hAnchor === 'margin' ? 'margin' : 'column';
  const vFrom = f.vAnchor === 'page' ? 'page' : f.vAnchor === 'text' ? 'paragraph' : 'margin';
  const hs = f.hSpace ?? 0, vs = f.vSpace ?? 0;
  const tb: DrawingTextbox = {
    paras: inner,
    blocks: inner.map((paragraph) => ({ type: 'paragraph' as const, paragraph })),
    widthTwips: f.w ?? 0,
    heightTwips: f.h ?? 0,
    floating: true,
    insets: { l: 0, t: 0, r: 0, b: 0 },
    anchor: {
      // (o vão à esquerda da moldura mede 1 twip a menos — ws-a-fr-l18, ws-fr-l30)
      wrap, wrapText: 'bothSides', distL: hs + 1, distR: hs, distT: vs, distB: vs,
      posH: { relativeFrom: hFrom, ...(f.xAlign ? { align: f.xAlign } : { offset: f.x ?? 0 }) },
      posV: { relativeFrom: vFrom, ...(f.yAlign && f.yAlign !== 'inline' ? { align: f.yAlign } : { offset: f.y ?? 0 }) },
      layoutInCell: true, allowOverlap: true,
    },
  };
  FRAME_INFO.set(tb, { autoWidth: !f.w, hRule: hRule === 'exact' && f.h ? 'exact' : hRule === 'auto' || !f.h ? 'auto' : 'atLeast', h: f.h ?? 0 });
  const run: Run = { text: '￼', props: { ...DEFAULT_RUN_PROPS }, textbox: tb };
  runCache.set(paras[0]!, run);
  return run;
}

/**
 * Levanta as molduras de uma sequência de blocos. Devolve a MESMA sequência
 * (mesmo comprimento: as referências b<i> continuam valendo) com os parágrafos
 * âncora trocados por cópias que carregam a caixa no fim (o deslocamento dos
 * caracteres não muda). `stops`: índices depois dos quais a âncora não é buscada
 * (fim de seção).
 */
export function liftFrames(blocks: Block[], stops?: Set<number>): Block[] {
  let out: Block[] | null = null;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.type !== 'paragraph') continue;
    const f = frameOf(b.paragraph);
    if (!f) continue;
    const group = [b.paragraph];
    let j = i + 1;
    for (; j < blocks.length && !stops?.has(j - 1); j++) {
      const n = blocks[j]!;
      const nf = n.type === 'paragraph' ? frameOf(n.paragraph) : undefined;
      if (!nf || !sameFrame(f, nf)) break;
      group.push((n as Extract<Block, { type: 'paragraph' }>).paragraph);
    }
    for (const p of group) FRAME_SKIP.add(p);
    const run = frameRun(group, f);
    // âncora: o próximo parágrafo que não é moldura, na mesma seção
    let k = j;
    while (k < blocks.length && !stops?.has(k - 1)) {
      const n = blocks[k]!;
      if (n.type !== 'paragraph' || !frameOf(n.paragraph)) break;
      k++;
    }
    const anchorB = k < blocks.length && !stops?.has(k - 1) ? blocks[k] : undefined;
    if (anchorB?.type === 'paragraph') {
      out ??= blocks.slice();
      const cur = out[k] as Extract<Block, { type: 'paragraph' }>;
      const src = cur.paragraph;
      let c = anchorCache.get(src);
      if (!c || !c.runs.includes(run)) {
        const prevRuns = c?.runs ?? [];
        const runs = [...prevRuns, run];
        const base = c ? c.para : src;
        const para: Paragraph = { ...base, runs: [...base.runs, run] };
        c = { runs, para };
        anchorCache.set(src, c);
      }
      out[k] = { ...cur, paragraph: c.para };
    } else FRAME_CARRY.set(group[0]!, run);
    i = j - 1;
  }
  return out ?? blocks;
}
