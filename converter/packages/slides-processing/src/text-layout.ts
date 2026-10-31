import { EMU_PER_POINT } from './model.js';
import type { TextBody, Run } from './model.js';

/**
 * Layout de texto de um `<p:txBody>` como FUNÇÃO PURA (spec 03, item D).
 *
 * Recebe a caixa em EMU e um `measure` injetável (canvas no renderer, métrica
 * de fonte no export PDF — spec 05 reusa com outro measurer). Implementa:
 *   - word-wrap na largura útil (box − insets) quando `bodyPr wrap != none`
 *   - autofit `<a:normAutofit fontScale lnSpcReduction>`
 *   - âncora vertical t/ctr/b considerando a ALTURA TOTAL das linhas
 *   - alinhamento horizontal l/ctr/r (just ≈ l)
 *   - bullets (buChar/buAutoNum) com marL/indent por nível (hanging indent)
 *
 * Todas as posições de saída são em EMU relativas ao canto sup. esq. da caixa.
 */

/** Fonte usada na medição/pintura. */
export interface LayoutFont {
  family: string;
  sizePt: number;
  bold: boolean;
  italic: boolean;
}

/** Mede a largura de `text` em PONTOS na fonte dada (injetável). */
export type MeasureText = (text: string, font: LayoutFont) => number;

/** Run posicionado numa linha. */
export interface PlacedRun {
  text: string;
  /** X do início do run, EMU relativo à caixa. */
  x: number;
  /** Largura medida, EMU. */
  w: number;
  font: LayoutFont;
  color: string;
  underline: boolean;
  hyperlink?: string;
}

/** Linha final do layout. */
export interface PlacedLine {
  runs: PlacedRun[];
  /** Baseline em EMU relativo ao topo da caixa. */
  baseline: number;
  /** Altura da linha em EMU. */
  height: number;
  /** Marcador do parágrafo — presente apenas na PRIMEIRA linha dele. */
  bullet?: { text: string; x: number; font: LayoutFont; color: string };
}

export interface TextLayoutResult {
  lines: PlacedLine[];
  /** Altura total do bloco de texto em EMU (soma das linhas). */
  totalH: number;
}

export interface LayoutTextOptions {
  /** Insets default (EMU) quando o bodyPr não especifica. */
  insL?: number;
  insT?: number;
  insR?: number;
  insB?: number;
  /** Tamanho default em pt para runs sem sz resolvido. */
  defaultSzPt?: number;
  /** Fonte default para runs sem font resolvida. */
  defaultFont?: string;
  /** Cor default. */
  defaultColor?: string;
  /** Âncora default quando o bodyPr não especifica (t). */
  defaultAnchor?: string;
}

// Defaults de bodyPr do PowerPoint: 0.1in lateral, 0.05in vertical.
const DEF_INS_L = 91440, DEF_INS_T = 45720, DEF_INS_R = 91440, DEF_INS_B = 45720;
/** Fator de entrelinha "single" aproximado do PowerPoint. */
const LINE_FACTOR = 1.2;
/** Fração da altura da linha acima da baseline. */
const BASELINE_FACTOR = 0.8;

/** Formata o número de um buAutoNum conforme o esquema (subconjunto comum). */
export function formatAutoNum(scheme: string, n: number): string {
  const roman = (v: number): string => {
    const table: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
    let out = ''; let x = v;
    for (const [val, sym] of table) while (x >= val) { out += sym; x -= val; }
    return out;
  };
  const alpha = (v: number): string => String.fromCharCode(96 + ((v - 1) % 26) + 1);
  switch (scheme) {
    case 'alphaLcPeriod': return `${alpha(n)}.`;
    case 'alphaUcPeriod': return `${alpha(n).toUpperCase()}.`;
    case 'alphaLcParenR': return `${alpha(n)})`;
    case 'alphaUcParenR': return `${alpha(n).toUpperCase()})`;
    case 'romanLcPeriod': return `${roman(n)}.`;
    case 'romanUcPeriod': return `${roman(n).toUpperCase()}.`;
    case 'arabicParenR': return `${n})`;
    case 'arabicPlain': return `${n}`;
    case 'arabicPeriod':
    default: return `${n}.`;
  }
}

