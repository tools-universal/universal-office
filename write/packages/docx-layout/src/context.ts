import type { DocFormatting, RPr, PPr, Paragraph, Run } from '@universal-office/docx-core';
import { editBaseProps, paraPropsFromPPr } from '@universal-office/docx-core';
import { StyleResolver, fontOfSlot } from './resolve.js';
import { FaceResolver, type FontProvider } from './fonts.js';
import { NumberingState } from './numbering.js';

/** Opções do motor. */
export interface LayoutOptions {
  /** em das LARGURAS de caractere: 'nominal' (medido no Word: as larguras usam o
   *  tamanho nominal, não o em de 600 dpi) ou 'device' (11→11,04). */
  advanceEm?: 'device' | 'nominal';
  /** largura de cada caractere: 'word' (padrão, medido no Word — oráculo emwidth: piso em
   *  1/4096 pt, escala horizontal pela largura média inteira; o limite da linha também na
   *  unidade interna) ou arredondamentos de calibração ('none' = largura linear exata). */
  advanceRound?: 'word' | 'none' | 'twip' | 'twipFloor' | 'twipCeil' | 'dev600' | 'half';
  /** compressão de espaços na justificação (medida no Word, oráculo jsweep): o
   *  excesso cabe se for ≤ ratio × soma dos espaços E a compressão por espaço for
   *  ≤ expandRatio × a expansão por espaço que a linha teria sem a palavra. */
  justifyShrink?: { ratio: number; expandRatio: number };
  /** idioma para números/datas (padrão pt-BR). */
  lang?: string;
  /** valor do campo DATE/TIME (padrão: data de hoje). */
  now?: Date;
  /** diagnóstico (laboratório): cada decisão "a palavra cabe na linha?" */
  onWordFit?: (info: WordFitInfo) => void;
  /** hifenização automática (w:autoHyphenation) com os padrões já carregados em
   *  base tipográfica (`loadHyphenation`) — padrão: ligada */
  hyphenation?: boolean;
  /** só hifeniza estes idiomas (etiquetas BCP 47 ou prefixos: 'pt-BR', 'en'…): o Word
   *  só hifeniza os idiomas com revisores instalados — padrão: todos com padrões */
  hyphenationLanguages?: string[];
}

/** Dados de uma decisão de quebra (twips): para medir a regra do Word no corpus. */
export interface WordFitInfo {
  /** quanto a palavra passa da margem (≤ 0 cabe sem comprimir) */
  over: number;
  spacesW: number;
  nSpaces: number;
  wordW: number;
  lastGapW: number;
  justify: boolean;
  accepted: boolean;
  /** índices em para.glyphs: início da linha e da palavra */
  lineStart: number;
  wordStart: number;
  wordEnd: number;
  sizePt: number;
  family: string;
  compat: number;
  /** texto da linha até a palavra e da palavra (sem marcador) */
  lineText: string;
  wordText: string;
}

/** Estado que avança com o conteúdo: listas, campos SEQ e números de nota. */
export interface FlowState {
  numbering: NumberingState;
  seq: Map<string, number>;
  footnotes: Map<number, number>;
  endnotes: Map<number, number>;
}

/** Estado compartilhado de um layout de documento. */
export class DocContext {
  readonly resolver: StyleResolver;
  readonly faces: FaceResolver;
  numbering: NumberingState;
  readonly warnings = new Set<string>();
  readonly opts: Required<Omit<LayoutOptions, 'onWordFit' | 'hyphenationLanguages'>> & Pick<LayoutOptions, 'onWordFit' | 'hyphenationLanguages'>;

  constructor(readonly fmt: DocFormatting, provider: FontProvider, opts: LayoutOptions = {}) {
    this.resolver = new StyleResolver(fmt);
    const ddFonts = fmt.styles.docDefaults.rPr?.rFonts;
    this.faces = new FaceResolver(provider, fmt.fontTable, undefined, fontOfSlot(ddFonts, 'ascii', fmt.theme) ?? fmt.theme.minor.latin);
    this.opts = { advanceEm: opts.advanceEm ?? 'nominal', advanceRound: opts.advanceRound ?? 'word', justifyShrink: opts.justifyShrink ?? { ratio: 0.25, expandRatio: 0.5 }, lang: opts.lang ?? 'pt-BR', now: opts.now ?? new Date(), ...(opts.onWordFit ? { onWordFit: opts.onWordFit } : {}), hyphenation: opts.hyphenation ?? true, ...(opts.hyphenationLanguages ? { hyphenationLanguages: opts.hyphenationLanguages } : {}) };
    this.numbering = new NumberingState(fmt.numbering, fmt.styles.styles, this.opts.lang);
  }

  warn(msg: string): void { this.warnings.add(msg); }

  private footnotes = new Map<number, number>();
  private endnotes = new Map<number, number>();
  /** contadores dos campos SEQ (ordem do documento) */
  seqCounters = new Map<string, number>();

