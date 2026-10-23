import type { DocFormatting, RPr, PPr, Paragraph, Run } from '@universal-office/docx-core';
import { editBaseProps, paraPropsFromPPr } from '@universal-office/docx-core';
import { StyleResolver, fontOfSlot } from './resolve.js';
import { FaceResolver, type FontProvider } from './fonts.js';
import { NumberingState, formatNumber } from './numbering.js';
import { RevisionDisplay, type RevisionView } from './revisions.js';

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
   *  base tipográfica (`loadHyphenation`) — padrão: ligada; 'force' = como se o
   *  documento tivesse w:autoHyphenation (a Hifenização Manual do editor procura
   *  as palavras assim) */
  hyphenation?: boolean | 'force';
  /** palavra que NÃO hifeniza automaticamente (o parágrafo e o offset da 1ª letra) —
   *  as recusadas na Hifenização Manual */
  hyphenationSkip?: (para: Paragraph, offset: number) => boolean;
  /** só hifeniza estes idiomas (etiquetas BCP 47 ou prefixos: 'pt-BR', 'en'…): o Word
   *  só hifeniza os idiomas com revisores instalados — padrão: todos com padrões */
  hyphenationLanguages?: string[];
  /** exibição das revisões (controle de alterações) — padrão: visão final, sem marcas */
  revisions?: RevisionView;
  /** cada valor de campo dinâmico calculado (o último de cada run vale) — o editor
   *  grava o resultado em cache ao atualizar os campos (F9) */
  onField?: (run: Run, value: string) => void;
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
  /** níveis dos títulos ("heading N") já diagramados, na ordem; e, por SEQ, quantos
   *  títulos havia na última vez em que ele contou (\s n reinicia — oráculo refs-lab, sr-*) */
  heads: number[];
  seqHeads: Map<string, number>;
  notes: NoteFlow;
}

/** Numeração das notas de um tipo na seção corrente (sectPr sobre o settings). */
export interface NoteNumbering {
  fmt: string;
  start: number;
  restart: 'continuous' | 'eachSect' | 'eachPage';
}

/** Marcas das notas já referenciadas e os contadores (reinício por seção/página). */
interface NoteFlow {
  marks: { footnote: Map<number, string>; endnote: Map<number, string> };
  seq: { footnote: number; endnote: number };
  /** notas de fim na ordem da 1ª referência (as que ainda não saíram ficam pendentes) */
  endnoteOrder: number[];
}

const cloneNotes = (n: NoteFlow): NoteFlow => ({
  marks: { footnote: new Map(n.marks.footnote), endnote: new Map(n.marks.endnote) },
  seq: { ...n.seq },
  endnoteOrder: [...n.endnoteOrder],
});

/** Estado compartilhado de um layout de documento. */
export class DocContext {
  readonly resolver: StyleResolver;
  readonly faces: FaceResolver;
  numbering: NumberingState;
  readonly warnings = new Set<string>();
  readonly opts: Required<Omit<LayoutOptions, 'onWordFit' | 'hyphenationLanguages' | 'revisions' | 'onField' | 'hyphenationSkip'>> & Pick<LayoutOptions, 'onWordFit' | 'hyphenationLanguages' | 'onField' | 'hyphenationSkip'>;
  /** como as revisões aparecem (modo, filtros, cores) */
  readonly rev: RevisionDisplay;

  constructor(readonly fmt: DocFormatting, provider: FontProvider, opts: LayoutOptions = {}) {
    this.resolver = new StyleResolver(fmt);
    const ddFonts = fmt.styles.docDefaults.rPr?.rFonts;
    this.faces = new FaceResolver(provider, fmt.fontTable, undefined, fontOfSlot(ddFonts, 'ascii', fmt.theme) ?? fmt.theme.minor.latin);
    this.opts = { advanceEm: opts.advanceEm ?? 'nominal', advanceRound: opts.advanceRound ?? 'word', justifyShrink: opts.justifyShrink ?? { ratio: 0.25, expandRatio: 0.5 }, lang: opts.lang ?? 'pt-BR', now: opts.now ?? new Date(), ...(opts.onWordFit ? { onWordFit: opts.onWordFit } : {}), hyphenation: opts.hyphenation ?? true, ...(opts.hyphenationLanguages ? { hyphenationLanguages: opts.hyphenationLanguages } : {}), ...(opts.onField ? { onField: opts.onField } : {}), ...(opts.hyphenationSkip ? { hyphenationSkip: opts.hyphenationSkip } : {}) };
    this.numbering = new NumberingState(fmt.numbering, fmt.styles.styles, this.opts.lang);
    this.rev = new RevisionDisplay(opts.revisions, opts.revisions?.order ?? []);
  }

