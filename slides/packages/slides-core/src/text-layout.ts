import { EMU_PER_POINT } from './model.js';
import type { TextBody, Run } from './model.js';
import { isSymbolFont, symbolText } from './symbol-fonts.js';

/** Família usada para desenhar o texto CONVERTIDO de fontes de símbolo (Wingdings…). */
export const SYMBOL_FAMILY = 'Segoe UI Symbol';

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
  /** Sombra do texto (propagada do Run). */
  shadow?: Run['shadow'];
  /** Deslocamento vertical (EMU, + = acima) de sobrescrito/subscrito. */
  rise?: number;
  /** Tachado. */
  strike?: boolean;
  /** Espaço extra por caractere (EMU). */
  spc?: number;
  outline?: Run['outline'];
  pattFill?: Run['pattFill'];
  /** Degradê/imagem/opacidade das letras (desenhados na caixa da linha). */
  gradFill?: Run['gradFill'];
  fillImage?: Run['fillImage'];
  fillTile?: boolean;
  alpha?: number;
}

/** Linha final do layout. */
export interface PlacedLine {
  runs: PlacedRun[];
  /** Baseline em EMU relativo ao topo da caixa. */
  baseline: number;
  /** Altura da linha em EMU. */
  height: number;
  /** Marcador do parágrafo — presente apenas na PRIMEIRA linha dele. */
  bullet?: { text: string; x: number; font: LayoutFont; color: string; image?: import('./model.js').ImageRef };
  /** Índice do parágrafo de origem (animação por parágrafo/letra). */
  para: number;
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

/** Run de exibição: o texto já transformado + deslocamento de sobrescrito (pt). */
type DisplayRun = Run & { rise?: number };

/**
 * Runs como SERÃO DESENHADOS: maiúsculas (`cap="all"`), versalete (minúsculas
 * viram maiúsculas a 0,8), fonte de símbolo → Unicode (Wingdings/Symbol só
 * existem no Windows) e sobrescrito/subscrito a 2/3 do tamanho, deslocado
 * por `baseline × tamanho` (medido no app de referência: 40 pt, 30% → 12 pt).
 */
function displayRuns(runs: Run[], defaultSzPt: number): DisplayRun[] {
  const out: DisplayRun[] = [];
  for (const r of runs) {
    if (r.text === '\n') { out.push(r); continue; }
    const base: DisplayRun = { ...r };
    if (isSymbolFont(r.font)) { base.text = symbolText(r.font, r.text); base.font = SYMBOL_FAMILY; }
    else if (/[\uF020-\uF0FF]/.test(r.text)) {
      // caracteres da ÁREA PRIVADA (U+F0xx) usam a fonte de símbolo do <a:sym>
      // (Symbol sem ela): γ gravado como U+F067 em "Symbol"
      const sf = r.symFont && isSymbolFont(r.symFont) ? r.symFont : 'Symbol';
      for (const m of r.text.match(/[\uF020-\uF0FF]+|[^\uF020-\uF0FF]+/g) ?? []) {
        const pua = /[\uF020-\uF0FF]/.test(m);
        out.push(...displayRuns([{ ...r, text: pua ? symbolText(sf, m) : m, ...(pua ? { font: SYMBOL_FAMILY } : {}) }], defaultSzPt));
      }
      continue;
    }
    if (r.baseline) {
      const sz = r.sz ?? defaultSzPt;
      base.sz = (sz * 2) / 3;
      base.rise = r.baseline * sz;
    }
    if (r.cap === 'all') { base.text = base.text.toUpperCase(); out.push(base); continue; }
    if (r.cap === 'small') {
      const sz = base.sz ?? defaultSzPt;
      for (const m of base.text.match(/[^\p{Ll}]+|\p{Ll}+/gu) ?? []) {
        const lower = /\p{Ll}/u.test(m);
        out.push(lower ? { ...base, text: m.toUpperCase(), sz: sz * 0.8 } : { ...base, text: m });
      }
      continue;
    }
    out.push(base);
  }
  return out;
}

/** Quebra os runs de um parágrafo em tokens (palavras + espaços), preservando o run de origem. */
function tokenize(runs: Run[]): Word[] {
  const out: Word[] = [];
  for (const r of runs) {
    if (r.text === '\n') { out.push({ text: '\n', run: r }); continue; }
    // separa mantendo espaços colados à palavra anterior (quebra APÓS espaço)
    // TAB é um token próprio (avança até a próxima parada)
    const parts = r.text.match(/\t|[^\s]+[^\S\t]*|[^\S\t]+/g) ?? [];
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
  // colunas: quebra na LARGURA DA COLUNA e flui para a próxima quando a
  // altura útil esgota (bodyPr numCol/spcCol)
  const numCol = Math.max(1, tb.numCol ?? 1);
  const spcCol = tb.spcCol ?? 0;
  const colW = numCol > 1 ? Math.max(0, (usableW - (numCol - 1) * spcCol) / numCol) : usableW;
  const wrap = tb.wrap !== 'none';
  const fOpts = { defaultSzPt, defaultFont };

  const measureEmu = (text: string, f: LayoutFont): number => measure(text, f) * EMU_PER_POINT;
  /** Largura de um pedaço de run, com o espaçamento de caracteres (`spc`). */
  const measureRun = (text: string, r: Run, f: LayoutFont): number =>
    measureEmu(text, f) + (r.spc ? r.spc * EMU_PER_POINT * fontScale * [...text].length : 0);

  interface ProtoLine { runs: { text: string; run: Run }[]; marL: number; align: string; bullet?: PlacedLine['bullet']; para: number; tabTo?: (xRel: number, seg?: [number, number]) => number; segOf?: (items: { text: string; run: Run }[], from: number) => [number, number] }
  const proto: ProtoLine[] = [];
  const heights: number[] = [];
  /** Espaço EXTRA (EMU) antes de cada linha (spcBef/spcAft dos parágrafos). */
  const spacers: number[] = [];
  let pendingSpacer = 0;
  // contador de numeração automática por nível (reinicia quando o nível "sobe")
  const autoNumCounters: number[] = Array.from({ length: 9 }, () => 0);

  for (let pi = 0; pi < tb.paragraphs.length; pi++) {
    const p = tb.paragraphs[pi]!;
    const level = Math.min(p.level ?? 0, 8);
    const marL = p.marL ?? 0;
    const indent = p.indent ?? 0;
    const align = p.align ?? 'l';
    // parágrafo SEM caracteres (nenhum run ou só runs vazios): a altura da linha
    // vem do endParaRPr, como no app (célula com run vazio + endParaRPr 2 pt)
    const hasChars = p.runs.some((r) => r.text.length > 0);
    const runs = displayRuns(hasChars ? p.runs : [{ text: '', ...(p.endSz !== undefined ? { sz: p.endSz } : p.runs[0]?.sz !== undefined ? { sz: p.runs[0].sz } : {}) } as Run], defaultSzPt);

    // bullet do parágrafo (só na primeira linha). Parágrafo VAZIO não mostra
    // marcador nem consome número (como o app de referência)
    let bullet: PlacedLine['bullet'] | undefined;
    if (p.bullet && runs.some((r) => r.text)) {
      // reinicia contadores de níveis mais profundos
      for (let l = level + 1; l < 9; l++) autoNumCounters[l] = 0;
      let btext: string | undefined;
      if (p.bulletAutoNum !== undefined) {
        autoNumCounters[level] = (autoNumCounters[level] ?? 0) + 1;
        btext = formatAutoNum(p.bulletAutoNum, autoNumCounters[level]!);
      } else {
        btext = p.bulletChar ?? '•';
      }
      // marcador: fonte/cor/tamanho próprios (buFont/buClr/buSz) ou os do 1º run;
      // fonte de símbolo → Unicode equivalente
      const first = runs.find((r) => r.text && r.text !== '\n') ?? runs[0]!;
      const tf = fontOf(first, fontScale, fOpts);
      let family = p.bulletFont ?? tf.family;
      if (p.bulletAutoNum === undefined && isSymbolFont(p.bulletFont)) { btext = symbolText(p.bulletFont, btext); family = SYMBOL_FAMILY; }
      const sizePt = p.bulletSizePt !== undefined ? p.bulletSizePt * fontScale : tf.sizePt * (p.bulletSizePct ?? 1);
      bullet = {
        text: btext,
        // hanging indent: bullet fica em marL+indent (indent tipicamente negativo)
        x: insL + Math.max(0, marL + indent),
        font: { ...tf, family, sizePt },
        color: p.bulletColor ?? first.color ?? defaultColor,
      };
      if (p.bulletImage) bullet.image = p.bulletImage;
    }

    // indent de 1ª linha vale SÓ para a primeira linha do parágrafo;
    // continuações voltam para marL (hanging/first-line indent do PowerPoint)
    const contX = insL + marL;
    let firstX = p.bullet ? contX : insL + Math.max(0, marL + indent);
    // marcador que invade o início do texto (marL ≤ posição do marcador, ex. marL=0
    // indent=0 dos .ppt antigos): o texto da 1ª linha começa logo depois dele (gd-082972)
    // (só sem recuo deslocado: com indent < 0 o app mantém o texto em marL mesmo que o
    // marcador encoste — gd-000165)
    if (bullet && !bullet.image && bullet.x >= firstX) {
      const bEnd = bullet.x + measureEmu(bullet.text, bullet.font);
      if (bEnd > firstX) firstX = bEnd;
    }
    const words = tokenize(runs);
    // tabulação: próxima parada depois de xRel (EMU desde a margem esquerda da caixa)
    const defTab = p.defTabSz && p.defTabSz > 0 ? p.defTabSz : 914400;
    // recuo deslocado (indent < 0): antes da margem, o TAB para nela (como no app)
    // parada alinhada à direita/centro/decimal: o TRECHO seguinte (até o próximo TAB)
    // termina/centra/tem o separador decimal na parada — seg = [largura, largura antes do decimal]
    const tabTo = (xRel: number, seg: [number, number] = [0, 0]): number => {
      let next = (Math.floor(xRel / defTab) + 1) * defTab, algn = 'l';
      for (const t of p.tabs ?? []) if (t.pos > xRel + 1) { next = t.pos; algn = t.algn; break; }
      if (indent < 0 && xRel < marL - 1 && marL < next) return marL;
      if (algn === 'r') return Math.max(xRel, next - seg[0]);
      if (algn === 'ctr') return Math.max(xRel, next - seg[0] / 2);
      if (algn === 'dec') return Math.max(xRel, next - seg[1]);
      return next;
    };
    /** Largura do trecho seguinte e a parte antes do separador decimal. */
    const segOf = (items: { text: string; run: Run }[], from: number): [number, number] => {
      let wAll = 0, wDec = -1;
      for (let k = from; k < items.length; k++) {
        const it = items[k]!;
        if (it.text === '\t' || it.text === '\n') break;
        const fo = fontOf(it.run, fontScale, fOpts);
        const ix = wDec < 0 ? it.text.search(/[.,]/) : -1;
        if (ix >= 0) wDec = wAll + measureRun(it.text.slice(0, ix), it.run, fo);
        wAll += measureRun(it.text, it.run, fo);
      }
      return [wAll, wDec < 0 ? wAll : wDec];
    };

    // agrupamento em linhas por largura
    let cur: ProtoLine = { runs: [], marL: firstX, align, bullet, para: pi, tabTo, segOf };
    let curW = 0;
    let firstLineOfPara = true;
    const emptyPt = (runs[0]!.sz ?? defaultSzPt) * fontScale;
    let lastMaxPt = emptyPt;
    // entrelinha do parágrafo: spcPct multiplica o single; spcPts é absoluto
    const paraFactor = p.lineSpacing ?? 1;
    const flush = (): void => {
      proto.push(cur);
      // altura da linha = maior sz presente (linha vazia usa o sz do parágrafo)
      const maxPt = cur.runs.reduce((a, t) => Math.max(a, (t.run.sz ?? defaultSzPt) * fontScale), cur.runs.length ? 0 : emptyPt);
      heights.push(p.lineSpacingPt !== undefined
        ? p.lineSpacingPt * EMU_PER_POINT
        : maxPt * EMU_PER_POINT * lineFactor * paraFactor);
      // spcBef entra antes da 1ª linha do parágrafo (+ spcAft pendente do anterior)
      // spcPct: fração da altura de UMA linha simples (sz × fator de linha) da 1ª linha
      const bef = p.spaceBeforePt !== undefined ? p.spaceBeforePt * EMU_PER_POINT
        : (p.spaceBeforePct ?? 0) * maxPt * EMU_PER_POINT * lineFactor;
      // o app IGNORA o spcBef do 1º parágrafo da caixa (medido: 0, 40 pt e 100% → mesma
      // posição) — salvo `spcFirstLastPara="1"` no bodyPr (exports do Google Slides)
      spacers.push(firstLineOfPara ? pendingSpacer + (pi > 0 || tb.spcFirstLastPara ? bef : 0) : 0);
      lastMaxPt = maxPt;
      if (firstLineOfPara) pendingSpacer = 0;
      firstLineOfPara = false;
      cur = { runs: [], marL: contX, align, para: pi, tabTo, segOf };
      curW = 0;
    };
    for (let wi = 0; wi < words.length; wi++) {
      const wd = words[wi]!;
      if (wd.text === '\n') { flush(); continue; }
      if (wd.text === '\t') {
        let xRel = cur.marL - insL + curW;
        let target = tabTo(xRel, segOf(words, wi + 1));
        // o TAB não é ponto de quebra: fica colado à palavra seguinte — se o par
        // não cabe, os dois vão para a linha seguinte e o TAB vale lá (texto antigo
        // "…making \tenvironments" recuado na 2ª linha — gd-082972)
        const nw = words[wi + 1];
        const nextW = nw && nw.text !== '\t' && nw.text !== '\n' ? measureRun(nw.text.replace(/\s+$/, ''), nw.run, fontOf(nw.run, fontScale, fOpts)) : 0;
        if (wrap && cur.runs.length > 0 && target + nextW - (cur.marL - insL) > Math.max(0, colW - (cur.marL - insL))) {
          flush();
          xRel = cur.marL - insL + curW;
          target = tabTo(xRel, segOf(words, wi + 1));
        }
        cur.runs.push({ text: '\t', run: wd.run });
        curW += target - xRel;
        continue;
      }
      const f = fontOf(wd.run, fontScale, fOpts);
      const wEmu = measureRun(wd.text, wd.run, f);
      const availW = Math.max(0, colW - (cur.marL - insL));
      if (wrap && cur.runs.length > 0 && curW + measureRun(wd.text.replace(/\s+$/, ''), wd.run, f) > availW) flush();
      cur.runs.push({ text: wd.text, run: wd.run });
      curW += wEmu;
    }
    flush();
    if (p.spaceAfterPt !== undefined) pendingSpacer += p.spaceAfterPt * EMU_PER_POINT;
    else if (p.spaceAfterPct !== undefined) pendingSpacer += p.spaceAfterPct * lastMaxPt * EMU_PER_POINT * lineFactor;
  }

  // âncora vertical (inclui espaçadores de parágrafo)
  // spcFirstLastPara: o spcAft do ÚLTIMO parágrafo também ocupa altura (âncora ctr/b)
  const totalH = heights.reduce((a, b) => a + b, 0) + spacers.reduce((a, b) => a + b, 0) + (tb.spcFirstLastPara ? pendingSpacer : 0);
  const usableH = Math.max(0, boxH - insT - insB);
  const anchor = tb.anchor ?? opts.defaultAnchor ?? 't';
  let y = insT;
  // multi-coluna flui do topo (o app de referência ancora colunas no topo)
  if (numCol === 1) {
    if (anchor === 'ctr') y = insT + (usableH - totalH) / 2;
    else if (anchor === 'b') y = insT + usableH - totalH;
  }
  let colIdx = 0;

  // materializa linhas: junta tokens contíguos do MESMO run, mede e alinha
  const lines: PlacedLine[] = [];
  for (let i = 0; i < proto.length; i++) {
    const pl = proto[i]!;
    const h = heights[i]!;
    y += spacers[i] ?? 0;
    // transborda para a próxima coluna quando a altura útil esgota
    if (numCol > 1 && colIdx < numCol - 1 && y + h > insT + usableH) {
      colIdx++;
      y = insT;
    }
    const colShift = colIdx * (colW + spcCol);
    const merged: { text: string; run: Run }[] = [];
    for (const t of pl.runs) {
      const last = merged[merged.length - 1];
      // TAB fica isolado (posição calculada na hora)
      if (last && last.run === t.run && t.text !== '\t' && last.text !== '\t') last.text += t.text;
      else merged.push({ text: t.text, run: t.run });
    }
    // remove trailing whitespace da última fatia (não conta p/ alinhamento)
    if (merged.length) {
      const last = merged[merged.length - 1]!;
      last.text = last.text.replace(/\s+$/, '');
    }
    const placed: PlacedRun[] = [];
    let w = 0;
    for (let mi = 0; mi < merged.length; mi++) {
      const m = merged[mi]!;
      if (m.text === '\t') {
        const xRel = pl.marL - insL + w;
        w += (pl.tabTo ? pl.tabTo(xRel, pl.segOf?.(merged, mi + 1)) : (Math.floor(xRel / 914400) + 1) * 914400) - xRel;
        continue;
      }
      const f = fontOf(m.run, fontScale, fOpts);
      const mw = measureRun(m.text, m.run, f);
      const pr: PlacedRun = {
        text: m.text, x: pl.marL + w, w: mw, font: f,
        color: m.run.linkColor ?? m.run.color ?? defaultColor, underline: !!m.run.underline || !!m.run.linkColor,
      };
      const dr = m.run as DisplayRun;
      if (dr.rise) pr.rise = dr.rise * EMU_PER_POINT * fontScale;
      if (dr.strike) pr.strike = true;
      if (dr.spc) pr.spc = dr.spc * EMU_PER_POINT * fontScale;
      if (m.run.hyperlink !== undefined) pr.hyperlink = m.run.hyperlink;
      if (m.run.shadow !== undefined) pr.shadow = m.run.shadow;
      if (m.run.outline) pr.outline = m.run.outline;
      if (m.run.pattFill) pr.pattFill = m.run.pattFill;
      if (m.run.gradFill) pr.gradFill = m.run.gradFill;
      if (m.run.fillImage) { pr.fillImage = m.run.fillImage; if (m.run.fillTile) pr.fillTile = true; }
      if (m.run.alpha !== undefined) pr.alpha = m.run.alpha;
      placed.push(pr);
      w += mw;
    }
    // alinhamento horizontal desloca os runs (bullet fica fixo no marL+indent);
    // em multi-coluna o alinhamento é relativo à LARGURA DA COLUNA
    let dx = 0;
    const lastOfPara = proto[i + 1]?.para !== pl.para;
    if ((pl.align === 'just' || pl.align === 'dist') && (!lastOfPara || pl.align === 'dist') && placed.length) {
      // justificado: o espaço que sobra vai para os ESPAÇOS entre palavras (dist: também a última linha)
      const extra = colW - (pl.marL - insL) - w;
      const pieces: PlacedRun[] = [];
      for (const pr of placed) {
        const toks = pr.text.match(/\s+|\S+/g) ?? [pr.text];
        if (toks.length === 1) { pieces.push(pr); continue; }
        let x0 = pr.x;
        for (const t of toks) {
          const tw = measureRun(t, (merged.find((m) => m.text === pr.text)?.run ?? merged[0]!.run), pr.font);
          pieces.push({ ...pr, text: t, x: x0, w: tw });
          x0 += tw;
        }
      }
      // dist com uma palavra só: o espaço vai entre os CARACTERES (medido, syn-just)
      if (pl.align === 'dist' && pieces.length === 1 && [...pieces[0]!.text].length > 1) {
        const p0 = pieces[0]!, chars = [...p0.text];
        const run = merged.find((m) => m.text === p0.text)?.run ?? merged[0]!.run;
        let x0 = p0.x;
        const g = extra > 0 ? extra / (chars.length - 1) : 0;
        pieces.splice(0, 1, ...chars.map((ch) => { const cw = measureRun(ch, run, p0.font); const pc = { ...p0, text: ch, x: x0, w: cw }; x0 += cw + g; return pc; }));
        placed.splice(0, placed.length, ...pieces);
      }
      const gaps = pieces.filter((p, k) => /^\s+$/.test(p.text) && k < pieces.length - 1).length;
      if (extra > 0 && gaps > 0) {
        const g = extra / gaps;
        let add = 0;
        for (let k = 0; k < pieces.length; k++) {
          pieces[k]!.x += add;
          if (/^\s+$/.test(pieces[k]!.text) && k < pieces.length - 1) add += g;
        }
        placed.splice(0, placed.length, ...pieces.filter((p) => !/^\s+$/.test(p.text)));
      }
    } else if (pl.align === 'ctr') dx = (colW - (pl.marL - insL) - w) / 2;
    else if (pl.align === 'r') dx = colW - (pl.marL - insL) - w;
    if (dx > 0) for (const pr of placed) pr.x += dx;
    if (colShift > 0) {
      for (const pr of placed) pr.x += colShift;
      if (pl.bullet) pl.bullet = { ...pl.bullet, x: pl.bullet.x + colShift };
    }
    const line: PlacedLine = { runs: placed, baseline: y + h * BASELINE_FACTOR, height: h, para: pl.para };
    if (pl.bullet) line.bullet = pl.bullet;
    lines.push(line);
    y += h;
  }
  return { lines, totalH };
}