  /** Fotografia do estado que avança com o conteúdo. */
  saveFlow(): FlowState {
    return { numbering: this.numbering.clone(), seq: new Map(this.seqCounters), footnotes: new Map(this.footnotes), endnotes: new Map(this.endnotes) };
  }

  /** Volta ao estado fotografado (a fotografia continua reutilizável). */
  restoreFlow(s: FlowState): void {
    this.numbering = s.numbering.clone();
    this.seqCounters = new Map(s.seq);
    this.footnotes = new Map(s.footnotes);
    this.endnotes = new Map(s.endnotes);
  }

  /** Medição sem efeito colateral: não avança listas, SEQ nem números de nota. */
  pure<T>(fn: () => T): T {
    const s = this.saveFlow();
    try { return fn(); } finally { this.restoreFlow(s); }
  }
  /** Número exibido da nota de rodapé (ordem da 1ª referência). */
  footnoteNumber(id: number): number {
    let n = this.footnotes.get(id);
    if (n === undefined) { n = this.footnotes.size + 1; this.footnotes.set(id, n); }
    return n;
  }
  endnoteNumber(id: number): number {
    let n = this.endnotes.get(id);
    if (n === undefined) { n = this.endnotes.size + 1; this.endnotes.set(id, n); }
    return n;
  }
}

/** Formatação vazia (documentos sem as partes — ex.: ODT convertido). */
export function emptyFormatting(): DocFormatting {
  return {
    styles: { docDefaults: {}, styles: {}, defaults: {} },
    numbering: { abstractNums: {}, nums: {}, picBullets: {} },
    theme: { major: { scripts: {} }, minor: { scripts: {} }, colors: {} },
    settings: {
      defaultTabStop: 720, compatibilityMode: 15, compat: {}, evenAndOddHeaders: false, mirrorMargins: false,
      autoHyphenation: false, doNotHyphenateCaps: false, displayBackgroundShape: false, updateFields: false,
    },
    fontTable: {},
  };
}

// ───────────── formatação direta efetiva (modelo de edição × rPr/pPr originais) ─────────────

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * rPr DIRETO efetivo de um run. O leitor guarda o w:rPr original (`run.rpr`) e
 * deriva dele as props de edição (`run.props`); a edição só mexe nas props.
 * Campos cujas props divergem do que o rPr original implica foram editados e
 * sobrepõem o rPr (semântica absoluta, como formatação direta).
 */
export function directRPr(run: Run): RPr {
  const base: RPr = run.rpr ? { ...run.rpr } : {};
  const p = run.props;
  // o que o leitor força nas props sem ser formatação (hyperlink, marca de nota,
  // w:sym) não conta como edição — mesma regra do salvar (editBaseProps)
  const orig = editBaseProps(run, run.rpr);
  if (!run.rpr) {
    // run criado pela edição (sem rPr original): as props são a formatação direta
    if (p.bold) base.b = true;
    if (p.italic) base.i = true;
    // (hyperlink: o sublinhado simples forçado pelo leitor não é formatação — oráculo hlink)
    if (p.underline && !(p.link && !p.underlineStyle && !p.underlineColor)) base.u = { val: p.underlineStyle ?? 'single', ...(p.underlineColor ? { color: p.underlineColor } : {}) };
    if (p.strike) base.strike = true;
    if (p.doubleStrike) base.dstrike = true;
    if (p.allCaps) base.caps = true;
    if (p.smallCaps) base.smallCaps = true;
    if (p.vertAlign && p.vertAlign !== orig.vertAlign) base.vertAlign = p.vertAlign;
    if (p.szHalfPt !== undefined) base.sz = p.szHalfPt;
    if (p.color && !(p.link && p.color === '0563C1')) base.color = { val: p.color };
    if (p.highlight) base.highlight = p.highlight;
    if (p.fontAscii && p.fontAscii !== orig.fontAscii) base.rFonts = { ascii: p.fontAscii, hAnsi: p.fontAscii, cs: p.fontAscii };
    if (p.charSpacingTwips) base.spacing = p.charSpacingTwips;
    if (p.charStyle) base.rStyle = p.charStyle;
    return base;
  }
  if (p.bold !== orig.bold) base.b = p.bold;
  if (p.italic !== orig.italic) base.i = p.italic;
  if (p.underline !== orig.underline || p.underlineStyle !== orig.underlineStyle || p.underlineColor !== orig.underlineColor) {
    base.u = p.underline ? { val: p.underlineStyle ?? 'single', ...(p.underlineColor ? { color: p.underlineColor } : {}) } : { val: 'none' };
  }
  if (p.strike !== orig.strike) base.strike = p.strike;
  if (p.doubleStrike !== orig.doubleStrike) base.dstrike = !!p.doubleStrike;
  if (p.allCaps !== orig.allCaps) base.caps = p.allCaps;
  if (p.smallCaps !== orig.smallCaps) base.smallCaps = p.smallCaps;
  if (p.vertAlign !== orig.vertAlign) base.vertAlign = p.vertAlign ?? 'baseline';
  if (p.szHalfPt !== orig.szHalfPt) { if (p.szHalfPt === undefined) delete base.sz; else base.sz = p.szHalfPt; }
  if (p.color !== orig.color) { if (p.color === undefined) delete base.color; else base.color = { val: p.color }; }
  if (p.highlight !== orig.highlight) { if (p.highlight === undefined) delete base.highlight; else base.highlight = p.highlight; }
  if (p.fontAscii !== orig.fontAscii) {
    if (p.fontAscii === undefined) delete base.rFonts;
    else base.rFonts = { ...base.rFonts, ascii: p.fontAscii, hAnsi: p.fontAscii, cs: p.fontAscii, asciiTheme: undefined, hAnsiTheme: undefined, cstheme: undefined };
  }
  if (p.charSpacingTwips !== orig.charSpacingTwips) { if (!p.charSpacingTwips) delete base.spacing; else base.spacing = p.charSpacingTwips; }
  if (p.charStyle !== orig.charStyle) { if (p.charStyle === undefined) delete base.rStyle; else base.rStyle = p.charStyle; }
  return base;
}