  warn(msg: string): void { this.warnings.add(msg); }

  private notes: NoteFlow = { marks: { footnote: new Map(), endnote: new Map() }, seq: { footnote: 0, endnote: 0 }, endnoteOrder: [] };
  /** numeração da seção corrente (o motor troca em cada seção) */
  noteNumbering: { footnote: NoteNumbering; endnote: NoteNumbering } = {
    footnote: { fmt: 'decimal', start: 1, restart: 'continuous' },
    endnote: { fmt: 'lowerRoman', start: 1, restart: 'continuous' },
  };
  /** marcas finais de uma passada anterior (reinício por página: a página da
   *  referência só se sabe depois de diagramar) */
  noteMarkOverride?: Map<string, string>;
  /** contadores dos campos SEQ (ordem do documento) */
  seqCounters = new Map<string, number>();
  /** títulos diagramados (níveis) e o ponto de cada SEQ — ver FlowState */
  heads: number[] = [];
  seqHeads = new Map<string, number>();

  /** Fotografia do estado que avança com o conteúdo. */
  saveFlow(): FlowState {
    return { numbering: this.numbering.clone(), seq: new Map(this.seqCounters), heads: [...this.heads], seqHeads: new Map(this.seqHeads), notes: cloneNotes(this.notes) };
  }

  /** Volta ao estado fotografado (a fotografia continua reutilizável). */
  restoreFlow(s: FlowState): void {
    this.numbering = s.numbering.clone();
    this.seqCounters = new Map(s.seq);
    this.heads = [...s.heads];
    this.seqHeads = new Map(s.seqHeads);
    this.notes = cloneNotes(s.notes);
  }

  /** Medição sem efeito colateral: não avança listas, SEQ nem números de nota. */
  pure<T>(fn: () => T): T {
    const s = this.saveFlow();
    try { return fn(); } finally { this.restoreFlow(s); }
  }

  /** Seção nova: formato/início da numeração das notas e o reinício por seção. */
  beginNoteSection(n: { footnote: NoteNumbering; endnote: NoteNumbering }, first: boolean): void {
    this.noteNumbering = n;
    for (const k of ['footnote', 'endnote'] as const) if (first || n[k].restart === 'eachSect') this.notes.seq[k] = 0;
  }

  /** Página nova: reinicia a contagem das notas de rodapé "a cada página". */
  beginNotePage(): void {
    if (this.noteNumbering.footnote.restart === 'eachPage') this.notes.seq.footnote = 0;
  }

  /** Marca exibida de uma nota (ordem da 1ª referência, no formato da seção dela);
   *  com marca personalizada não consome número (oráculo notefmt, custom-mark). */
  noteMark(kind: 'footnote' | 'endnote', id: number, custom = false): string {
    const marks = this.notes.marks[kind];
    let m = marks.get(id);
    if (m === undefined) {
      if (kind === 'endnote') this.notes.endnoteOrder.push(id);
      if (custom) m = '';
      else {
        const nn = this.noteNumbering[kind];
        const seq = ++this.notes.seq[kind];
        m = this.noteMarkOverride?.get(`${kind[0]}${id}`) ?? formatNumber(nn.start - 1 + seq, nn.fmt, this.opts.lang);
      }
      marks.set(id, m);
    }
    return m;
  }

  /** Marca já atribuída (sem numerar). */
  noteMarkOf(kind: 'footnote' | 'endnote', id: number): string | undefined {
    return this.notes.marks[kind].get(id);
  }

