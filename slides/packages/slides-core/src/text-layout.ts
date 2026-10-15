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
  /** Kerning ligado: o run pede (`kern` > 0) e o tamanho alcança o limiar (medido, syn-b-e17). */
  kern?: boolean;
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
  /** Topo da linha em EMU relativo ao topo da caixa (baseline − parte acima). */
  top?: number;
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
  /** Escala EXTRA e contínua dos tamanhos (ênfase "tamanho da fonte"), sobre a do autofit. */
  sizeScale?: number;
}

// Defaults de bodyPr do PowerPoint: 0.1in lateral, 0.05in vertical.
const DEF_INS_L = 91440, DEF_INS_T = 45720, DEF_INS_R = 91440, DEF_INS_B = 45720;
/** Fator de entrelinha "single" aproximado do PowerPoint. */
const LINE_FACTOR = 1.2;
/** Fração da altura da linha acima da baseline. */
const BASELINE_FACTOR = 0.8;
/** Idem com entrelinha expandida (> 100 %) ou exata — medido em 8 fontes (syn-a-tbl8). */
const EXP_BASELINE_FACTOR = 0.75;
/** 1/8 pt em EMU: a grade de larguras do app de referência. */
const EIGHTH_PT = EMU_PER_POINT / 8;

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

/**
 * Ideogramas, kana, pontuação e formas de largura total (CJK, sem o hangul): o app
 * quebra a linha entre QUAISQUER dois deles, sem precisar de espaço (medido,
 * syn-a-tbl6 #6/#7 e syn-a-tbl8 #6: "SNSのアカウ|ントしかわ", latim segue por palavra).
 */
const CJK_CHAR = '[\\u2E80-\\u2FFF\\u3000-\\u303F\\u3040-\\u30FF\\u3100-\\u312F\\u3190-\\u31FF\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF\\uFE30-\\uFE4F\\uFF00-\\uFFEF]';
const CJK_RE = new RegExp(CJK_CHAR);
/**
 * Regras de início/fim de linha (kinsoku "padrão" do Office), valem com idioma do
 * Leste Asiático no run e `eaLnBrk` ≠ 0 (medido, syn-a-tbl9: com lang en-US ou
 * eaLnBrk="0" o app não aplica): não começam linha (puxam o caractere anterior junto);
 * não terminam linha (descem); 、。 ficam PENDURADOS além da margem (hangingPunct).
 */
const KINSOKU_NO_START = new Set([...'!%),.:;?]}¢°’”‰′″℃、。々〉》」』】〕ぁぃぅぇぉっゃゅょゎゕゖ゛゜ゝゞァィゥェォッャュョヮヵヶ・ーヽヾ！％），．：；？］｝｡｣､･ｧｨｩｪｫｬｭｮｯｰﾞﾟ￠']);
const KINSOKU_NO_END = new Set([...'$([\\{£¥‘“〈《「『【〔＄（［｛｢￡￥']);
const KINSOKU_HANG = new Set([...'、。，．､｡']);
const EA_LANG = /^(ja|zh|ko)\b/i;

/** Escalas do tamanho: a do autofit gravado (`fontScale`) e uma extra contínua (ênfase animada). */
interface SizeScale { auto: number; extra: number }

/** Tamanho efetivo: o autofit arredonda o tamanho escalado ao PONTO inteiro (medido, syn-b-e23: 46 × 90% → 41). */
function scaledSz(sz: number, sc: SizeScale): number {
  return (sc.auto !== 1 ? Math.max(1, Math.round(sz * sc.auto)) : sz) * sc.extra;
}

function fontOf(r: Run, sc: SizeScale, opts: Required<Pick<LayoutTextOptions, 'defaultSzPt' | 'defaultFont'>>): LayoutFont {
  const sizePt = scaledSz(r.sz ?? opts.defaultSzPt, sc);
  const f: LayoutFont = { family: r.font ?? opts.defaultFont, sizePt, bold: !!r.bold, italic: !!r.italic };
  // kern="1200": pares de kerning só a partir de 12 pt; sem kern (ou 0), nunca
  if (r.kern !== undefined && r.kern > 0 && sizePt >= r.kern) f.kern = true;
  return f;
}

/** Caracteres "visíveis" (grafemas: base + marcas combinantes juntas) — a quebra por caractere não os parte. */
const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new (Intl as unknown as { Segmenter: new (l?: string, o?: { granularity: string }) => { segment(t: string): Iterable<{ segment: string }> } }).Segmenter(undefined, { granularity: 'grapheme' })
  : undefined;