interface Word { text: string; run: Run }

/** Quebra os runs de um parágrafo em tokens (palavras + espaços), preservando o run de origem. */
function tokenize(runs: Run[]): Word[] {
  const out: Word[] = [];
  for (const r of runs) {
    if (r.text === '\n') { out.push({ text: '\n', run: r }); continue; }
    // separa mantendo espaços colados à palavra anterior (quebra APÓS espaço)
    const parts = r.text.match(/\S+\s*|\s+/g) ?? [];
    for (const p of parts) out.push({ text: p, run: r });
  }
  return out;
}

function fontOf(r: Run, fontScale: number, opts: Required<Pick<LayoutTextOptions, 'defaultSzPt' | 'defaultFont'>>): LayoutFont {
  return {
    family: r.font ?? opts.defaultFont,
    sizePt: (r.sz ?? opts.defaultSzPt) * fontScale,
    bold: !!r.bold,
    italic: !!r.italic,
  };
}

/**
 * Layout completo de um txBody na caixa `boxW × boxH` (EMU).
 * Pura e determinística — depende apenas dos argumentos.
 */
export function layoutTextBody(
  tb: TextBody, boxW: number, boxH: number, measure: MeasureText, opts: LayoutTextOptions = {},
): TextLayoutResult {
  const insL = tb.insL ?? opts.insL ?? DEF_INS_L;
  const insT = tb.insT ?? opts.insT ?? DEF_INS_T;
  const insR = tb.insR ?? opts.insR ?? DEF_INS_R;
  const insB = tb.insB ?? opts.insB ?? DEF_INS_B;
  const defaultSzPt = opts.defaultSzPt ?? 18;
  const defaultFont = opts.defaultFont ?? 'Calibri';
  const defaultColor = opts.defaultColor ?? '#000000';
  const fontScale = tb.fontScale ?? 1;
  const lineFactor = LINE_FACTOR * (1 - (tb.lnSpcReduction ?? 0));
  const usableW = Math.max(0, boxW - insL - insR);
  const wrap = tb.wrap !== 'none';
  const fOpts = { defaultSzPt, defaultFont };

  const measureEmu = (text: string, f: LayoutFont): number => measure(text, f) * EMU_PER_POINT;

  interface ProtoLine { runs: { text: string; run: Run }[]; marL: number; align: string; bullet?: PlacedLine['bullet'] }
  const proto: ProtoLine[] = [];
  const heights: number[] = [];
  // contador de numeração automática por nível (reinicia quando o nível "sobe")
  const autoNumCounters: number[] = Array.from({ length: 9 }, () => 0);

  for (const p of tb.paragraphs) {
    const level = Math.min(p.level ?? 0, 8);
    const marL = p.marL ?? 0;
    const indent = p.indent ?? 0;
    const align = p.align ?? 'l';
    const runs = p.runs.length ? p.runs : [{ text: '' } as Run];

    // bullet do parágrafo (só na primeira linha)
    let bullet: PlacedLine['bullet'] | undefined;
    if (p.bullet) {
      // reinicia contadores de níveis mais profundos
      for (let l = level + 1; l < 9; l++) autoNumCounters[l] = 0;
      let btext: string | undefined;
      if (p.bulletAutoNum !== undefined) {
        autoNumCounters[level] = (autoNumCounters[level] ?? 0) + 1;
        btext = formatAutoNum(p.bulletAutoNum, autoNumCounters[level]!);
      } else {
        btext = p.bulletChar ?? '•';
      }
      const bFont = fontOf(runs[0]!, fontScale, fOpts);
      bullet = {
        text: btext,
        // hanging indent: bullet fica em marL+indent (indent tipicamente negativo)
        x: insL + Math.max(0, marL + indent),
        font: bFont,
        color: runs[0]!.color ?? defaultColor,
      };
    }

    // indent de 1ª linha vale SÓ para a primeira linha do parágrafo;
    // continuações voltam para marL (hanging/first-line indent do PowerPoint)
    const contX = insL + marL;
    const firstX = p.bullet ? contX : insL + Math.max(0, marL + indent);
    const words = tokenize(runs);

    // agrupamento em linhas por largura
    let cur: ProtoLine = { runs: [], marL: firstX, align, bullet };
    let curW = 0;
    const emptyPt = (runs[0]!.sz ?? defaultSzPt) * fontScale;
    const flush = (): void => {
      proto.push(cur);
      // altura da linha = maior sz presente (linha vazia usa o sz do parágrafo)
      const maxPt = cur.runs.reduce((a, t) => Math.max(a, (t.run.sz ?? defaultSzPt) * fontScale), cur.runs.length ? 0 : emptyPt);
      heights.push(maxPt * EMU_PER_POINT * lineFactor);
      cur = { runs: [], marL: contX, align };
      curW = 0;
    };
    for (const wd of words) {
      if (wd.text === '\n') { flush(); continue; }
      const f = fontOf(wd.run, fontScale, fOpts);
      const wEmu = measureEmu(wd.text, f);
      const availW = Math.max(0, usableW - (cur.marL - insL));
      if (wrap && cur.runs.length > 0 && curW + measureEmu(wd.text.replace(/\s+$/, ''), f) > availW) flush();
      cur.runs.push({ text: wd.text, run: wd.run });
      curW += wEmu;
    }
    flush();
  }

  // âncora vertical
  const totalH = heights.reduce((a, b) => a + b, 0);
  const usableH = Math.max(0, boxH - insT - insB);
  const anchor = tb.anchor ?? opts.defaultAnchor ?? 't';
  let y = insT;
  if (anchor === 'ctr') y = insT + (usableH - totalH) / 2;
  else if (anchor === 'b') y = insT + usableH - totalH;

  // materializa linhas: junta tokens contíguos do MESMO run, mede e alinha
  const lines: PlacedLine[] = [];
  for (let i = 0; i < proto.length; i++) {
    const pl = proto[i]!;
    const h = heights[i]!;
    const merged: { text: string; run: Run }[] = [];
    for (const t of pl.runs) {
      const last = merged[merged.length - 1];
      if (last && last.run === t.run) last.text += t.text;
      else merged.push({ text: t.text, run: t.run });
    }
    // remove trailing whitespace da última fatia (não conta p/ alinhamento)
    if (merged.length) {
      const last = merged[merged.length - 1]!;
      last.text = last.text.replace(/\s+$/, '');
    }
    const placed: PlacedRun[] = [];
    let w = 0;
    for (const m of merged) {
      const f = fontOf(m.run, fontScale, fOpts);
      const mw = measureEmu(m.text, f);
      const pr: PlacedRun = {
        text: m.text, x: pl.marL + w, w: mw, font: f,
        color: m.run.color ?? defaultColor, underline: !!m.run.underline,
      };
      if (m.run.hyperlink !== undefined) pr.hyperlink = m.run.hyperlink;
      placed.push(pr);
      w += mw;
    }
    // alinhamento horizontal desloca os runs (bullet fica fixo no marL+indent)
    let dx = 0;
    if (pl.align === 'ctr') dx = (usableW - (pl.marL - insL) - w) / 2;
    else if (pl.align === 'r') dx = usableW - (pl.marL - insL) - w;
    if (dx > 0) for (const pr of placed) pr.x += dx;
    const line: PlacedLine = { runs: placed, baseline: y + h * BASELINE_FACTOR, height: h };
    if (pl.bullet) line.bullet = pl.bullet;
    lines.push(line);
    y += h;
  }
  return { lines, totalH };
}