/** pPr DIRETO efetivo (mesma lógica de directRPr para parágrafos). */
export function directPPr(para: Paragraph): PPr {
  const base: PPr = para.ppr ? { ...para.ppr } : {};
  const p = para.props;
  const orig = paraPropsFromPPr(para.ppr);
  if (!eq(p.alignment, orig.alignment)) { if (p.alignment) base.jc = p.alignment; else delete base.jc; }
  if (p.styleId !== orig.styleId) { if (p.styleId) base.pStyle = p.styleId; else delete base.pStyle; }
  if (!eq(p.numbering, orig.numbering)) {
    if (!p.numbering) base.numPr = { numId: 0 };
    else if (para.ppr?.numPr?.numId) base.numPr = { ...para.ppr.numPr, ilvl: p.numbering.ilvl };
    else base.numPr = { numId: p.numbering.kind === 'decimal' ? 1002 : 1001, ilvl: p.numbering.ilvl };
  }
  if (p.indentLeftTwips !== orig.indentLeftTwips || p.indentRightTwips !== orig.indentRightTwips || p.indentFirstLineTwips !== orig.indentFirstLineTwips) {
    const ind = { ...base.ind };
    if (p.indentLeftTwips !== undefined) ind.left = p.indentLeftTwips; else delete ind.left;
    if (p.indentRightTwips !== undefined) ind.right = p.indentRightTwips; else delete ind.right;
    delete ind.firstLine; delete ind.hanging;
    if (p.indentFirstLineTwips !== undefined) {
      if (p.indentFirstLineTwips < 0) ind.hanging = -p.indentFirstLineTwips;
      else ind.firstLine = p.indentFirstLineTwips;
    }
    base.ind = ind;
  }
  if (p.lineTwentieths !== orig.lineTwentieths || p.spaceAfterTwips !== orig.spaceAfterTwips || p.spaceBeforeTwips !== orig.spaceBeforeTwips) {
    const sp = { ...base.spacing };
    if (p.lineTwentieths !== orig.lineTwentieths) {
      if (p.lineTwentieths !== undefined) { sp.line = p.lineTwentieths; sp.lineRule = 'auto'; } else { delete sp.line; delete sp.lineRule; }
    }
    if (p.spaceAfterTwips !== orig.spaceAfterTwips) { if (p.spaceAfterTwips !== undefined) sp.after = p.spaceAfterTwips; else delete sp.after; }
    if (p.spaceBeforeTwips !== orig.spaceBeforeTwips) { if (p.spaceBeforeTwips !== undefined) sp.before = p.spaceBeforeTwips; else delete sp.before; }
    base.spacing = sp;
  }
  if (p.shadingHex !== orig.shadingHex) {
    if (p.shadingHex) base.shd = { val: 'clear', fill: p.shadingHex }; else delete base.shd;
  }
  if (!eq(p.borders, orig.borders)) {
    if (!p.borders) delete base.pBdr;
    else {
      base.pBdr = {};
      for (const side of ['top', 'left', 'bottom', 'right'] as const) {
        const e = p.borders[side];
        if (e) base.pBdr[side] = { val: e.style, sz: e.sizeEighthPt, space: e.spacePt, ...(e.color ? { color: e.color } : {}) };
      }
    }
  }
  if (!eq(p.tabStops, orig.tabStops)) {
    base.tabs = (p.tabStops ?? []).map((t) => ({ val: t.align, pos: t.posTwips, ...(t.leader ? { leader: t.leader } : {}) }));
  }
  if (!!p.pageBreakBefore !== !!orig.pageBreakBefore) base.pageBreakBefore = !!p.pageBreakBefore;
  return base;
}