  /** Todas as marcas atribuídas ("f<id>"/"e<id>") — NOTEREF na passada seguinte. */
  allNoteMarks(): Map<string, string> {
    const out = new Map<string, string>();
    for (const [id, m] of this.notes.marks.footnote) out.set(`f${id}`, m);
    for (const [id, m] of this.notes.marks.endnote) out.set(`e${id}`, m);
    return out;
  }

  /** Notas de fim referenciadas até aqui (ordem da 1ª referência). */
  get endnoteOrder(): readonly number[] { return this.notes.endnoteOrder; }
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
    if (p.underline && !(p.link && !p.underlineStyle && !p.underlineColor)) base.u = uSpec(p);
    if (p.strike) base.strike = true;
    if (p.doubleStrike) base.dstrike = true;
    if (p.allCaps) base.caps = true;
    if (p.smallCaps) base.smallCaps = true;
    if (p.vertAlign && p.vertAlign !== orig.vertAlign) base.vertAlign = p.vertAlign;
    if (p.szHalfPt !== undefined) base.sz = p.szHalfPt;
    if (p.color && !(p.link && p.color === '0563C1' && !p.colorTheme)) base.color = colorSpec(p);
    if (p.hidden) base.vanish = true;
    if (p.scalePct !== undefined && p.scalePct !== 100) base.w = p.scalePct;
    if (p.positionHalfPt) base.position = p.positionHalfPt;
    if (p.kernHalfPt) base.kern = p.kernHalfPt;
    if (p.highlight) base.highlight = p.highlight;
    if (p.fontAscii && p.fontAscii !== orig.fontAscii) base.rFonts = { ascii: p.fontAscii, hAnsi: p.fontAscii, cs: p.fontAscii };
    if (p.charSpacingTwips) base.spacing = p.charSpacingTwips;
    if (p.charStyle) base.rStyle = p.charStyle;
    return base;
  }
  if (p.bold !== orig.bold) base.b = p.bold;
  if (p.italic !== orig.italic) base.i = p.italic;
  if (p.underline !== orig.underline || p.underlineStyle !== orig.underlineStyle || p.underlineColor !== orig.underlineColor || !eq(p.underlineTheme, orig.underlineTheme)) {
    base.u = p.underline ? uSpec(p) : { val: 'none' };
  }
  if (!!p.hidden !== !!orig.hidden) base.vanish = !!p.hidden;
  if ((p.scalePct ?? 100) !== (orig.scalePct ?? 100)) { if (p.scalePct === undefined) delete base.w; else base.w = p.scalePct; }
  if ((p.positionHalfPt ?? 0) !== (orig.positionHalfPt ?? 0)) { if (!p.positionHalfPt) delete base.position; else base.position = p.positionHalfPt; }
  if ((p.kernHalfPt ?? 0) !== (orig.kernHalfPt ?? 0)) { if (!p.kernHalfPt) delete base.kern; else base.kern = p.kernHalfPt; }
  if (p.strike !== orig.strike) base.strike = p.strike;
  if (p.doubleStrike !== orig.doubleStrike) base.dstrike = !!p.doubleStrike;
  if (p.allCaps !== orig.allCaps) base.caps = p.allCaps;
  if (p.smallCaps !== orig.smallCaps) base.smallCaps = p.smallCaps;
  if (p.vertAlign !== orig.vertAlign) base.vertAlign = p.vertAlign ?? 'baseline';
  if (p.szHalfPt !== orig.szHalfPt) { if (p.szHalfPt === undefined) delete base.sz; else base.sz = p.szHalfPt; }
  if (p.color !== orig.color || !eq(p.colorTheme, orig.colorTheme)) { if (p.color === undefined) delete base.color; else base.color = colorSpec(p); }
  if (p.highlight !== orig.highlight) { if (p.highlight === undefined) delete base.highlight; else base.highlight = p.highlight; }
  if (p.fontAscii !== orig.fontAscii) {
    if (p.fontAscii === undefined) delete base.rFonts;
    else base.rFonts = { ...base.rFonts, ascii: p.fontAscii, hAnsi: p.fontAscii, cs: p.fontAscii, asciiTheme: undefined, hAnsiTheme: undefined, cstheme: undefined };
  }
  if (p.charSpacingTwips !== orig.charSpacingTwips) { if (!p.charSpacingTwips) delete base.spacing; else base.spacing = p.charSpacingTwips; }
  if (p.charStyle !== orig.charStyle) { if (p.charStyle === undefined) delete base.rStyle; else base.rStyle = p.charStyle; }
  return base;
}