function graphemes(t: string): string[] {
  return segmenter ? Array.from(segmenter.segment(t), (s) => s.segment) : [...t];
}

/** Depois destes traços o app pode quebrar a linha (medido, syn-b-e19); ‐ ‑ e o hífen condicional, não. */
const BREAK_AFTER = /[-–—]/;
/** Espaço que hospeda quebra (não TAB nem espaço não separável). */
const isSpace = (c: string): boolean => c !== '\t' && c !== '\u00a0' && /\s/.test(c);

/**
 * Unidades de quebra do parágrafo: pedaços (texto + run de origem) até a próxima
 * oportunidade de quebra — depois de espaço(s) e depois de '-', '–' ou '—' (medido,
 * syn-b-e19), e antes/depois de cada caractere CJK (syn-a-tbl6/8). A fronteira entre
 * runs SEM espaço não quebra ("Management" + ":"). TAB e quebra de linha (`<a:br>`)
 * são unidades próprias.
 */
function breakUnits(runs: Run[]): Word[][] {
  const out: Word[][] = [];
  let cur: Word[] = [];
  let prev = '';
  // a sequência de espaços em curso tem espaço NÃO separável: "ipsum.  dolor"
  // não quebra em lugar nenhum (medido, syn-b-e23)
  let nb = false;
  const close = (): void => { if (cur.length) out.push(cur); cur = []; prev = ''; nb = false; };
  for (const r of runs) {
    if (r.text === '\n') { close(); out.push([{ text: '\n', run: r }]); continue; }
    const t = r.text;
    let start = 0;
    for (let i = 0; i < t.length; i++) {
      const c = t[i]!;
      if (c === '\t') {
        if (i > start) cur.push({ text: t.slice(start, i), run: r });
        close();
        out.push([{ text: '\t', run: r }]);
        start = i + 1;
        continue;
      }
      const p = i > start ? t[i - 1]! : prev;
      if (p && !isSpace(c) && c !== '\u00a0' && ((isSpace(p) && !nb) || BREAK_AFTER.test(p)
        || (p !== '\u00a0' && !isSpace(p) && (CJK_RE.test(c) || CJK_RE.test(p))))) {
        if (i > start) cur.push({ text: t.slice(start, i), run: r });
        close();
        start = i;
      }
      if (c === '\u00a0') nb = true;
      else if (!isSpace(c)) nb = false;
    }
    if (t.length > start) { cur.push({ text: t.slice(start), run: r }); prev = t[t.length - 1]!; }
  }
  close();
  return out;
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
  const sc: SizeScale = { auto: tb.fontScale ?? 1, extra: opts.sizeScale ?? 1 };
  /** Fator contínuo (espaçamento de caracteres, sobrescrito). */
  const fontScale = sc.auto * sc.extra;
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
  /** Largura de um pedaço de run, com o espaçamento de caracteres (`spc`; o autofit NÃO o escala — medido, syn-b-e27). */
  const measureRun = (text: string, r: Run, f: LayoutFont): number =>
    measureEmu(text, f) + (r.spc ? r.spc * EMU_PER_POINT * sc.extra * [...text].length : 0);

  interface ProtoLine { runs: { text: string; run: Run }[]; marL: number; align: string; bullet?: PlacedLine['bullet']; para: number; tabTo?: (xRel: number, seg?: [number, number], first?: boolean) => number; segOf?: (items: { text: string; run: Run }[], from: number) => [number, number] }
  const proto: ProtoLine[] = [];
  const heights: number[] = [];
  /** Espaço EXTRA (EMU) antes de cada linha (spcBef/spcAft dos parágrafos). */
  const spacers: number[] = [];
  /** Por linha: fração da base com entrelinha expandida/exata (0 = normal) e o tamanho (EMU) da maior fonte. */
  const lineExp: number[] = [];
  const lineSz: number[] = [];
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
    /** Início do texto da 1ª linha de um parágrafo COM marcador (EMU, relativo à caixa). */
    let bulletTextX: number | undefined;
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
      const tf = fontOf(first, sc, fOpts);
      // numeração com buFont de SÍMBOLO (Wingdings): os algarismos saem na fonte do
      // texto (oráculo, gd-183528 #11)
      const numInText = p.bulletAutoNum !== undefined && isSymbolFont(p.bulletFont);
      let family = numInText ? tf.family : p.bulletFont ?? tf.family;
      if (p.bulletAutoNum === undefined && isSymbolFont(p.bulletFont)) { btext = symbolText(p.bulletFont, btext); family = SYMBOL_FAMILY; }
      const sizePt = p.bulletSizePt !== undefined ? p.bulletSizePt * fontScale : tf.sizePt * (p.bulletSizePct ?? 1);
      // marcador no MENOR entre marL e marL+indent, texto no maior (indent > 0 inverte:
      // marcador em marL); à esquerda da caixa, a 1ª linha inteira desliza para dentro.
      // O texto nunca começa antes do FIM do marcador — a largura do caractere no
      // tamanho do MARCADOR (buSzPct/buSzPts; medido, syn-b-e20/e25/e26)
      const lo = Math.min(marL, marL + indent), hi = Math.max(marL, marL + indent);
      const shift = lo < 0 ? -lo : 0;
      const rawBullet = p.bulletAutoNum === undefined ? (p.bulletChar ?? '•') : btext;
      const bw = p.bulletImage ? 0 : measureEmu(rawBullet, { family: numInText ? tf.family : p.bulletFont ?? tf.family, sizePt, bold: tf.bold, italic: tf.italic });
      bulletTextX = insL + Math.max(hi + shift, lo + shift + bw);
      bullet = {
        text: btext,
        x: insL + lo + shift,
        font: { ...tf, family, sizePt },
        color: p.bulletColor ?? first.color ?? defaultColor,
      };
      if (p.bulletImage) bullet.image = p.bulletImage;
    }

    // indent de 1ª linha vale SÓ para a primeira linha do parágrafo;
    // continuações voltam para marL (hanging/first-line indent do PowerPoint)
    const contX = insL + marL;
    const firstX = bulletTextX ?? (p.bullet ? contX : insL + Math.max(0, marL + indent));
    const units = breakUnits(runs);
    const words = units.flat();
    // tabulação: próxima parada depois de xRel (EMU desde a margem esquerda da caixa)
    const defTab = p.defTabSz && p.defTabSz > 0 ? p.defTabSz : 914400;
    // recuo deslocado (indent < 0): antes da margem, o TAB para nela (como no app)
    // parada alinhada à direita/centro/decimal: o TRECHO seguinte (até o próximo TAB)
    // termina/centra/tem o separador decimal na parada — seg = [largura, largura antes do decimal]
    // o 1º TAB da linha para numa parada EXATAMENTE na posição atual (tabLst com
    // pos=0 dos .ppt: "\t\t\tX" põe o X em 72 pt com paradas 0/36/72 — syn-b-e30)
    const tabTo = (xRel: number, seg: [number, number] = [0, 0], first = false): number => {
      let next = (Math.floor(xRel / defTab) + 1) * defTab, algn = 'l';
      for (const t of p.tabs ?? []) if (t.pos > xRel + 1 || (first && t.pos >= xRel - 1)) { next = t.pos; algn = t.algn; break; }
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
        const fo = fontOf(it.run, sc, fOpts);
        const ix = wDec < 0 ? it.text.search(/[.,]/) : -1;
        if (ix >= 0) wDec = wAll + measureRun(it.text.slice(0, ix), it.run, fo);
        wAll += measureRun(it.text, it.run, fo);
      }
      return [wAll, wDec < 0 ? wAll : wDec];
    };

    // agrupamento em linhas por largura
    let cur: ProtoLine = { runs: [], marL: firstX, align, bullet, para: pi, tabTo, segOf };
    let curW = 0;
    /** Onde começa, em `cur.runs`, cada unidade da linha em curso (kinsoku desce a última). */
    let uStarts: number[] = [];
    let firstLineOfPara = true;
    const emptyPt = scaledSz(runs[0]!.sz ?? defaultSzPt, sc);
    let lastMaxPt = emptyPt;
    // entrelinha do parágrafo: spcPct multiplica o single; spcPts é absoluto
    const paraFactor = p.lineSpacing ?? 1;
    const flush = (): void => {
      proto.push(cur);
      // altura da linha = maior sz presente (linha vazia usa o sz do parágrafo)
      const maxPt = cur.runs.reduce((a, t) => Math.max(a, scaledSz(t.run.sz ?? defaultSzPt, sc)), cur.runs.length ? 0 : emptyPt);
      heights.push(p.lineSpacingPt !== undefined
        ? p.lineSpacingPt * EMU_PER_POINT
        : maxPt * EMU_PER_POINT * lineFactor * paraFactor);
      // entrelinha EXPANDIDA (> 100 %) ou exata: base a 0,75 da linha (fontAlgn t/ctr/b
      // deslocam — medido, syn-a-tbl10) e o pé da última sem escalar (ver abaixo)
      const exp = p.lineSpacingPt !== undefined || lineFactor * paraFactor > LINE_FACTOR + 1e-9;
      lineExp.push(exp ? (p.fontAlgn === 't' ? 0.84 : p.fontAlgn === 'ctr' ? 0.86 : p.fontAlgn === 'b' ? 0.68 : EXP_BASELINE_FACTOR) : 0);
      lineSz.push(maxPt * EMU_PER_POINT);
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
      uStarts = [];
    };
    // largura útil da linha em 1/8 pt ARREDONDADA PARA BAIXO: o app mede a linha nessa
    // grade (medido, syn-b-e18: a caixa W+0,02 pt não cabe o que mede W+0,005)
    const availOf = (x: number): number => Math.floor(Math.max(0, colW - (x - insL)) / EIGHTH_PT + 1e-6) * EIGHTH_PT;
    /** Largura de uma unidade e a parte dela SEM os espaços finais (que "pendem" fora da linha). */
    const unitW = (u: Word[]): { w: number; core: number } => {
      let w = 0, trail = 0, trailing = true;
      for (let k = u.length - 1; k >= 0; k--) {
        const pc = u[k]!;
        const f = fontOf(pc.run, sc, fOpts);
        const full = measureRun(pc.text, pc.run, f);
        w += full;
        if (trailing) {
          const core = pc.text.replace(/\s+$/, '');
          trail += full - (core ? measureRun(core, pc.run, f) : 0);
          if (core) trailing = false;
        }
      }
      return { w, core: w - trail };
    };
    const pushUnit = (u: Word[]): void => {
      uStarts.push(cur.runs.length);
      for (const pc of u) cur.runs.push({ text: pc.text, run: pc.run });
    };
    let wi = 0; // índice do 1º pedaço da unidade em `words`
    for (let ui = 0; ui < units.length; ui++) {
      const u = units[ui]!;
      const wd = u[0]!;
      const at = wi;
      wi += u.length;
      if (wd.text === '\n') { flush(); continue; }
      if (wd.text === '\t') {
        let xRel = cur.marL - insL + curW;
        let first = cur.runs.length === 0;
        let target = tabTo(xRel, segOf(words, at + 1), first);
        // o TAB não é ponto de quebra: fica colado à unidade seguinte — se o par não
        // cabe, os dois descem e o TAB vale na linha nova (texto antigo "…making
        // \tenvironments" recuado na 2ª linha — gd-082972)
        const nu = units[ui + 1];
        const nextW = nu && nu[0]!.text !== '\t' && nu[0]!.text !== '\n' ? unitW(nu).core : 0;
        if (wrap && !first && target + nextW - (cur.marL - insL) > availOf(cur.marL)) {
          flush();
          xRel = cur.marL - insL + curW;
          first = true;
          target = tabTo(xRel, segOf(words, at + 1), first);
        }
        uStarts.push(cur.runs.length);
        cur.runs.push({ text: '\t', run: wd.run });
        curW += target - xRel;
        continue;
      }
      const { w: wEmu, core: wCore } = unitW(u);
      let availW = availOf(cur.marL);
      // o app mede a LINHA inteira: o par de kerning na emenda com a unidade anterior
      // (" A", " T" do Arial…) também conta
      const prevPc = cur.runs[cur.runs.length - 1];
      let kp = 0;
      if (prevPc && prevPc.text !== '\t' && prevPc.text) {
        const fb = fontOf(wd.run, sc, fOpts);
        if (fb.kern) {
          const fa = prevPc.run === wd.run ? fb : fontOf(prevPc.run, sc, fOpts);
          if (fa.family === fb.family && fa.sizePt === fb.sizePt && fa.bold === fb.bold && fa.italic === fb.italic) {
            const a = String.fromCodePoint(prevPc.text.codePointAt(prevPc.text.length - 1) ?? 32);
            const b = String.fromCodePoint(wd.text.codePointAt(0) ?? 32);
            if (a.length === 1 && b.length === 1) kp = measureEmu(a + b, fb) - measureEmu(a, fb) - measureEmu(b, fb);
          }
        }
      }
      // cabe se a largura até o último caractere visível não passa da linha (sem folga — medido, syn-b-e18)
      if (wrap && cur.runs.length > 0 && curW + kp + wCore > availW) {
        // kinsoku (idioma do Leste Asiático e eaLnBrk ≠ 0 — medido, syn-a-tbl9)
        const chars = [...u.map((pc) => pc.text).join('').replace(/\s+$/, '')];
        const ea = p.eaLnBrk !== false && EA_LANG.test(wd.run.lang ?? '');
        // 、。 ficam penduradas além da margem
        if (ea && p.hangingPunct !== false && chars.length === 1 && KINSOKU_HANG.has(chars[0]!)) {
          pushUnit(u);
          curW += kp + wEmu;
          continue;
        }
        const lastStart = uStarts[uStarts.length - 1] ?? 0;
        const prevU = cur.runs.slice(lastStart);
        const prevCh = [...prevU.map((pc) => pc.text).join('').replace(/\s+$/, '')].pop() ?? '';
        const prevEa = p.eaLnBrk !== false && EA_LANG.test(prevU[prevU.length - 1]?.run.lang ?? '');
        kp = 0;
        if (uStarts.length > 1 && prevU[0]?.text !== '\t' && ((ea && KINSOKU_NO_START.has(chars[0] ?? '')) || (prevEa && KINSOKU_NO_END.has(prevCh)))) {
          // a unidade anterior desce junto (não pode terminar a linha / a seguinte não pode começar)
          cur.runs.splice(lastStart);
          uStarts.pop();
          flush();
          pushUnit(prevU);
          curW = unitW(prevU).w;
        } else flush();
        availW = availOf(cur.marL);
      }
      if (wrap && cur.runs.length === 0 && wCore > availW) {
        // palavra maior que a linha inteira: quebra por CARACTERE no maior prefixo
        // que cabe, ao menos 1 por linha (medido, syn-b-e19: "Supercal|ifragilisti|c")
        for (const pc of u) {
          const f = fontOf(pc.run, sc, fOpts);
          let buf = '';
          for (const ch of graphemes(pc.text)) {
            const cw = measureRun(ch, pc.run, f);
            if (!/\s/.test(ch) && (cur.runs.length > 0 || buf) && curW + cw > availW) {
              if (buf) pushUnit([{ text: buf, run: pc.run }]);
              buf = '';
              flush();
              availW = availOf(cur.marL);
            }
            buf += ch;
            curW += cw;
          }
          if (buf) pushUnit([{ text: buf, run: pc.run }]);
        }
        continue;
      }
      pushUnit(u);
      curW += kp + wEmu;
    }
    flush();
    if (p.spaceAfterPt !== undefined) pendingSpacer += p.spaceAfterPt * EMU_PER_POINT;
    else if (p.spaceAfterPct !== undefined) pendingSpacer += p.spaceAfterPct * lastMaxPt * EMU_PER_POINT * lineFactor;
  }

  // entrelinha expandida (> 100 %) ou exata (medido, syn-a-tbl6 #4/#5 e syn-a-tbl8, todas
  // as fontes): a base fica a 0,75 da entrelinha a partir do topo da linha (não 0,8) e a
  // ÚLTIMA linha termina 0,2 × (1,2 × tamanho) abaixo da base, sem escalar
  const nL = heights.length;
  const lastAdj = nL && lineExp[nL - 1] ? (1 - BASELINE_FACTOR) * lineSz[nL - 1]! * lineFactor - (1 - lineExp[nL - 1]!) * heights[nL - 1]! : 0;
  // âncora vertical (inclui espaçadores de parágrafo)
  // spcFirstLastPara: o spcAft do ÚLTIMO parágrafo também ocupa altura (âncora ctr/b)
  const totalH = heights.reduce((a, b) => a + b, 0) + spacers.reduce((a, b) => a + b, 0) + (tb.spcFirstLastPara ? pendingSpacer : 0) + lastAdj;
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
        w += (pl.tabTo ? pl.tabTo(xRel, pl.segOf?.(merged, mi + 1), mi === 0) : (Math.floor(xRel / 914400) + 1) * 914400) - xRel;
        continue;
      }
      const f = fontOf(m.run, sc, fOpts);
      const mw = measureRun(m.text, m.run, f);
      const pr: PlacedRun = {
        text: m.text, x: pl.marL + w, w: mw, font: f,
        color: m.run.linkColor ?? m.run.color ?? defaultColor, underline: !!m.run.underline || !!m.run.linkColor,
      };
      const dr = m.run as DisplayRun;
      if (dr.rise) pr.rise = dr.rise * EMU_PER_POINT * fontScale;
      if (dr.strike) pr.strike = true;
      if (dr.spc) pr.spc = dr.spc * EMU_PER_POINT * sc.extra;
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
    const line: PlacedLine = { runs: placed, top: y, baseline: y + h * (lineExp[i] || BASELINE_FACTOR), height: h, para: pl.para };
    if (pl.bullet) line.bullet = pl.bullet;
    lines.push(line);
    y += h;
  }
  return { lines, totalH };
}