/** w:u tipado das props de edição (estilo, cor e cor do tema). */
const uSpec = (p: Run['props']): NonNullable<RPr['u']> => ({
  val: p.underlineStyle ?? 'single',
  ...(p.underlineColor ? { color: p.underlineColor } : {}),
  ...(p.underlineTheme ? { themeColor: p.underlineTheme.themeColor, ...(p.underlineTheme.tint ? { themeTint: p.underlineTheme.tint } : {}), ...(p.underlineTheme.shade ? { themeShade: p.underlineTheme.shade } : {}) } : {}),
});
/** w:color tipado das props de edição (hex + cor do tema). */
const colorSpec = (p: Run['props']): NonNullable<RPr['color']> => ({
  val: p.color!,
  ...(p.colorTheme ? { themeColor: p.colorTheme.themeColor, ...(p.colorTheme.tint ? { themeTint: p.colorTheme.tint } : {}), ...(p.colorTheme.shade ? { themeShade: p.colorTheme.shade } : {}) } : {}),
});

/** pPr DIRETO efetivo (mesma lógica de directRPr para parágrafos). */
export function directPPr(para: Paragraph): PPr {
  const base: PPr = para.ppr ? { ...para.ppr } : {};
  const p = para.props;
  const orig = paraPropsFromPPr(para.ppr);
  if (!eq(p.alignment, orig.alignment)) { if (p.alignment) base.jc = p.alignment; else delete base.jc; }
  if (p.styleId !== orig.styleId) { if (p.styleId) base.pStyle = p.styleId; else delete base.pStyle; }
  if (!eq(p.numbering, orig.numbering)) {
    if (!p.numbering) base.numPr = { numId: 0 };
    else if (p.numbering.numId !== undefined) base.numPr = { numId: p.numbering.numId, ilvl: p.numbering.ilvl };
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
  if (p.lineTwentieths !== orig.lineTwentieths || p.spaceAfterTwips !== orig.spaceAfterTwips || p.spaceBeforeTwips !== orig.spaceBeforeTwips
    || p.spaceBeforeAuto !== orig.spaceBeforeAuto || p.spaceAfterAuto !== orig.spaceAfterAuto) {
    const sp = { ...base.spacing };
    if (p.spaceBeforeAuto !== orig.spaceBeforeAuto) { if (p.spaceBeforeAuto === undefined) delete sp.beforeAutospacing; else sp.beforeAutospacing = p.spaceBeforeAuto; }
    if (p.spaceAfterAuto !== orig.spaceAfterAuto) { if (p.spaceAfterAuto === undefined) delete sp.afterAutospacing; else sp.afterAutospacing = p.spaceAfterAuto; }
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
      for (const side of ['top', 'left', 'bottom', 'right', 'between', 'bar'] as const) {
        const e = p.borders[side];
        if (e) base.pBdr[side] = { val: e.style, sz: e.sizeEighthPt, space: e.spacePt, ...(e.color ? { color: e.color } : {}) };
      }
    }
  }
  if (!eq(p.tabStops, orig.tabStops)) {
    base.tabs = (p.tabStops ?? []).map((t) => ({ val: t.align, pos: t.posTwips, ...(t.leader ? { leader: t.leader } : {}) }));
  }
  // quebras de linha e de página: ausente = herdado, false = desligado contra o herdado
  for (const k of ['pageBreakBefore', 'keepNext', 'keepLines', 'widowControl', 'suppressLineNumbers', 'suppressAutoHyphens'] as const) {
    if (p[k] !== orig[k]) { if (p[k] === undefined) delete base[k]; else base[k] = p[k]; }
  }
  if (p.textboxTightWrap !== orig.textboxTightWrap) { if (p.textboxTightWrap) base.textboxTightWrap = p.textboxTightWrap; else delete base.textboxTightWrap; }
  return base;
}
