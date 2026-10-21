import {
  DocxPackage,
  readDocument,
  writeDocument,
  insertText as coreInsertText,
  insertRun as coreInsertRun,
  deleteRange as coreDeleteRange,
  splitParagraph as coreSplitParagraph,
  mergeWithPrevious as coreMergeWithPrevious,
  applyRunProps as coreApplyRunProps,
  applyParaProps,
  propsAt,
  paraLength,
  paraText,
  comparePos,
  normalizeRange,
  DEFAULT_RUN_PROPS,
  type DocumentModel,
  type DocPosition,
  type DocRange,
  type RunProps,
  type ParaProps,
  type Paragraph,
  type SectPr,
  readFullDocument,
  markSectionBreaks,
  sectionRanges,
  sectionIndexAt,
  sectionSectPr,
  insertSectionBreak as coreInsertSectionBreak,
  columnsFor,
  presetColumns,
  columnsPresetOf,
  columnWidths,
  contentWidth,
  maxColumns,
  setOrientation,
  COLUMN_SPACE_DEFAULT,
  type SectionType,
  type ColumnSpec,
  type ColumnPreset,
  readEmbeddedFonts,
  isWordBinary,
  convertDocToDocx,
  type FullDocument,
  type TableBlock,
  type Section,
  type Run,
  type InlineImage,
  type DrawingTextbox,
  type HfPartInfo,
  type Block,
  readStylesXml,
  blankDocxPackage,
  clearRunFormatting,
  clearParaFormatting,
  clearPara,
  type StyleFormat,
} from '@universal-office/docx-core';
import {
  DocStyles, listStyles, styleLook, ensureDefined, resolveStyleId, createStyleXml, modifyStyleXml, renameStyleXml, deleteStyleXml, setQuickXml, displayName,
  type StyleInfo, type StyleLook, type StyleFilter, type CreateStyleOptions, type ModifyStyleOptions,
  stylesPartPath, writeStylesPart,
} from './styles.js';
import {
  FontResolver, METRIC_SUBSTITUTES, DEFAULT_EMBEDDING, planFontEmbedding, readDocxEmbedding, writeDocxEmbedding,
  type ResolvedFont, type FontEmbeddingSettings, type FontUsage, type EmbeddingPlan,
} from '@universal-office/fonts';
import { onBrowserLangChange, uiLang, pickLabels } from '@universal-office/ui';
import {
  SfntFont,
  type LayoutFont,
  breakRich,
  lineHeightPt,
  deviceEmPt,
  TWIPS_PER_PT,
  type StyledSpan,
  type RichLine,
  type FontRegistry,
  type FontVariant,
  loadHyphenation,
  hyphenatorFor,
  hyphenationPatternId,
} from '@universal-office/docx-layout';
import {
  PdfDocument,
  hexColor,
  type PdfPage,
  type PdfColor,
  type PdfImage,
  type EmbeddedFont,
  type PlacedGlyph,
} from '@universal-office/docx-layout';
import { toHtml, toMarkdown, type ExportDoc } from '@universal-office/docx-core';
import {
  layoutDocument, renderPdf, withEmbeddedFonts, documentHyphenationLanguages, emptyFormatting,
  type FontProvider as EngineFontProvider, type FontFace as EngineFontFace,
  type LayoutResult, type LayoutPage, type LaidOutLine, type LayoutOptions,
} from '@universal-office/docx-layout';
import { readOdt, writeOdt } from '@universal-office/docx-core';
import {
  tableOps as TOps,
  type CellRect as TableRect, type TableCell, type TextSeparator, type BorderKind, type BorderSpec, type ShadingSpec,
  type TblLook, type TblPr, type TrPr, type TcPr, type WidthSpec, type DocFormatting,
  ensureTableStyle, addStylesXml, loadBuiltinTableStyles, styleIdByName, themeHex, type BuiltinTableStyle,
} from '@universal-office/docx-core';
import type { PlacedCell } from '@universal-office/docx-layout';
import { buildXps, type XpsPage, type XpsGlyphRun } from './xps.js';
import { paintItems, type EnginePaintEnv } from '@universal-office/docx-layout';
import { guardRuns } from './edit-guard.js';
import { LangResolver, ParagraphSpell, misspellingAt, wavePath, type Misspelling, type SpellEngine } from './spell.js';
import {
  buildEngineDoc, locateRef, resolveCell, cellBlocks, cellAtGrid, sameHops, caretXIn, offsetAtX, reconcileBlocks,
  shiftPageItem, findItems, hfBlocksFor, paragraphAtPath,
  type EngineDoc, type LineLoc, type CellHop, type HfKind,
} from './engine-doc.js';
import type {
  UniversalWriteDocumentSource,
  UniversalWriteFontAsset,
  UniversalWriteInitializeOptions,
  UniversalWriteInlineDrawContext,
  UniversalWriteInlineRenderer,
  UniversalWritePlugin,
} from './plugins.js';

/**
 * <universal-write> v2 — editor de docx em canvas com layout próprio.
 * Visões: print | web | draft | read | outline.
 * API de formatação chamada pela toolbar (demo/main.ts).
 */

const PX_PER_TWIP = 96 / 72 / TWIPS_PER_PT;
/** Opacidade da região "desabilitada" (o Word esmaece o que não está em foco:
 *  header/footer ao editar o corpo; corpo + outro HF ao editar um HF). */
const HF_DIM_ALPHA = 0.5;
/** Hifenização automática nos idiomas que o Word pt-BR hifeniza (revisores que
 *  acompanham a instalação: pt-BR, inglês e espanhol — medido; pt-PT, fr, de, it
 *  não), como o corpus-lab. */
const ENGINE_LAYOUT_OPTS: LayoutOptions = { hyphenationLanguages: ['pt-BR', 'en', 'es'] };
/** idiomas do documento a hifenizar (os padrões a carregar antes do layout) */
const hyphenationLangs = (full: FullDocument): string[] =>
  documentHyphenationLanguages(full).filter((l) => {
    const x = l.toLowerCase();
    return ENGINE_LAYOUT_OPTS.hyphenationLanguages!.some((y) => { const z = y.toLowerCase(); return x === z || x.startsWith(`${z}-`); });
  });

/** Família de fonte PADRÃO/fallback do editor. Liberation Sans é open (OFL,
 *  métrica-compatível com Arial), então pode ser versionada e distribuída no
 *  app/site — ao contrário de Aptos/Calibri (proprietárias da Microsoft). */
const DEFAULT_FONT = 'Liberation Sans';
/** Mesmo nome já entre aspas p/ uso em ctx.font (família com espaço). */
const DEFAULT_FONT_CSS = `"${DEFAULT_FONT}"`;

/** Nomes das quebras nas marcas de formatação (adorno de tela; idioma da interface). */
const BREAK_MARK_LABELS: Record<'en' | 'pt', Record<'page' | 'column' | 'section' | SectionType, string>> = {
  en: { page: 'Page Break', column: 'Column Break', section: 'Section Break', nextPage: 'Next Page', continuous: 'Continuous', evenPage: 'Even Page', oddPage: 'Odd Page', nextColumn: 'Next Column' },
  pt: { page: 'Quebra de página', column: 'Quebra de coluna', section: 'Quebra de seção', nextPage: 'Próxima página', continuous: 'Contínua', evenPage: 'Página par', oddPage: 'Página ímpar', nextColumn: 'Próxima coluna' },
};

export type ViewMode = 'print' | 'web' | 'draft' | 'read' | 'outline';

/** A que parte do documento uma configuração de página/colunas se aplica
 *  ("Aplicar a" dos diálogos): seção(ões) da seleção, documento inteiro, deste
 *  ponto em diante (quebra de seção no cursor) ou texto selecionado (quebras
 *  antes e depois). */
export type SectionApplyTo = 'section' | 'document' | 'forward' | 'selection';

/** A seção do cursor (getSection). Medidas em twips. */
export interface SectionInfo {
  index: number;
  count: number;
  /** como a seção começa (w:type) */
  type: SectionType;
  orientation: 'portrait' | 'landscape';
  pageWidthTwips: number;
  pageHeightTwips: number;
  margins: { top: number; right: number; bottom: number; left: number };
  columns: {
    count: number;
    spaceTwips: number;
    /** linha entre colunas */
    sep: boolean;
    equalWidth: boolean;
    /** largura e espaço depois de cada coluna */
    widths: { widthTwips: number; spaceTwips: number }[];
    /** predefinição da galeria que as colunas são, se alguma */
    preset: ColumnPreset | null;
    /** quantas colunas cabem (largura mínima 720 tw) */
    max: number;
    /** largura útil entre as margens */
    contentWidthTwips: number;
  };
}

/** Formato de arquivo para load()/save(). 'auto' detecta na carga e, ao salvar,
 *  usa o formato originalmente carregado. */
export type FileFormat = 'auto' | 'docx' | 'odt' | 'pdf' | 'html' | 'markdown' | 'xps';

interface StyleDef {
  sizePt: number;
  bold: boolean;
  color?: string;
  spaceBeforeTwips: number;
  italic?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'both';
  spaceAfterTwips?: number;
  lineTwentieths?: number;
  fontAscii?: string;
  underline?: boolean;
  strike?: boolean;
  allCaps?: boolean;
  smallCaps?: boolean;
  borders?: import('@universal-office/docx-core').ParagraphBorders;
  shadingHex?: string;
  indentLeftTwips?: number;
  indentRightTwips?: number;
}
/** Estilos built-in (espelha styles.xml do template atual; pt-BR + en ids). */
const STYLES: Record<string, StyleDef> = {
  'Ttulo1': { sizePt: 20, bold: false, color: '0F4761', spaceBeforeTwips: 360 },
  'Heading1': { sizePt: 20, bold: false, color: '0F4761', spaceBeforeTwips: 360 },
  'Ttulo2': { sizePt: 16, bold: false, color: '0F4761', spaceBeforeTwips: 160 },
  'Heading2': { sizePt: 16, bold: false, color: '0F4761', spaceBeforeTwips: 160 },
  'Ttulo3': { sizePt: 14, bold: false, color: '0F4761', spaceBeforeTwips: 160 },
  'Heading3': { sizePt: 14, bold: false, color: '0F4761', spaceBeforeTwips: 160 },
  'Ttulo': { sizePt: 28, bold: false, spaceBeforeTwips: 0 },
  'Title': { sizePt: 28, bold: false, spaceBeforeTwips: 0 },
};
const HIGHLIGHTS: Record<string, string> = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff',
  blue: '#0000ff', red: '#ff0000', darkYellow: '#808000', lightGray: '#c0c0c0',
};

interface LaidLine {
  para: number;
  rich: RichLine;
  page: number;
  xTwips: number; // início do texto (após indent/alinhamento)
  yTwips: number; // topo da linha
  heightTwips: number;
  baselineTwips: number;
  marker?: { text: string; xTwips: number; sizePt: number };
  justifyExtraPerSpace: number;
  /** linha do MOTOR (visão de impressão): cursor/clique pelos caracteres dela */
  eng?: LaidOutLine;
}

/** Refs de cabeçalho/rodapé de uma seção no modelo (sectionBreak ou bodyRefs). */
type SectionRefs = NonNullable<DocumentModel['bodyRefs']>;
type SectionBreak = NonNullable<ParaProps['sectionBreak']>;
const refsOfSection = (s: Section): SectionRefs => ({
  headerRefs: s.headerRefs.map((r) => ({ kind: 'header' as const, type: r.type, rid: r.rid })),
  footerRefs: s.footerRefs.map((r) => ({ kind: 'footer' as const, type: r.type, rid: r.rid })),
});

/** Linha do motor com a página e a localização no estado de edição. */
interface EngLine {
  line: LaidOutLine;
  page: number;
  loc: LineLoc;
  /** parágrafo do editor dono da linha (corpo, célula ou cabeçalho/rodapé) */
  para: Paragraph | null;
}

/** Resultado do motor pintado no canvas (visão de impressão). */
interface EngineView {
  result: LayoutResult;
  doc: EngineDoc;
  lines: EngLine[];
  /** por página: nº de itens iniciais que são do cabeçalho/rodapé (esmaecidos) */
  hfItems: number[];
  /** muda a cada layout (invalida o cache de pintura das páginas) */
  version: number;
  /** por página: muda quando o layout incremental refaz só aquela página */
  pageVersion: number[];
}

/** Edição de célula de tabela (visão de impressão, motor): o modelo passa a
 *  ser os parágrafos da célula; o corpo fica guardado. */
interface CellEdit {
  anchor: number;
  hops: CellHop[];
  cell: import('@universal-office/docx-core').TableCell;
  /** corpo guardado (as âncoras de tabela/seção continuam as do corpo; a pilha
   *  de desfazer é a do corpo — o snapshot leva as tabelas e a célula ativa) */
  saved: {
    model: DocumentModel;
    selection: { anchor: DocPosition; focus: DocPosition };
  };
}

/** Seleção de CÉLULAS: retângulo (linhas × colunas da grade) de uma tabela do
 *  corpo — `path` leva às tabelas aninhadas (hops até a célula que a contém). */
interface TableSel {
  anchor: number;
  path: CellHop[];
  rect: TableRect;
  /** canto fixo (onde o arrasto/Shift+seta começou) */
  origin: { r: number; c: number };
}

/** Onde fica o cursor depois de uma operação de tabela. */
interface TableAfter {
  /** cursor no corpo */
  body?: DocPosition;
  /** cursor numa célula de outra tabela do caminho (aninhada → a de fora) */
  enter?: { path: CellHop[]; r: number; c: number; end?: boolean };
  /** células selecionadas (o Word deixa as linhas/colunas novas selecionadas) */
  select?: TableRect;
  /** cursor no início (ou fim) da célula */
  caret?: { r: number; c: number; end?: boolean };
  /** a operação já posicionou o cursor */
  keep?: true;
}

/** Estilo de tabela na galeria. */
export interface TableStyleInfo {
  /** w:name (inglês) — o que setTableStyle recebe */
  name: string;
  label: { en: string; pt: string };
  /** Personalizado, Tabelas Simples, de Grade, de Lista */
  group: 'custom' | 'plain' | 'grid' | 'list';
  /** id no documento (se já está nele) */
  id?: string;
}

/** Estado da tabela do cursor/seleção (barras, diálogos). */
export interface TableState {
  rows: number;
  /** colunas da grade */
  cols: number;
  rect: TableRect;
  /** há seleção de células (não só o cursor) */
  cells: boolean;
  nested: boolean;
  canMerge: boolean;
  style?: string;
  look: TblLook;
  vAlign: string;
  textDirection: string;
  headerRow: boolean;
  rowHeight?: { twips: number; rule: string };
  colWidth: number;
  shading?: string;
  tblPr: TblPr;
}

/** Referência ao w:rPr original guardada nas props do run (ver syncRunRPr):
 *  símbolo — copiado pelo spread das props, invisível ao JSON e ao toolbar. */
const RPR_REF = Symbol('uw-rpr');
/** o rpr da referência foi limpo pelo editor (vai junto para o texto digitado ao lado) */
const RPR_EDITED = Symbol('uw-rpr-edited');

// Operações de edição do docx-core protegidas (guardRuns): preservam o w:rPr
// e os extras dos runs e não fundem runs de formatação original diferente —
// o motor de layout lê essa formatação (ver edit-guard.ts).
const insertText = (m: DocumentModel, pos: DocPosition, text: string, props?: RunProps): DocPosition =>
  guardRuns(m, pos.para, pos.para, () => coreInsertText(m, pos, text, props));
const insertRun = (m: DocumentModel, pos: DocPosition, run: Run): DocPosition =>
  guardRuns(m, pos.para, pos.para, () => coreInsertRun(m, pos, run));
const deleteRange = (m: DocumentModel, range: DocRange): DocPosition => {
  const r = normalizeRange(range);
  return guardRuns(m, r.start.para, r.end.para, () => coreDeleteRange(m, range));
};
const splitParagraph = (m: DocumentModel, pos: DocPosition): DocPosition =>
  guardRuns(m, pos.para, pos.para, () => coreSplitParagraph(m, pos));
const mergeWithPrevious = (m: DocumentModel, para: number): DocPosition =>
  guardRuns(m, para - 1, para, () => coreMergeWithPrevious(m, para));
const applyRunProps = (m: DocumentModel, range: DocRange, patch: Partial<RunProps>): void => {
  const r = normalizeRange(range);
  guardRuns(m, r.start.para, r.end.para, () => coreApplyRunProps(m, range, patch));
};

/** Família CSS entre aspas. */
const cssFamily = (family: string): string => `"${family.replace(/["\\]/g, '\\$&')}"`;

/**
 * Inline de plugin (run.custom: 1 caractere U+FFFC no modelo) — o motor
 * desenha o texto de reserva com offsets a partir do do run, que colidem com
 * os do run seguinte. Os caracteres do texto de reserva viram UM caractere
 * atômico (cursor antes/depois, clique, caixa do desenho do plugin).
 */
function collapseCustomChars(line: LaidOutLine, para: Paragraph): void {
  const cs = line.chars;
  if (!cs?.length) return;
  let acc = 0;
  for (const r of para.runs) {
    const a = acc;
    acc += r.text.length;
    if (!r.custom) continue;
    const n = Math.max(1, Array.from(r.custom.fallbackText || ' ').length);
    const i = cs.findIndex((c) => c.o === a);
    if (i < 0) continue;
    let j = i;
    while (j + 1 < cs.length && j - i + 1 < n && cs[j + 1]!.o === cs[j]!.o + 1) j++;
    const last = cs[j]!;
    cs.splice(i, j - i + 1, { o: a, x: cs[i]!.x, w: last.x + last.w - cs[i]!.x });
  }
}

/** Tabela conferida para o layout incremental (edição dentro de célula). */
interface FastTableBefore {
  page: number;
  dx: number;
  dy: number;
  start: number;
  count: number;
  lineAt: number;
  lineCount: number;
  /** base dos itens da tabela no layout isolado (a altura não pode mudar) */
  bottom: number;
  /** "b<k>" — raiz das referências das linhas da tabela no documento */
  root: string;
}

/** Base (y máximo) do que a página desenha — mede a altura de um bloco isolado. */
function itemsBottom(page: LayoutPage): number {
  let b = 0;
  for (const it of page.items) {
    if (it.t === 'rect' || it.t === 'image' || it.t === 'shape') b = Math.max(b, it.y + it.h);
    else if (it.t === 'line') b = Math.max(b, it.y1, it.y2);
    else if (it.t === 'glyphs') b = Math.max(b, it.y);
  }
  for (const l of page.lines) b = Math.max(b, l.y + l.height);
  return b;
}

/** Parágrafo conferido para o layout incremental (ver noteParaEdit). */
interface FastBefore {
  page: number;
  ref: string;
  /** deslocamento do layout isolado até a posição real */
  dx: number;
  dy: number;
  /** itens do parágrafo em page.items [start, start+count) */
  start: number;
  count: number;
  /** 1ª linha do parágrafo em page.lines */
  lineAt: number;
  heights: number[];
}

interface ParaLayout {
  spans: StyledSpan[];
  charAdvances: number[];
  lines: LaidLine[];
  spanCharStart: number[]; // início de cada span no texto concatenado
  tabLeaders?: Map<number, 'dot'>;
}

class Registry implements FontRegistry {
  /** `onMiss(família)`: chamada quando a família não está registrada — o
   *  editor consulta o resolvedor de fontes e registra se já houver resposta. */
  constructor(
    private sets: Record<string, Partial<Record<FontVariant, LayoutFont>>>,
    private onMiss?: (family: string) => void,
    /** a família está registrada mas sem a variante (ainda não baixada) */
    private onMissVariant?: (family: string, variant: FontVariant) => void,
  ) {}
  /** muda a cada registro/remoção (o provedor do motor refaz o cache de faces) */
  version = 0;
  /** Registra uma variante de fonte (ex.: fontes EMBEDADAS do .docx). */
  register(family: string, variant: FontVariant, font: LayoutFont): void {
    (this.sets[family] ??= {})[variant] = font;
    this.version++;
  }
  has(family: string): boolean {
    return this.sets[family] !== undefined || this.sets[family.split(' ')[0]!] !== undefined;
  }
  families(): string[] {
    return Object.keys(this.sets);
  }
  delete(family: string): void {
    delete this.sets[family];
    this.version++;
  }
  get(family: string): Partial<Record<FontVariant, LayoutFont>> | undefined {
    return this.sets[family];
  }
  resolve(family: string | undefined, variant: FontVariant): LayoutFont {
    // tenta o nome COMPLETO ("Lato Black"), depois a base ("Lato"), depois o padrão.
    if (family && !this.sets[family]) this.onMiss?.(family);
    const requested = family
      ? (this.sets[family] ?? this.sets[family.split(' ')[0]!])
      : undefined;
    if (family && requested && !requested[variant]) this.onMissVariant?.(family, variant);
    const def = this.sets[DEFAULT_FONT] ?? this.sets['Aptos']!;
    return requested?.[variant] ?? requested?.regular ?? def[variant] ?? def.regular!;
  }
}

interface CellEdgeSpec {
  x0: number; y0: number; x1: number; y1: number; // rel. à tabela, twips
  edges: {
    top?: import('@universal-office/docx-core').BorderEdge;
    bottom?: import('@universal-office/docx-core').BorderEdge;
    left?: import('@universal-office/docx-core').BorderEdge;
    right?: import('@universal-office/docx-core').BorderEdge;
  };
}

interface TableLayout {
  table: TableBlock;
  page: number;
  xTwips: number;
  yTwips: number;
  heightTwips: number;
  colXs: number[]; // bordas das colunas (acumulado), relativo a xTwips
  rowYs: number[]; // alturas acumuladas das linhas
  cellLines: {
    row: number; col: number;
    xTwips: number; yTwips: number;
    text: string; sizePt: number; bold: boolean; italic: boolean;
    color?: string; family?: string; underline?: boolean; strike?: boolean;
  }[];
  cellShades: { xTwips: number; yTwips: number; wTwips: number; hTwips: number; hex: string }[];
  cellRects: CellEdgeSpec[];
}

interface FloatImage {
  para: number;
  run: Run;
}

/** Objeto flutuante (imagem OU caixa de texto) com seu retângulo pintado, para
 *  seleção/mover/redimensionar. rect em twips de página. */
interface FloatHandle {
  run: Run;
  obj: InlineImage | DrawingTextbox;
  kind: 'image' | 'textbox';
  page: number;
  rect: { x: number; y: number; w: number; h: number };
}

interface FootnoteHit {
  page: number;
  id: number;
}

export class UniversalWriteElement extends HTMLElement {
  private model: DocumentModel | null = null;
  private pkg: DocxPackage | null = null;
  private fullDoc: FullDocument | null = null;
  /** word/styles.xml editável — fonte única da galeria, do painel e do salvar */
  private docStyles = new DocStyles(null);
  /** Tabelas ancoradas antes do parágrafo de índice beforePara. */
  private tableAnchors: { beforePara: number; table: TableBlock }[] = [];
  /** Seções: a partir de qual parágrafo cada uma vale — DERIVADAS do modelo
   *  (syncSections): o sectPr de cada uma mora no sectionBreak do parágrafo que a
   *  encerra (a última, em model.sectPr), assim Enter, Backspace, colar e
   *  desfazer não descolam o que se desenha do que se salva. */
  private sectionStarts: { startPara: number; section: Section }[] = [];
  /** props do w:sectPr que o modelo não representa (grade, bordas de página…)
   *  por id da quebra (sectionBreak.id); 0 = a última seção */
  private sectionProps = new Map<number, import('@universal-office/docx-core').SectionProps | undefined>();
  private nextSectionId = 1;
  /** partes de cabeçalho/rodapé conhecidas ("header:rId7" → caminho, conteúdo):
   *  cada seção mostra as que as refs DELA no modelo apontam */
  private hfParts = new Map<string, { path: string; paras?: Paragraph[]; blocks?: Block[] }>();
  /** seção efetiva em cache por id (refeita quando o sectPr ou as refs mudam) */
  private sectionEff = new Map<number, { sp: SectPr; key: string; props: unknown; sec: Section }>();
  /** id de cada seção efetiva (cabeçalho novo grava a ref na seção certa) */
  private sectionIds = new WeakMap<Section, number>();
  /** ids e refs da última derivação: quebra apagada → as refs dela passam para a
   *  seção que agora cobre o texto (o Word mantém o cabeçalho — oráculo hdr-del-*) */
  private lastSectionIds: number[] = [];
  private lastSectionRefs = new Map<number, SectionRefs>();
  private floatImages: FloatImage[] = [];
  private tableLayouts: TableLayout[] = [];
  private footnoteHits: FootnoteHit[] = [];
  private pageDark = false;
  private pageSections: number[] = []; // página → índice de seção
  private fonts: Registry | null = null;
  /** bytes crus de cada fonte (família→variante) para embutir no PDF exportado. */
  private fontBytes: Record<string, Partial<Record<FontVariant, Uint8Array>>> = {};
  /** variantes de fonte com FontFace já carregado ("Família variante"). */
  private loadedFamilies = new Set<string>();
  /** nomes de família com QUALQUER FontFace carregado (p/ escolher a família CSS). */
  private loadedFamilyNames = new Set<string>();
  /** Resolvedor de fontes ÚNICO dos apps (shared/fonts): host, Local Font
   *  Access, instaladas pelo nome, substitutas abertas, padrão. */
  private readonly fontResolver = FontResolver.shared();
  /** Opção "incorporar fontes no arquivo" DESTE documento (lida do settings do
   *  .docx ao abrir; padrões do Word num documento novo). */
  private fontEmbedding: FontEmbeddingSettings = { ...DEFAULT_EMBEDDING.write };
  private unsubscribeFonts: (() => void) | null = null;
  /** Famílias (como o documento as nomeia) pedidas ao resolvedor… */
  private askedFonts = new Set<string>();
  /** …e as que já têm a resposta aplicada ao Registry. */
  private appliedFonts = new Set<string>();
  /** Arquivo de cada fonte de métrica que tem bytes (nome p/ o PDF + bytes):
   *  o PDF embute EXATAMENTE o arquivo cujas métricas posicionaram o texto. */
  private fontFiles = new WeakMap<LayoutFont, { name: string; bytes: Uint8Array }>();
  private refreshQueued = false;
  private container: HTMLDivElement;
  private input: HTMLTextAreaElement;
  private topbarEl!: HTMLDivElement;
  private bottombarEl!: HTMLDivElement;
  private chromeSync: (() => void) | null = null;
  private selection: { anchor: DocPosition; focus: DocPosition } = {
    anchor: { para: 0, offset: 0 },
    focus: { para: 0, offset: 0 },
  };
  private view: ViewMode = 'print';
  private readFirstPage = 0;       // 1ª página do bloco visível no modo Leitura
  private zoomBeforeRead = 1;      // zoom a restaurar ao sair da Leitura
  private readWheelLock = false;   // 1 bloco por gesto de scroll
  private zoom = 1;
  private showMarks = false;
  private layoutCache: ParaLayout[] = [];
  private pageCount = 1;
  private canvases: HTMLCanvasElement[] = [];
  private caretVisible = true;
  /** Render "como impresso" (print() e o corpus-lab): sem caret, sem esmaecer
   *  cabeçalho/rodapé e sem sombreamento de campo/comentário — adornos de TELA
   *  que o Word também não imprime. */
  private printRender = false;
  /** Layout do MOTOR (docx-layout, o mesmo do PDF) na visão de impressão;
   *  null = layout legado (outras visões, layout="legacy" ou falha do motor). */
  private eng: EngineView | null = null;
  private engVersion = 0;
  /** o motor lançou exceção neste documento: legado até a próxima carga */
  private engineFailed = false;
  /** Revisão ortográfica: motor compartilhado (carregado na 1ª pintura) e o
   *  cache dos erros por parágrafo. `spellOff` = desligada no menu (sessão). */
  private spell: ParagraphSpell | null = null;
  private spellEngine: SpellEngine | null = null;
  private spellLoading = false;
  private spellOff = false;
  private spellLangs: LangResolver | null = null;
  private spellRepaint = 0;
  /** pintura das páginas do motor em cache (o caret pisca sem repintar glifos) */
  private engPageCache = new Map<number, { key: string; canvas: HTMLCanvasElement }>();
  /** imagens decodificadas desde a última pintura (invalida o cache) */
  private imagesVersion = 0;
  /** faces do motor → família/variante CSS carregada na página */
  private engFaceCss = new WeakMap<EngineFontFace, { family: string; weight: 400 | 700; italic: boolean }>();
  /** cache de faces do provedor ao vivo (refeito quando o Registry muda) */
  private engFaceCache = new Map<string, EngineFontFace | null>();
  private engFaceCacheVersion = -1;
  /** famílias que o motor pediu e ainda não foram resolvidas (carga em 2º plano) */
  private engMissing = new Map<string, Set<FontVariant>>();
  private engFontsAttempted = new Set<string>();
  private engFontLoad: Promise<void> | null = null;
  /** padrões de hifenização já pedidos (carga em 2º plano, uma vez por idioma) */
  private hyphAttempted = new Set<string>();
  /** indicadores → índice do parágrafo (deslocado nas edições, como as âncoras) */
  private bookmarkParas = new Map<string, number>();
  /** edição de célula de tabela (motor) */
  private cellEdit: CellEdit | null = null;
  /** tempos do último layout do motor (ms) — diagnóstico/medição */
  engineStats: { buildMs: number; layoutMs: number; pages: number; paintMs: number; mode: string } = { buildMs: 0, layoutMs: 0, pages: 0, paintMs: 0, mode: '' };
  private caretTimer = 0;
  private readResizeQueued = false;
  private readonly handleWindowResize = (): void => {
    if (this.view !== 'read' || this.readResizeQueued) return;
    this.readResizeQueued = true;
    requestAnimationFrame(() => {
      this.readResizeQueued = false;
      if (!this.isConnected) return;
      this.fitReadZoom();
      this.refreshView(); // o layout do motor não depende do zoom
    });
  };
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private pendingProps: RunProps | null = null; // formatação aplicada antes de digitar
  private plainPasteNext = false; // próximo paste (Ctrl+Shift+V) cola sem formatação
  // clipboard RICO interno (o sistema só guarda texto): casado por texto, usado
  // pelo "Colar" para preservar a formatação dos runs da ORIGEM.
  private richClip: { text: string; paras: { runs: { text: string; props: RunProps }[] }[] } | null = null;

  onSelectionChange: (() => void) | null = null;

  /** Fontes em memória usadas pela inicialização automática, sem fetch/backend. */
  fontAssets: readonly UniversalWriteFontAsset[] | undefined;
  /** Documento inicial em memória usado pela inicialização automática. */
  documentSource: UniversalWriteDocumentSource | undefined;

  private initialization: Promise<void> | null = null;
  private initialized = false;
  private plugins = new Map<string, UniversalWritePlugin>();
  private pluginCleanups = new Map<string, () => void>();
  private inlineRenderers = new Map<string, {
    owner: string;
    renderer: UniversalWriteInlineRenderer;
  }>();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { display:block; background:#e8e8e8; overflow:auto; position:relative; outline:none; }
      /* páginas lado a lado quando o zoom abre espaço (como no app de referência) */
      .pages {
        padding: 24px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-content: flex-start;
        gap: 24px;
      }
      :host(.view-web) .pages, :host(.view-draft) .pages { padding: 0; display: block; }
      /* borda sutil em vez de sombra (outline não afeta o tamanho do canvas) */
      .page { background:white; outline:1px solid var(--md-outline-variant, rgba(0,0,0,.18)); outline-offset:-1px; display:block; cursor:text; flex: none; }
      :host(.view-web) .page, :host(.view-draft) .page { margin: 0 auto; }
      :host(.view-web) .page, :host(.view-draft) .page { outline:none; }
      /* Web/Rascunho são CONTÍNUOS: sem "desk" cinza em volta — o fundo é a
         própria cor da página (a folha preenche a largura). */
      :host(.view-web), :host(.view-draft) { background: #ffffff; }
      :host(.view-web.page-dark), :host(.view-draft.page-dark) { background: #1e1e1e; }
      /* Leitura: fundo da COR DA PÁGINA; páginas em RAIAS lado a lado, sem
         espaço entre elas — a borda sutil de cada página vira o divisor da raia.
         As páginas fora do bloco visível ficam display:none. */
      :host(.view-read) { background:#ffffff; }
      :host(.view-read) .pages { flex-wrap: nowrap; align-items: center; justify-content: center; align-content: center; min-height: 100%; gap: 0; padding: 0; }
      /* sem moldura ao redor; o divisor aparece SÓ entre páginas (borda esq.) */
      :host(.view-read) .page { cursor:default; outline: none; }
      :host(.view-read) .page.read-divider { border-left: 1px solid var(--md-outline-variant, rgba(0,0,0,.18)); }
      :host(.view-outline) .page { outline:none; }
      textarea.proxy { position:absolute; opacity:0; width:1px; height:1em; padding:0; border:0; resize:none; }
      /* barras opcionais (topbar/bottombar) — sticky para preservar o scroll do host */
      /* sticky nos DOIS eixos (left:0) — senão a barra rola junto quando o
         documento gera scroll horizontal (ex.: zoom alto). A largura é a do
         viewport (o host de scroll), então cobre a faixa visível em qualquer
         posição de scroll. */
      .uw-topbar, .uw-bottombar { position: sticky; left: 0; z-index: 30; flex: none;
        width: 100%; box-sizing: border-box;
        background: var(--u-color-surface-container, #eef0f2); color: var(--u-color-on-surface, #1b1b1f); }
      .uw-topbar { top: 0; border-bottom: 1px solid var(--u-color-outline-variant, rgba(0,0,0,.14)); }
      .uw-bottombar { bottom: 0; border-top: 1px solid var(--u-color-outline-variant, rgba(0,0,0,.14)); }
      .uw-topbar:empty, .uw-bottombar:empty { display: none; }
    `;
    this.container = document.createElement('div');
    this.container.className = 'pages';
    this.topbarEl = document.createElement('div');
    this.topbarEl.className = 'uw-topbar';
    this.bottombarEl = document.createElement('div');
    this.bottombarEl.className = 'uw-bottombar';
    this.input = document.createElement('textarea');
    this.input.className = 'proxy';
    this.input.setAttribute('aria-hidden', 'true');
    root.append(style, this.topbarEl, this.container, this.bottombarEl, this.input);
    this.bindEvents();
  }

  // ─────────────────────── chrome (barras) ───────────────────────

  static get observedAttributes(): string[] {
    return ['topbar', 'bottombar', 'toolbar', 'layout', 'lang', 'nospellcheck'];
  }

  attributeChangedCallback(name: string): void {
    // lang: idioma da interface (barras); sem ele, o do navegador — inglês por padrão
    // toolbar="compact|ribbon": estilo da barra superior (compacta é o padrão)
    if ((name === 'topbar' || name === 'bottombar' || name === 'toolbar' || name === 'lang') && this.initialized) void this.updateChrome();
    // nospellcheck: sem revisão ortográfica (o sublinhado some na hora)
    if (name === 'nospellcheck' && this.model) this.paint();
    // layout="legacy": volta ao layout antigo do canvas (o motor é o padrão)
    if (name === 'layout' && this.model) {
      if (this.legacyRequested() && this.cellEdit) this.exitCell();
      this.refresh();
    }
  }

  /** Barra de ferramentas superior (única). */
  get topbar(): boolean { return this.hasAttribute('topbar'); }
  set topbar(v: boolean) {
    if (v) this.setAttribute('topbar', ''); else this.removeAttribute('topbar');
  }

  /** Visibilidade da barra inferior (status). */
  get bottombar(): boolean { return this.hasAttribute('bottombar'); }
  set bottombar(v: boolean) {
    if (v) this.setAttribute('bottombar', ''); else this.removeAttribute('bottombar');
  }

  private chromeReq = 0;
  private unsubscribeLang: (() => void) | null = null;
  private chromeListenersBound = false;
  /** (Re)constrói as barras conforme os atributos topbar/bottombar. */
  private async updateChrome(): Promise<void> {
    const topbar = this.topbar;
    const bottombar = this.bottombar;
    if (!topbar && !bottombar) {
      this.topbarEl.replaceChildren();
      this.bottombarEl.replaceChildren();
      this.chromeSync = null;
      return;
    }
    const req = ++this.chromeReq;
    const { setupChrome } = await import('./chrome.js');
    if (req !== this.chromeReq) return; // superado por outra mudança
    const handle = setupChrome(this, this.topbarEl, this.bottombarEl, { topbar, bottombar, lang: uiLang(this) });
    this.chromeSync = handle.sync;
    if (!this.chromeListenersBound) {
      const relay = (): void => this.chromeSync?.();
      this.addEventListener('uw-zoom', relay);
      this.addEventListener('uw-change', relay);
      this.chromeListenersBound = true;
    }
  }

  // ───────────────────────── carga ─────────────────────────

  async connectedCallback(): Promise<void> {
    window.addEventListener('resize', this.handleWindowResize);
    this.fontResolver.suggestBaseUrl(this.getAttribute('fonts'));
    this.unsubscribeFonts ??= this.fontResolver.onChange((families) => this.onFontsResolved(families));
    this.unsubscribeLang ??= onBrowserLangChange(() => { if (this.initialized && !this.hasAttribute('lang')) void this.updateChrome(); });
    if (this.initialized) this.startCaret();
    // reconectado: as barras voltam (no disconnect elas se desmontam inteiras)
    if (this.initialized && !this.chromeSync && (this.topbar || this.bottombar)) void this.updateChrome();
    if (!this.hasAttribute('manual-init')) await this.initialize();
  }

  disconnectedCallback(): void {
    this.unsubscribeFonts?.();
    this.unsubscribeFonts = null;
    this.unsubscribeLang?.();
    this.unsubscribeLang = null;
    window.removeEventListener('resize', this.handleWindowResize);
    window.clearInterval(this.caretTimer);
    this.caretTimer = 0;
    // revisão: solta a referência ao motor compartilhado (cai com o último app)
    this.spell?.dispose();
    this.spell = null;
    this.spellEngine?.dispose();
    this.spellEngine = null;
    // barras: tira intervalos e ouvintes em document/window (o elemento pode ser coletado)
    if (this.chromeSync) {
      this.chromeSync = null;
      void import('./chrome.js').then((m) => { if (!this.isConnected) m.teardownChrome(this); });
    }
  }

  /**
   * Inicializa o componente. Com fonts + document em memória, não executa
   * nenhum fetch e funciona em apps estáticos, Electron e WebViews offline.
   */
  async initialize(options: UniversalWriteInitializeOptions = {}): Promise<void> {
    if (this.initialized) return;
    if (!this.initialization) {
      this.initialization = this.initializeInternal(options).catch((error: unknown) => {
        this.initialization = null;
        throw error;
      });
    }
    await this.initialization;
  }

  private async initializeInternal(options: UniversalWriteInitializeOptions): Promise<void> {
    const suppliedFonts = options.fonts ?? this.fontAssets;
    const assets = suppliedFonts ?? await this.fetchDefaultFontAssets();
    await this.installFontAssets(assets);

    const source = options.document ?? this.documentSource;
    if (source) this.loadDocumentSource(source);
    else {
      const src = this.getAttribute('src');
      if (src) {
        const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
        this.loadDocx(bytes);
      } else this.newDocument();
    }

    this.initialized = true;
    if (this.isConnected) this.startCaret();
    if (this.topbar || this.bottombar) void this.updateChrome();
    this.dispatchEvent(new CustomEvent('uw-ready', {
      detail: { offline: suppliedFonts !== undefined, plugins: this.pluginIds() },
    }));
  }

  private loadDocumentSource(source: UniversalWriteDocumentSource): void {
    if ((source.format ?? 'docx') === 'odt') {
      this.loadOdt(source.bytes, { protected: source.protected });
    } else {
      this.loadDocx(source.bytes, { protected: source.protected });
    }
  }

  private async installFontAssets(assets: readonly UniversalWriteFontAsset[]): Promise<void> {
    const sets: Record<string, Record<FontVariant, SfntFont>> = {};
    this.fontBytes = {};
    for (const asset of assets) {
      const bytes = asset.data instanceof Uint8Array
        ? asset.data
        : new Uint8Array(asset.data);
      const weight = asset.weight ?? (asset.variant === 'bold' || asset.variant === 'boldItalic' ? '700' : '400');
      const style = asset.style ?? (asset.variant === 'italic' || asset.variant === 'boldItalic' ? 'italic' : 'normal');
      const faceBytes = bytes.slice().buffer;
      const face = new FontFace(asset.family, faceBytes, { weight, style });
      document.fonts.add(await face.load());
      this.loadedFamilyNames.add(asset.family);
      sets[asset.family] ??= {} as Record<FontVariant, SfntFont>;
      const font = new SfntFont(bytes);
      if (asset.advances) font.setAdvanceTable(asset.advances);
      sets[asset.family]![asset.variant] = font;
      this.fontFiles.set(font, { name: asset.family, bytes });
      (this.fontBytes[asset.family] ??= {})[asset.variant] = bytes;
    }
    const def = sets[DEFAULT_FONT];
    if (!def?.regular || !def.bold || !def.italic || !def.boldItalic) {
      throw new Error(`initialize(): provide the four ${DEFAULT_FONT} font variants`);
    }
    this.fonts = new Registry(sets, (family) => this.applyResolvedFont(family), (family, v) => this.requestFace(family, v));
  }

  private async fetchDefaultFontAssets(): Promise<UniversalWriteFontAsset[]> {
    const fontsBase = this.getAttribute('fonts') ?? '';
    const files: [string, string, FontVariant][] = [
      // PADRÃO (open, sempre versionada) — Liberation Sans
      [DEFAULT_FONT, 'liberationsans-regular.ttf', 'regular'],
      [DEFAULT_FONT, 'liberationsans-bold.ttf', 'bold'],
      [DEFAULT_FONT, 'liberationsans-italic.ttf', 'italic'],
      [DEFAULT_FONT, 'liberationsans-bolditalic.ttf', 'boldItalic'],
      // Proprietárias — OPCIONAIS: presentes só no dev local; puladas (404) na
      // build/CI e em produção, onde tudo cai no fallback Liberation Sans.
      ['Aptos', 'aptos-regular.ttf', 'regular'],
      ['Aptos', 'aptos-bold.ttf', 'bold'],
      ['Aptos', 'aptos-italic.ttf', 'italic'],
      ['Aptos', 'aptos-bolditalic.ttf', 'boldItalic'],
      ['Calibri', 'calibri.ttf', 'regular'],
      ['Calibri', 'calibrib.ttf', 'bold'],
      ['Calibri', 'calibrii.ttf', 'italic'],
      ['Calibri', 'calibriz.ttf', 'boldItalic'],
    ];
    const tableName = (family: string, variant: FontVariant): string => {
      const prefix = family.toLowerCase().replace(/\s+/g, '');
      const suffix = variant === 'regular' ? '' : variant === 'boldItalic' ? '-bolditalic' : `-${variant}`;
      return `${prefix}${suffix}-advances.json`;
    };
    const assets = await Promise.all(files.map(async ([family, file, variant]) => {
      const resp = await fetch(`${fontsBase}/${file}`).catch(() => null);
      if (!resp?.ok) return null; // fonte ausente (ex.: proprietária no CI): pula
      const data = new Uint8Array(await resp.arrayBuffer());
      let advances: Record<string, Record<string, number>> | undefined;
      try {
        const r = await fetch(`${fontsBase}/${tableName(family, variant)}`);
        if (r.ok) advances = await r.json() as Record<string, Record<string, number>>;
      } catch { /* tabela opcional: SfntFont usa métricas lineares */ }
      return { family, variant, data, advances };
    }));
    return assets.filter((a) => a !== null) as UniversalWriteFontAsset[];
  }

  /** Instala um plugin na instância (sem registro global e sem backend). */
  use(plugin: UniversalWritePlugin): void {
    if (!plugin.id.trim()) throw new Error('plugin.id is required');
    if (this.plugins.has(plugin.id)) throw new Error(`plugin already installed: ${plugin.id}`);
    for (const renderer of plugin.inlineRenderers ?? []) {
      if (!/^[a-zA-Z0-9._-]+$/.test(renderer.type)) {
        throw new Error(`invalid inline type: ${renderer.type}`);
      }
      const current = this.inlineRenderers.get(renderer.type);
      if (current) {
        throw new Error(`inline "${renderer.type}" already registered by ${current.owner}`);
      }
    }
    this.plugins.set(plugin.id, plugin);
    for (const renderer of plugin.inlineRenderers ?? []) {
      this.inlineRenderers.set(renderer.type, { owner: plugin.id, renderer });
    }
    try {
      const cleanup = plugin.setup?.({ editor: this });
      if (cleanup) this.pluginCleanups.set(plugin.id, cleanup);
    } catch (error) {
      this.plugins.delete(plugin.id);
      for (const [type, entry] of this.inlineRenderers) {
        if (entry.owner === plugin.id) this.inlineRenderers.delete(type);
      }
      throw error;
    }
    if (this.model) this.refresh();
    this.dispatchEvent(new CustomEvent('uw-plugin-added', { detail: { id: plugin.id } }));
  }

  /** Remove o plugin e seus renderers; o conteúdo permanece com fallback textual. */
  unuse(id: string): boolean {
    if (!this.plugins.has(id)) return false;
    try {
      this.pluginCleanups.get(id)?.();
    } finally {
      this.pluginCleanups.delete(id);
      this.plugins.delete(id);
      for (const [type, entry] of this.inlineRenderers) {
        if (entry.owner === id) this.inlineRenderers.delete(type);
      }
    }
    if (this.model) this.refresh();
    this.dispatchEvent(new CustomEvent('uw-plugin-removed', { detail: { id } }));
    return true;
  }

  pluginIds(): string[] { return [...this.plugins.keys()]; }

  /** Insere um inline atômico na seleção atual. */
  insertCustomInline<T>(
    type: string,
    data: T,
    options: { fallbackText?: string } = {},
  ): void {
    if (!this.model || this.locked()) return;
    const renderer = this.inlineRenderers.get(type)?.renderer as UniversalWriteInlineRenderer<T> | undefined;
    const fallbackText = options.fallbackText ?? renderer?.toText?.(data) ?? String(data ?? '');
    this.snapshot();
    if (this.hasSelection()) {
      const deleted = this.deleteSelection();
      this.selection = { anchor: deleted, focus: deleted };
    }
    const props = { ...(this.pendingProps ?? this.currentProps()) };
    const pos = insertRun(this.model, this.selection.focus, {
      text: '\uFFFC',
      props,
      custom: { type, data, fallbackText },
    });
    this.pendingProps = null;
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
    this.dispatchEvent(new CustomEvent('uw-custom-inline-inserted', {
      detail: { type, data, fallbackText },
    }));
  }

  // ───────── Modo de Exibição Protegido (mecânica do app de referência) ─────────
  /** Arquivos abertos entram protegidos: leitura até "Habilitar Edição". */
  private protectedMode = false;

  isProtected(): boolean { return this.protectedMode; }

  enableEditing(): void {
    if (!this.protectedMode) return;
    this.protectedMode = false;
    this.dispatchEvent(new CustomEvent('uw-protected', {
      detail: { active: false, hasFields: this.hasExternalFields() },
    }));
    this.refreshView();
    this.focusEditor();
  }

  /** Campos que podem referenciar outros componentes (TOC/PAGE/DATE...). */
  hasExternalFields(): boolean {
    if (!this.model) return false;
    return this.model.paragraphs.some(
      (p) => p.props.tocInstr || p.props.tocEntry || p.runs.some((r) => r.field),
    );
  }

  /** Edição bloqueada? (modo protegido ou visão de leitura) */
  private locked(): boolean {
    return this.protectedMode || this.view === 'read';
  }

  /** Carrega um .docx (bytes). opts.protected = decisão pelo critério do
   *  app de referência: Mark-of-the-Web (Electron lê o Zone.Identifier real; browser usa
   *  Trusted Documents). Default: protegido (conservador). */
  /** Formato do documento carregado (usado por save('auto')). */
  private loadedFormat: 'docx' | 'odt' = 'docx';

  /**
   * Carrega um documento. Com format='auto' (padrão) detecta docx vs odt pelos
   * bytes. É a API única de carga (loadDocx/loadOdt são internos).
   */
  load(bytes: Uint8Array, format: FileFormat = 'auto', opts: { protected?: boolean } = {}): void {
    const fmt = format === 'auto' ? this.detectFormat(bytes) : format;
    if (fmt === 'odt') this.loadOdt(bytes, opts);
    else this.loadDocx(bytes, opts); // docx (e fallback p/ formatos não-importáveis)
  }

  /** Detecta o formato pelos bytes: docx e odt são ZIP; o odt guarda o mimetype
   *  "…opendocument.text" logo no início. */
  private detectFormat(bytes: Uint8Array): 'docx' | 'odt' {
    const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 2000)));
    return head.includes('opendocument.text') ? 'odt' : 'docx';
  }

  loadDocx(bytes: Uint8Array, opts: { protected?: boolean } = {}): void {
    this.protectedMode = opts.protected ?? true;
    // .doc (Word 97-2003): convertido para .docx na carga — salva como .docx
    if (isWordBinary(bytes)) bytes = convertDocToDocx(bytes);
    this.pkg = DocxPackage.load(bytes);
    this.loadedBytes = bytes;
    this.fontEmbedding = { ...DEFAULT_EMBEDDING.write, ...readDocxEmbedding(this.pkg).settings };
    // com a fonte XML original: o salvar devolve cru tudo o que não for editado
    this.fullDoc = readFullDocument(this.pkg, { sources: true });
    this.docStyles = new DocStyles(this.pkg.getPartText(stylesPartPath(this.pkg)) ?? null);
    this.loadedFormat = 'docx';
    this.installFullDoc();
    void this.registerEmbeddedFonts(this.pkg); // fontes embedadas → FontFace + métricas
  }

  /** Carrega as fontes EMBEDADAS do .docx (word/fonts/*.odttf desofuscadas): cria
   *  o FontFace (render) e o SfntFont (métricas/layout), e repinta ao terminar.
   *  Sem isto o render cairia no Aptos/Calibri em vez da fonte real (ex.: Lato). */
  private async registerEmbeddedFonts(pkg: DocxPackage): Promise<void> {
    let fonts;
    try { fonts = readEmbeddedFonts(pkg); } catch { return; }
    if (!fonts.length || !this.fonts) return;
    let added = false;
    for (const f of fonts) {
      if (this.loadedFamilies.has(`${f.family} ${f.variant}`)) continue;
      const weight = f.variant === 'bold' || f.variant === 'boldItalic' ? '700' : '400';
      const style = f.variant === 'italic' || f.variant === 'boldItalic' ? 'italic' : 'normal';
      try {
        const face = new FontFace(f.family, f.data.slice().buffer, { weight, style });
        await face.load();
        document.fonts.add(face);
      } catch { continue; } // fonte inválida: ignora (mantém fallback)
      this.loadedFamilies.add(`${f.family} ${f.variant}`);
      this.loadedFamilyNames.add(f.family);
      try {
        const sf = new SfntFont(f.data);
        this.fonts.register(f.family, f.variant, sf);
        this.fontFiles.set(sf, { name: f.family, bytes: f.data });
      } catch { /* métrica opcional */ }
      (this.fontBytes[f.family] ??= {})[f.variant] = f.data;
      added = true;
    }
    if (added && this.model) this.refresh();
  }

  /**
   * Carrega um .odt (OpenDocument Text). Não há pacote OOXML original — ao
   * salvar como .docx o pkg é criado do zero (DocxPackage.empty()).
   */
  loadOdt(bytes: Uint8Array, opts: { protected?: boolean } = {}): void {
    this.protectedMode = opts.protected ?? false; // .odt não tem MOTW: confiança padrão
    this.pkg = null;
    this.fontEmbedding = { ...DEFAULT_EMBEDDING.write };
    this.fullDoc = readOdt(bytes);
    this.docStyles = new DocStyles(null);
    this.loadedBytes = null;
    this.loadedFormat = 'odt';
    this.installFullDoc();
  }

  /**
   * Salva/exporta o documento no formato pedido. Com format='auto' (padrão)
   * usa o formato originalmente carregado (docx ou odt). API única de saída —
   * retorna Uint8Array (docx/odt/pdf/xps) ou string (html/markdown).
   */
  async save(
    format: FileFormat = 'auto',
    opts: { images?: boolean; title?: string } = {},
  ): Promise<Uint8Array | string> {
    const embed = opts.images !== false; // por padrão embute as imagens
    const fmt = format === 'auto' ? this.loadedFormat : format;
    switch (fmt) {
      case 'odt': return this.exportOdt({ images: embed ? 'embed' : 'omit' });
      case 'pdf': return this.exportPdf();
      case 'html': return this.exportHtml(opts.title, { images: embed ? 'data' : 'omit' });
      case 'markdown': return this.exportMarkdown(opts.title, { images: embed ? 'data' : 'omit' });
      case 'xps': return this.exportXps();
      case 'docx':
      default: return this.saveDocxWithFonts();
    }
  }

  // ───────────────────────── fontes no arquivo ─────────────────────────

  /** Opção "incorporar fontes no arquivo" deste documento. */
  getFontEmbedding(): FontEmbeddingSettings {
    return { ...this.fontEmbedding };
  }

  /** Muda a opção (vale no próximo salvar .docx; marca o documento como alterado). */
  setFontEmbedding(settings: Partial<FontEmbeddingSettings>): void {
    this.fontEmbedding = { ...this.fontEmbedding, ...settings };
    this.dispatchEvent(new CustomEvent('uw-change'));
  }

  /**
   * Salva o .docx aplicando a opção de fontes (resolvedor único + gravação em
   * shared/fonts): ligada, acrescenta as famílias usadas que ainda não estão
   * no arquivo; desligada, tira as incorporadas — como o Word. O que ficou de
   * fora (fonte comum, licença, sem o arquivo) vai no evento
   * `uw-font-embedding` (detail: EmbeddingPlan resumido).
   */
  async saveDocxWithFonts(): Promise<Uint8Array> {
    const pkg = DocxPackage.load(this.saveDocx());
    const settings = this.fontEmbedding;
    let plan: EmbeddingPlan = { faces: [], skipped: [] };
    if (settings.embed) {
      plan = await planFontEmbedding(this.fontResolver, this.fontUsage(), settings, 'write', {
        documentFace: (family, v) => this.fontBytes[family]?.[v],
        alreadyEmbedded: readDocxEmbedding(pkg).embedded,
      });
    }
    writeDocxEmbedding(pkg, plan, settings);
    this.dispatchEvent(new CustomEvent('uw-font-embedding', {
      detail: {
        embedded: [...new Set(plan.faces.map((f) => f.family))],
        skipped: plan.skipped.filter((s) => s.reason !== 'already-embedded'),
      },
    }));
    return pkg.save();
  }

  /** Famílias/variantes/texto que o documento usa — a MESMA resolução do layout
   *  (buildSpans): corpo, tabelas, cabeçalhos/rodapés e caixas de texto. */
  private fontUsage(): FontUsage[] {
    const out: FontUsage[] = [];
    const paras = (ps: readonly Paragraph[] | undefined): void => {
      for (const p of ps ?? []) {
        for (const s of this.buildSpans(p)) if (s.family && s.text) out.push({ family: s.family, variants: [s.variant], text: s.text });
        for (const r of p.runs) if (r.textbox) paras(r.textbox.paras);
      }
    };
    const table = (t: TableBlock): void => {
      for (const row of t.rows) for (const c of row.cells) { paras(c.paragraphs); c.tables.forEach(table); }
    };
    paras(this.model?.paragraphs);
    for (const a of this.tableAnchors) table(a.table);
    for (const sec of this.fullDoc?.sections ?? []) {
      for (const set of [sec.headers, sec.footers]) { paras(set.default); paras(set.first); paras(set.even); }
    }
    return out;
  }

  /** Comum entre loadDocx e loadOdt — popula model/sections/floatImages a
   *  partir de this.fullDoc e dispara uw-protected. */
  private installFullDoc(): void {
    if (!this.fullDoc) throw new Error('installFullDoc without fullDoc');
    this.resetEngineState();
    // achatamento p/ edição: parágrafos top-level na ordem dos blocos;
    // tabelas viram âncoras "antes do parágrafo N"
    const paragraphs: Paragraph[] = [];
    this.tableAnchors = [];
    const paraOfBlock: number[] = [];
    for (const block of this.fullDoc.blocks) {
      paraOfBlock.push(paragraphs.length);
      if (block.type === 'paragraph') paragraphs.push(block.paragraph);
      else this.tableAnchors.push({ beforePara: paragraphs.length, table: block });
    }
    if (paragraphs.length === 0) paragraphs.push({ runs: [], props: {} });
    // indicadores (REF/PAGEREF/links internos): bloco → parágrafo, deslocado
    // nas edições como as âncoras de tabela
    for (const [name, b] of this.fullDoc.bookmarks ?? []) {
      this.bookmarkParas.set(name, Math.min(paraOfBlock[b] ?? paragraphs.length - 1, paragraphs.length - 1));
    }
    // a edição (dividir/apagar runs) perde o w:rPr original: as props levam
    // uma referência a ele (ver syncRunRPr)
    this.syncRunRPr(paragraphs);
    for (const a of this.tableAnchors) this.syncTableRPr(a.table);
    for (const s of this.fullDoc.sections) {
      for (const set of [s.headers, s.footers]) for (const ps of [set.default, set.first, set.even]) if (ps) this.syncRunRPr(ps);
    }

    // o ÚLTIMO parágrafo de cada seção (exceto a final) leva sectionBreak, para
    // que o salvar preserve as seções + orientação + refs de header/footer; as
    // seções do editor são derivadas desses sectionBreak (syncSections)
    markSectionBreaks(this.fullDoc);
    const secs = this.fullDoc.sections;
    this.resetSections();
    for (const s of secs) this.indexHfParts(s);
    for (const p of paragraphs) {
      const sb = p.props.sectionBreak;
      if (!sb) continue;
      sb.id = this.nextSectionId++;
      this.sectionProps.set(sb.id, secs.find((s) => s.sectPr === sb.sectPr)?.sect);
    }
    const lastSec = secs[secs.length - 1];
    this.sectionProps.set(0, lastSec?.sect);

    // pré-processa runs: campos DATE viram texto; noteRef ganha o número;
    // imagens flutuantes saem do fluxo
    this.floatImages = [];
    paragraphs.forEach((p, pi) => {
      for (const run of p.runs) {
        if (run.field && run.text === '') {
          if (/DATE/i.test(run.field)) {
            run.text = new Date().toLocaleDateString('pt-BR');
          } else if (/PAGE/i.test(run.field)) {
            run.text = '1';
          }
        }
        if (run.noteRef && run.text === '') run.text = String(run.noteRef.id);
        if (run.image?.floating) this.floatImages.push({ para: pi, run });
      }
    });

    this.model = {
      paragraphs,
      // o sectPr do corpo é o da ÚLTIMA seção (como no .docx)
      sectPr: lastSec?.sectPr ?? {
        pageWidthTwips: 11906, pageHeightTwips: 16838,
        marginLeftTwips: 1701, marginRightTwips: 1701,
        marginTopTwips: 1417, marginBottomTwips: 1417,
      },
      ...(lastSec ? { bodyRefs: refsOfSection(lastSec) } : {}),
    };
    this.syncSections();
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.editsSinceLoad = 0;
    // linha de base do salvamento sem perdas: o documento como instalado
    this.fullDoc.sources?.baseline();
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-protected', {
      detail: { active: this.protectedMode, hasFields: this.hasExternalFields() },
    }));
  }

  /** Documento novo como o Word grava um em branco: estilos (Normal, títulos,
   *  citações… e os latentes), tema do Office, configurações e A4 com margens
   *  3/2,5 cm (docx-core/blank.ts, medido no oráculo). */
  newDocument(): void {
    this.protectedMode = false; // documento novo nasce editável
    this.loadedBytes = null;
    this.loadedFormat = 'docx';
    this.pkg = blankDocxPackage();
    this.fontEmbedding = { ...DEFAULT_EMBEDDING.write };
    this.fullDoc = readFullDocument(this.pkg, { sources: true });
    this.docStyles = new DocStyles(this.pkg.getPartText('word/styles.xml') ?? null);
    this.installFullDoc();
  }

  setDarkPage(dark: boolean): void {
    this.pageDark = dark;
    this.classList.toggle('page-dark', dark); // fundo do desk (web/draft) segue a página
    this.refreshView();
    // refresh só repinta páginas RECÉM-alocadas. Trocar de tema afeta TODAS
    // as canvases já pintadas (texto, sombreado, bordas), então força repaint.
    this.paint();
  }

  /**
   * Cor "efetiva" para o canvas no tema escuro total: inverte a LUMINOSIDADE
   * (HSL: L = 100-L) preservando matiz e saturação. Preto vira branco, branco
   * vira preto, cinza claro vira cinza escuro, azul claro vira azul escuro etc.
   *
   * Não toca PDF/XPS/HTML/Markdown/ODT — esses são SAÍDA do documento e devem
   * manter as cores originais; o tema escuro é só renderização local no canvas.
   *
   * Aceita "RRGGBB" (sem #) ou "#RRGGBB". Retorna sempre "#RRGGBB" pronto p/
   * `ctx.fillStyle`/`strokeStyle`.
   */
  private inkColor(hex: string | undefined, fallbackLight = '#000', fallbackDark = '#e8eaed'): string {
    if (!hex) return this.pageDark ? fallbackDark : fallbackLight;
    const h = hex.startsWith('#') ? hex.slice(1) : hex;
    if (!this.pageDark) return `#${h}`;
    if (h.length !== 6) return `#${h}`;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let hh = 0, s = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: hh = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: hh = ((b - r) / d + 2) / 6; break;
        case b: hh = ((r - g) / d + 4) / 6; break;
      }
    }
    const lInv = 1 - l;
    const c = (1 - Math.abs(2 * lInv - 1)) * s;
    const x = c * (1 - Math.abs(((hh * 6) % 2) - 1));
    const m = lInv - c / 2;
    let rr = 0, gg = 0, bb = 0;
    const seg = Math.floor(hh * 6);
    if (seg === 0) { rr = c; gg = x; }
    else if (seg === 1) { rr = x; gg = c; }
    else if (seg === 2) { gg = c; bb = x; }
    else if (seg === 3) { gg = x; bb = c; }
    else if (seg === 4) { rr = x; bb = c; }
    else { rr = c; bb = x; }
    const toHex = (v: number): string => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
  }

  // ───────────────── edição de cabeçalho/rodapé ─────────────────
  private hfEdit: { kind: 'header' | 'footer'; path: string } | null = null;
  private dirtyHf = new Set<string>();
  private savedBody: {
    model: DocumentModel;
    tableAnchors: { beforePara: number; table: TableBlock }[];
    sectionStarts: { startPara: number; section: Section }[];
    floatImages: FloatImage[];
    selection: { anchor: DocPosition; focus: DocPosition };
    undoStack: string[];
    redoStack: string[];
    pageCount: number;
    pageSections: number[];
  } | null = null;
  /** Página onde o HF está sendo editado (preserva a paginação do corpo). */
  private hfActivePage = 0;

  // ─────────────── edição de caixa de texto flutuante ───────────────
  // Foco numa caixa de texto (wps:txbx): troca this.model para os parágrafos
  // INTERNOS da caixa, posicionados no retângulo ancorado. Pode empilhar sobre
  // a edição de HF (a caixa mora no header/footer) ou sair direto do corpo.
  private tbEdit: {
    hostRun: Run;
    rectTwips: { x: number; y: number; w: number; h: number };
    pageIdx: number;
  } | null = null;
  private savedForTb: {
    model: DocumentModel;
    tableAnchors: { beforePara: number; table: TableBlock }[];
    sectionStarts: { startPara: number; section: Section }[];
    floatImages: FloatImage[];
    selection: { anchor: DocPosition; focus: DocPosition };
    undoStack: string[];
    redoStack: string[];
    pageCount: number;
    pageSections: number[];
  } | null = null;
  private tbBgSnapshots: HTMLCanvasElement[] = [];
  /** Ao capturar o snapshot de fundo da edição de caixa: run cujo textbox NÃO é
   *  pintado (será desenhado ao vivo em foco), evitando texto "fantasma". */
  private tbSnapshotSuppress: Run | null = null;

  // ─────────── seleção/manipulação de objeto flutuante (imagem/caixa) ───────────
  /** Run que carrega o objeto flutuante SELECIONADO (mostra handles). */
  private floatSel: Run | null = null;
  /** Estado do arrasto de mover/redimensionar em andamento. */
  private floatDrag: {
    mode: 'move' | 'resize';
    handle: string;                 // 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w' (move: '')
    startClientX: number; startClientY: number;
    startW: number; startH: number; // twips
    startOX: number; startOY: number; // twips
    aspect: number;                 // w/h (imagem: trava aspecto no canto)
    page: number;
    moved: boolean;
  } | null = null;

  editingHeaderFooter(): 'header' | 'footer' | null {
    return this.hfEdit?.kind ?? null;
  }
  /** true quando o foco está DENTRO de uma caixa de texto. */
  editingTextbox(): boolean { return this.tbEdit !== null; }

  enterHeaderFooter(kind: 'header' | 'footer', activePage = 0): void {
    if (!this.model || this.hfEdit || this.locked()) return;
    if (this.cellEdit) { this.exitCell(); this.refreshSelection(); }
    this.floatSel = null;
    this.hfActivePage = Math.max(0, Math.min(activePage, this.pageCount - 1));
    // garante fullDoc mínimo em documentos novos
    if (!this.fullDoc) {
      this.fullDoc = {
        blocks: [], sections: [{
          sectPr: this.model.sectPr, blockStart: 0, blockEnd: 0,
          headers: {}, footers: {}, headerRefs: [], footerRefs: [],
        }],
        footnotes: new Map(), endnotes: new Map(), comments: [], styles: new Map(),
        bookmarks: new Map(),
      };
    }
    // seção da PÁGINA ATIVA (não sempre a 1ª) — espelha o paint
    const sIdx = this.pageSections[this.hfActivePage] ?? 0;
    const fd = this.fullDoc;
    let sec = this.sectionStarts[sIdx]?.section ?? fd.sections[0]!;
    // PARTE exibida nesta página (espelha o paint): a 1ª página usa a 'first'
    // (se existir); as demais usam a 'default'. Editar a parte correta evita que
    // a edição do cabeçalho da capa altere o cabeçalho do resto do documento.
    let partType: HfKind = this.hfActivePage === 0 && (kind === 'header' ? sec.headers : sec.footers).first ? 'first' : 'default';
    // motor: a variante que a página usou (primeira/par/padrão) e a seção que
    // a DEFINE (herdada das anteriores, como o Word: editar vale para todas)
    const engPart = this.eng ? this.hfPartOfPage(kind, this.hfActivePage) : null;
    if (engPart) ({ section: sec, type: partType } = engPart);
    const set = kind === 'header' ? sec.headers : sec.footers;
    const refs = kind === 'header' ? sec.headerRefs : sec.footerRefs;
    if (!set[partType]) set[partType] = [{ runs: [], props: {} }];
    const part = set[partType]!;
    // materializa o texto dos campos (PAGE/NUMPAGES/DATE) sem cache p/ que
    // fiquem visíveis e editáveis; o .field é preservado para o salvar
    for (const p of part) {
      for (const run of p.runs) {
        if (run.field && !run.text.trim()) {
          run.text = /NUMPAGES/i.test(run.field) ? String(this.numPagesFor())
            : /PAGE/i.test(run.field) ? String(this.pageNumberFor(this.hfActivePage))
            : /DATE/i.test(run.field) ? new Date().toLocaleDateString('pt-BR')
            : run.field.trim();
        }
      }
    }
    let ref = refs.find((r) => r.type === partType);
    if (!ref) {
      ref = { type: partType, rid: `rIdWn${kind}${partType}`, path: `word/uw-${kind}-${partType}.xml` };
      refs.push(ref);
      this.dirtyHf.add(ref.path); // parte nova: sempre gravar
    }
    this.registerHfPart(sec, kind, ref, part);
    // Layout legado: fundo esmaecido = SÓ o CORPO (ambos HF suprimidos; header
    // e footer são repintados na composição da edição). Fundo TRANSPARENTE p/
    // compor sobre a imagem behindDoc (capa) sem véu branco. Ver
    // paintHfEditCompose. Com o motor não há instantâneo: ele diagrama o
    // documento inteiro com o cabeçalho/rodapé editado e pinta o corpo esmaecido.
    if (!engPart) {
      this.hfCapturing = true;
      this.paint();
      this.hfBodySnapshots = this.canvases.map((c) => {
        const snap = document.createElement('canvas');
        snap.width = c.width; snap.height = c.height;
        if (c.width > 1) snap.getContext('2d')!.drawImage(c, 0, 0);
        return snap;
      });
      this.hfCapturing = false;
    }
    this.savedBody = {
      model: this.model,
      tableAnchors: this.tableAnchors,
      sectionStarts: this.sectionStarts,
      floatImages: this.floatImages,
      selection: this.selection,
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      pageCount: this.pageCount,
      pageSections: [...this.pageSections],
    };
    // o array de parágrafos do cabeçalho É o modelo agora (mesmas referências
    // — edições refletem no fullDoc e na pintura do corpo ao sair).
    // A PAGINAÇÃO do corpo é preservada: o nº de páginas/panes não muda.
    this.model = { paragraphs: part, sectPr: this.savedBody.model.sectPr };
    this.tableAnchors = [];
    this.sectionStarts = [];
    this.floatImages = [];
    this.hfEdit = { kind, path: ref.path };
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-hfmode', { detail: { active: true, kind } }));
  }

  exitHeaderFooter(): void {
    if (this.tbEdit) this.exitTextbox(); // caixa aninhada no HF: sai dela antes
    if (!this.hfEdit || !this.savedBody) return;
    this.floatSel = null;
    this.hfBodySnapshots = [];
    this.model = this.savedBody.model;
    this.tableAnchors = this.savedBody.tableAnchors;
    this.sectionStarts = this.savedBody.sectionStarts;
    this.floatImages = this.savedBody.floatImages;
    this.selection = this.savedBody.selection;
    this.undoStack = this.savedBody.undoStack;
    this.redoStack = this.savedBody.redoStack;
    this.savedBody = null;
    this.hfEdit = null;
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-hfmode', { detail: { active: false } }));
  }

  /** Entra na edição do conteúdo de uma caixa de texto flutuante. hostRun é o
   *  run que carrega `.textbox`; rectTwips é o retângulo ancorado (coords de
   *  página, twips); caret opcional posiciona o cursor no ponto do clique. */
  private enterTextbox(
    hostRun: Run,
    rectTwips: { x: number; y: number; w: number; h: number },
    pageIdx: number,
    caret?: DocPosition,
  ): void {
    if (!this.model || !hostRun.textbox || this.tbEdit || this.locked()) return;
    if (this.cellEdit) { this.exitCell(); this.refreshSelection(); }
    this.floatSel = null;
    const tb = hostRun.textbox;
    // materializa campos (PAGE/NUMPAGES/DATE) p/ ficarem visíveis e editáveis;
    // o .field é preservado para o salvar (ver serialização de campo).
    for (const p of tb.paras) {
      for (const run of p.runs) {
        if (run.field && !run.text.trim()) {
          run.text = /NUMPAGES/i.test(run.field) ? String(this.numPagesFor())
            : /PAGE/i.test(run.field) ? String(this.pageNumberFor(pageIdx))
            : /DATE/i.test(run.field) ? new Date().toLocaleDateString('pt-BR')
            : run.field.trim();
        }
      }
    }
    // fundo = render ATUAL (corpo, ou HF em edição) capturado cheio, MAS sem o
    // texto DESTA caixa (senão o texto antigo "fantasma" apareceria por baixo do
    // texto ao vivo). Na pintura fica esmaecido; a caixa ativa é reposta em foco.
    this.tbSnapshotSuppress = hostRun;
    this.paint();
    this.tbSnapshotSuppress = null;
    this.tbBgSnapshots = this.canvases.map((c) => {
      const snap = document.createElement('canvas');
      snap.width = c.width; snap.height = c.height;
      if (c.width > 1) snap.getContext('2d')!.drawImage(c, 0, 0);
      return snap;
    });
    this.savedForTb = {
      model: this.model,
      tableAnchors: this.tableAnchors,
      sectionStarts: this.sectionStarts,
      floatImages: this.floatImages,
      selection: this.selection,
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      pageCount: this.pageCount,
      pageSections: [...this.pageSections],
    };
    // os parágrafos da caixa VIRAM o modelo (mesmas referências → edições
    // refletem no textbox e, ao sair, no render normal). Paginação preservada.
    this.model = { paragraphs: tb.paras, sectPr: this.savedForTb.model.sectPr };
    this.tableAnchors = [];
    this.sectionStarts = [];
    this.floatImages = [];
    this.tbEdit = { hostRun, rectTwips, pageIdx };
    const start = caret ?? { para: 0, offset: 0 };
    this.selection = { anchor: start, focus: start };
    this.undoStack = [];
    this.redoStack = [];
    // caixa dentro de HF: garante que a parte do HF será regravada no save
    if (this.hfEdit) this.dirtyHf.add(this.hfEdit.path);
    this.refresh();
    this.focusEditor();
    this.dispatchEvent(new CustomEvent('uw-tbmode', { detail: { active: true } }));
  }

  exitTextbox(): void {
    if (!this.tbEdit || !this.savedForTb) return;
    // a caixa pode ter ganho/perdido parágrafos: os blocos (que o motor lê) acompanham
    const tbx = this.tbEdit.hostRun.textbox;
    if (tbx?.blocks) tbx.blocks = reconcileBlocks(tbx.blocks, tbx.paras, true);
    this.tbBgSnapshots = [];
    this.model = this.savedForTb.model;
    this.tableAnchors = this.savedForTb.tableAnchors;
    this.sectionStarts = this.savedForTb.sectionStarts;
    this.floatImages = this.savedForTb.floatImages;
    this.selection = this.savedForTb.selection;
    this.undoStack = this.savedForTb.undoStack;
    this.redoStack = this.savedForTb.redoStack;
    this.savedForTb = null;
    this.tbEdit = null;
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-tbmode', { detail: { active: false } }));
  }

  /** Desloca âncoras de tabela quando parágrafos entram/saem (as seções saem do
   *  modelo — syncSections). */
  private shiftAnchors(fromPara: number, delta: number): void {
    // na célula de tabela os parágrafos são os DELA: âncoras do corpo ficam
    if (this.cellEdit) return;
    for (const a of this.tableAnchors) if (a.beforePara > fromPara) a.beforePara += delta;
    for (const f of this.floatImages) if (f.para > fromPara) f.para += delta;
    if (!this.hfEdit && !this.tbEdit) {
      for (const [k, v] of this.bookmarkParas) if (v > fromPara) this.bookmarkParas.set(k, Math.max(0, v + delta));
    }
  }

  // ───────────────────────── API pública ─────────────────────────

  setView(v: ViewMode): void {
    const prev = this.view;
    if (this.cellEdit && v !== 'print') this.exitCell();
    const z0 = this.zoom;
    if (v === 'read' && prev !== 'read') this.zoomBeforeRead = this.zoom;
    this.view = v;
    this.classList.remove('view-print', 'view-web', 'view-draft', 'view-read', 'view-outline');
    this.classList.add(`view-${v}`);
    if (v === 'read') { this.readFirstPage = 0; this.fitReadZoom(); }   // ajusta p/ caber páginas em raias
    else if (prev === 'read') this.zoom = this.zoomBeforeRead;          // restaura ao sair
    this.refresh();
    this.scrollTop = 0;
    if (this.zoom !== z0) this.dispatchEvent(new CustomEvent('uw-zoom', { detail: { zoom: this.zoom } }));
  }
  getView(): ViewMode { return this.view; }

  // ── Modo Leitura: páginas em RAIAS (N por largura), navegadas em blocos ───
  /** Zoom: N páginas cabem na LARGURA e cada uma na ALTURA (o menor dos dois). */
  private fitReadZoom(): void {
    if (!this.model) return;
    const s = this.sect();
    const pageW1 = s.pageWidthTwips * PX_PER_TWIP;
    const pageH1 = s.pageHeightTwips * PX_PER_TWIP;
    const n = this.readPagesPerView();
    const availW = (this.clientWidth || 1200) - 8;
    const availH = (this.clientHeight || 800) - 8;
    this.zoom = Math.max(0.1, Math.min(5, availW / (n * pageW1), availH / pageH1));
  }
  /** Nº de raias (páginas lado a lado) — escala com a largura: ~2 em 1440p,
   *  3 em 2560px, 4 em 4K. (largura-alvo por página ≈ 880px) */
  private readPagesPerView(): number {
    return Math.max(1, Math.round((this.clientWidth || 1200) / 880));
  }
  /** Exibe só o bloco de N páginas a partir de readFirstPage; oculta as demais. */
  private applyReadSpread(): void {
    const n = this.readPagesPerView();
    const total = this.canvases.length;
    this.readFirstPage = Math.max(0, Math.min(this.readFirstPage, Math.max(0, total - 1)));
    const a = this.readFirstPage, b = a + n;
    this.canvases.forEach((c, i) => {
      const shown = i >= a && i < b;
      c.style.display = shown ? '' : 'none';
      c.classList.toggle('read-divider', shown && i > a); // divisor só ENTRE páginas (não na 1ª)
    });
  }
  /** Navega ±1 bloco (N páginas) no modo Leitura. */
  private nudgeRead(dir: 1 | -1): void {
    const n = this.readPagesPerView();
    const total = this.canvases.length;
    let next = this.readFirstPage + dir * n;
    if (next >= total) return;            // já no fim
    next = Math.max(0, next);
    if (next === this.readFirstPage) return;
    this.readFirstPage = next;
    this.scrollTop = 0;
    this.applyReadSpread();
    this.ensureVisiblePainted();
  }

  /** Zoom 10%–500%. anchorY (px do viewport): ponto que deve ficar parado. */
  setZoom(z: number, anchorY?: number): void {
    const clamped = Math.min(5, Math.max(0.1, z));
    if (clamped === this.zoom) return;
    const old = this.zoom;
    const anchor = anchorY ?? this.clientHeight / 2;
    const docY = this.scrollTop + anchor; // ponto do documento sob a âncora
    this.zoom = clamped;
    // o layout do motor não depende do zoom: só canvases/pintura
    this.refreshView();
    this.scrollTop = (docY * clamped) / old - anchor;
    this.dispatchEvent(new CustomEvent('uw-zoom', { detail: { zoom: clamped } }));
  }
  getZoom(): number { return this.zoom; }
  toggleMarks(): boolean { this.showMarks = !this.showMarks; this.refreshView(); return this.showMarks; }

  getSelectionState(): { run: RunProps; para: ParaProps; view: ViewMode; marks: boolean; table: TableState | null } {
    const run: RunProps = { ...(this.pendingProps ?? this.currentProps()) };
    const p = this.model?.paragraphs[this.selection.focus.para];
    const st = p ? this.styleOf(p) : undefined;
    const dd = this.docDefaults();
    // props EFETIVAS: o que não está direto no run/parágrafo é herdado do
    // estilo/docDefaults, exatamente como o layout resolve. Sem isso a toolbar
    // mostra "esquerda" em parágrafos alinhados via estilo, ou fonte/tamanho em
    // BRANCO em texto sem formatação direta (o comum).
    const para: ParaProps = { ...(p?.props ?? {}) };
    if (para.alignment === undefined) para.alignment = st?.alignment;
    // com styles.xml: a cascata do motor (fontes de TEMA incluídas — "Aptos", não a substituta)
    const look = this.docStyles.xml && (run.fontAscii === undefined || run.szHalfPt === undefined)
      ? styleLook(this.docStyles, this.fullDoc?.formatting?.theme ?? emptyFormatting().theme, run.charStyle ?? p?.props.styleId ?? this.docStyles.defaultParagraph())
      : null;
    if (run.fontAscii === undefined) run.fontAscii = look?.fontFamily ?? st?.fontAscii ?? dd.run.fontAscii ?? DEFAULT_FONT;
    if (run.szHalfPt === undefined) {
      run.szHalfPt = look ? Math.round(look.sizePt * 2) : st?.sizePt !== undefined ? Math.round(st.sizePt * 2) : dd.run.szHalfPt ?? 22;
    }
    return { run, para, view: this.view, marks: this.showMarks, table: this.getTableState() };
  }

  toggleRunProp(key: 'bold' | 'italic' | 'underline' | 'strike' | 'allCaps' | 'smallCaps'): void {
    const cur = this.pendingProps ?? this.currentProps();
    this.formatRuns({ [key]: !cur[key] } as Partial<RunProps>);
  }
  toggleVertAlign(kind: 'superscript' | 'subscript'): void {
    const cur = (this.pendingProps ?? this.currentProps()).vertAlign;
    this.formatRuns({ vertAlign: cur === kind ? undefined : kind });
  }
  setFontSize(pt: number): void { this.formatRuns({ szHalfPt: Math.round(pt * 2) }); }
  growFont(delta: number): void {
    const cur = (this.pendingProps ?? this.currentProps()).szHalfPt ?? 22;
    this.formatRuns({ szHalfPt: Math.max(2, cur + delta * 2) });
  }
  setFontFamily(name: string): void {
    void this.ensureFontLoaded(name); // resolve a fonte (métricas + FontFace) se ainda não houver
    this.formatRuns({ fontAscii: name });
  }

  /** Famílias de fonte JÁ carregadas (bundled + embedadas do doc), em ordem. */
  knownFontFamilies(): string[] {
    return [...this.loadedFamilyNames].sort((a, b) => a.localeCompare(b));
  }

  /** True quando a lista de fontes do SO vem do host (sem gesto/permissão). */
  hasHostSystemFonts(): boolean {
    return this.fontResolver.hasHost;
  }

  /** Lista para o seletor: carregadas (bundled + embedadas) + as do resolvedor
   *  que o Write consegue usar COM o arquivo (host; Local Font Access se
   *  permitida; as abertas embarcadas e as que têm substituta). */
  async listAvailableFonts(): Promise<string[]> {
    const all = new Set<string>([...this.loadedFamilyNames, ...await this.fontResolver.listFamilies({ withFile: true })]);
    return [...all].sort((a, b) => a.localeCompare(b));
  }

  /** Pede a Local Font Access (Chromium) — CHAMAR NUM GESTO (ex.: abrir o
   *  seletor de fonte). Concedida, a lista ganha todas as fontes instaladas e
   *  as que estavam só pelo nome/substitutas passam a usar o arquivo real. */
  requestSystemFonts(): Promise<boolean> {
    return this.fontResolver.requestLocalAccess();
  }

  /** Resolve uma família (resolvedor único) — ao chegar, refaz layout e pintura. */
  async ensureFontLoaded(family: string): Promise<void> {
    if (!family || this.loadedFamilyNames.has(family)) return;
    await this.fontResolver.resolveWithFile([family]);
  }

  /** O resolvedor (re)resolveu famílias: atualiza as que este documento usa. */
  private onFontsResolved(families: string[]): void {
    const keys = new Set(families.map((f) => f.toLowerCase()));
    let changed = false;
    for (const u of this.askedFonts) {
      if (!keys.has(u.toLowerCase())) continue;
      // (re)aplica do zero: a resposta nova pode ter outras variantes/fonte
      this.appliedFonts.delete(u);
      this.fonts?.delete(u);
      this.applyResolvedFont(u);
      changed = true;
    }
    if (changed) this.queueRefresh();
  }

  /**
   * Registra no Registry as métricas da família vinda do resolvedor (síncrono,
   * se já resolvida; senão pede e o aviso de onChange refaz o layout). O Write
   * mede e embute com o ARQUIVO da fonte: família que o navegador só expõe pelo
   * nome vem como a substituta métrico-compatível ou o padrão (getWithFile) —
   * igual na tela e no PDF. Fonte embutida/bundled do próprio editor nunca é
   * sobreposta.
   */
  private applyResolvedFont(family: string): boolean {
    if (!this.fonts || this.loadedFamilyNames.has(family) || this.appliedFonts.has(family)) return false;
    this.askedFonts.add(family);
    const r = this.fontResolver.getWithFile(family);
    if (!r) {
      void this.fontResolver.resolveWithFile([family]);
      return false;
    }
    this.appliedFonts.add(family);
    if (r.source === 'default') return false; // o Registry já cai no padrão
    let registered = false;
    for (const v of ['regular', 'bold', 'italic', 'boldItalic'] as const) {
      const font = this.layoutFontFor(r, v);
      if (!font) continue;
      this.fonts.register(family, v, font);
      registered = true;
    }
    return registered;
  }

  /** O layout pediu uma variante que ainda não chegou (as substitutas e
   *  embarcadas baixam só a regular de início): pede os bytes dela; ao chegar,
   *  o onChange reaplica a família e refaz o layout. */
  private requestFace(family: string, v: FontVariant): void {
    if (this.loadedFamilyNames.has(family)) return;
    const r = this.fontResolver.getWithFile(family);
    if (!r || r.faces[v]) return;
    const key = `${family.toLowerCase()}|${v}`;
    if (this.faceRequests.has(key)) return;
    this.faceRequests.add(key);
    void this.fontResolver.loadFace(r, v);
  }
  private faceRequests = new Set<string>();

  private layoutFontFor(r: ResolvedFont, v: FontVariant): LayoutFont | null {
    const bytes = r.faces[v];
    if (bytes) {
      try {
        const sf = new SfntFont(bytes);
        if (r.embeddable) this.fontFiles.set(sf, { name: r.cssFamily, bytes });
        (this.fontBytes[r.cssFamily] ??= {})[v] = bytes;
        return sf;
      } catch { /* arquivo ilegível p/ o parser: fica no padrão */ }
    }
    return null; // sem a variante: o Registry usa a regular da família (ou o padrão)
  }

  /** Família COM ARQUIVO para o XPS (que embute os bytes): a do canvas; sem
   *  bytes embutíveis (licença que não permite), a substituta já carregada ou
   *  o padrão. */
  private fileFamilyFor(family: string | undefined): string {
    const fam = this.familyFor(family);
    if (this.fontBytes[fam]) return fam;
    const sub = family ? METRIC_SUBSTITUTES[family.toLowerCase()] : undefined;
    return sub && this.fontBytes[sub] ? sub : DEFAULT_FONT;
  }

  /** Antes de exportar: espera as fontes que o documento usa terminarem de
   *  resolver (a substituta pode estar chegando pela rede) e refaz o layout se
   *  alguma mudou — senão o PDF sairia com a fonte provisória. */
  private async settleDocumentFonts(): Promise<void> {
    const families = [...new Set(this.fontUsage().map((u) => u.family))].filter((f) => !this.loadedFamilyNames.has(f));
    if (!families.length) return;
    await this.fontResolver.resolveWithFile(families);
    // variantes que o documento usa e ainda não baixaram (negrito, itálico…)
    await Promise.all(this.fontUsage().flatMap((u) => {
      const r = this.loadedFamilyNames.has(u.family) ? undefined : this.fontResolver.getWithFile(u.family);
      return r ? [...u.variants].filter((v) => !r.faces[v]).map((v) => this.fontResolver.loadFace(r, v)) : [];
    }));
    let changed = false;
    for (const f of families) {
      if (this.appliedFonts.has(f)) continue;
      this.applyResolvedFont(f);
      changed = true;
    }
    // (re)layout pendente na fila também precisa valer ANTES de exportar
    if ((changed || this.refreshQueued) && this.model) this.refresh();
    await this.settleEngineFonts();
  }

  /** Espera as fontes que o MOTOR pediu (tema, substitutas do Word, símbolos)
   *  chegarem e o layout ser refeito com elas. */
  private async settleEngineFonts(): Promise<void> {
    for (let i = 0; i < 6 && this.eng; i++) {
      if (!this.engFontLoad) this.scheduleEngineFonts();
      if (!this.engFontLoad) break;
      await this.engFontLoad;
      if (this.refreshQueued && this.model) { this.refreshQueued = false; this.refresh(); }
    }
  }

  /** Antes do PDF: famílias cujo arquivo a licença não deixa embutir ganham a
   *  substituta métrico-compatível embarcada, para o PDF embuti-la. */
  private async preparePdfFonts(): Promise<void> {
    if (!this.fonts) return;
    for (const family of this.fonts.families()) {
      const sub = METRIC_SUBSTITUTES[family.toLowerCase()];
      if (!sub || this.fonts.get(sub)) continue;
      const fonts = Object.values(this.fonts.get(family) ?? {});
      if (fonts.every((f) => f && this.fontFiles.has(f))) continue;
      const faces = await this.fontResolver.bundledFaces(sub, ['regular', 'bold', 'italic', 'boldItalic']);
      for (const [v, bytes] of Object.entries(faces) as [FontVariant, Uint8Array][]) {
        try {
          const sf = new SfntFont(bytes);
          this.fonts.register(sub, v, sf);
          this.fontFiles.set(sf, { name: sub, bytes });
          (this.fontBytes[sub] ??= {})[v] = bytes;
        } catch { /* fica no padrão */ }
      }
    }
  }

  private queueRefresh(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    queueMicrotask(() => {
      this.refreshQueued = false;
      if (this.model) this.refresh();
    });
  }
  setColor(hex: string | undefined): void { this.formatRuns({ color: hex }); }
  setHighlight(name: string | undefined): void { this.formatRuns({ highlight: name }); }
  /** Limpar Toda a Formatação (Word: Selection.ClearFormatting): o trecho perde
   *  a formatação direta e o estilo de caractere; os parágrafos tocados voltam ao
   *  Normal sem formatação direta. No cursor: o parágrafo. */
  clearFormatting(): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) clearRunFormatting(this.model, this.range(), { charStyle: undefined });
    else this.pendingProps = { ...DEFAULT_RUN_PROPS };
    clearParaFormatting(this.model, this.range());
    const { start, end } = normalizeRange(this.range());
    for (let pi = start.para; pi <= end.para; pi++) delete this.model.paragraphs[pi]!.props.styleId;
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
  }
  changeCase(mode: 'upper' | 'lower'): void {
    if (!this.model || !this.hasSelection() || this.locked()) return;
    this.snapshot();
    const { start, end } = normalizeRange(this.range());
    for (let pi = start.para; pi <= end.para; pi++) {
      const p = this.model.paragraphs[pi]!;
      let acc = 0;
      for (const run of p.runs) {
        const rs = acc; const re = acc + run.text.length; acc = re;
        const from = pi === start.para ? Math.max(start.offset, rs) : rs;
        const to = pi === end.para ? Math.min(end.offset, re) : re;
        if (to <= from) continue;
        const seg = run.text.slice(from - rs, to - rs);
        const tx = mode === 'upper' ? seg.toUpperCase() : seg.toLowerCase();
        run.text = run.text.slice(0, from - rs) + tx + run.text.slice(to - rs);
      }
    }
    this.refresh();
  }

  setAlignment(a: 'left' | 'center' | 'right' | 'both'): void { this.formatPara({ alignment: a }); }
  /** Aplica hyperlink à seleção; sem seleção e com url, insere a url já linkada. */
  setLink(url: string | undefined): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      applyRunProps(this.model, this.range(), { link: url || undefined });
    } else if (url) {
      const start = this.selection.focus;
      const pos = insertText(this.model, start, url);
      applyRunProps(this.model, { start, end: pos }, { link: url });
      this.selection = { anchor: pos, focus: pos };
    }
    this.refresh();
  }
  toggleList(kind: 'bullet' | 'decimal'): void {
    const cur = this.model?.paragraphs[this.selection.focus.para]?.props.numbering;
    this.formatPara({
      numbering: cur?.kind === kind ? undefined : { kind, ilvl: 0 },
      indentLeftTwips: cur?.kind === kind ? undefined : 720,
    });
  }
  indent(delta: 1 | -1): void {
    const p = this.model?.paragraphs[this.selection.focus.para];
    const cur = p?.props.indentLeftTwips ?? 0;
    this.formatPara({ indentLeftTwips: Math.max(0, cur + delta * 720) || undefined });
  }
  setLineSpacing(line: number): void { this.formatPara({ lineTwentieths: line }); }
  // ───────────────────────── estilos ─────────────────────────
  // A folha (word/styles.xml) é editada sem perdas por DocStyles/styles.ts; o
  // modelo só leva styleId (parágrafo) e charStyle (run). Regras do Word medidas
  // no oráculo (write/tools/styles-oracle; memória word-styles-oracle-facts).

  /** Estilos da galeria/painel: definidos + latentes built-in, na ordem do Word
   *  (prioridade, nome). `filter`: 'gallery' (galeria), 'recommended' (padrão),
   *  'inUse', 'document' (definidos no arquivo) ou 'all'. */
  listStyles(filter: StyleFilter = 'recommended'): StyleInfo[] {
    const lang = uiLang(this);
    if (!this.docStyles.xml && this.loadedFormat === 'odt') {
      // .odt: os estilos do ODF (só leitura nesta frente)
      const out: StyleInfo[] = [];
      this.fullDoc?.styles.forEach((v, id) => {
        if (id === 'docDefaults' || (v.type && v.type !== 'paragraph')) return;
        out.push({ id, name: v.name ?? id, rawName: v.name ?? id, kind: 'paragraph', builtIn: false, defined: true, quick: true, hidden: false,
          priority: 0, inUse: false, isDefault: false, autoUpdate: false });
      });
      return out.sort((a, b) => a.name.localeCompare(b.name));
    }
    return listStyles(this.docStyles, lang, this.stylesInUse(), filter);
  }

  /** Formatação EFETIVA de um estilo (cascata docDefaults → basedOn → estilo):
   *  fonte, tamanho, cor, alinhamento, espaçamentos… — miniaturas e diálogos. */
  styleFormatting(id: string): StyleLook | null {
    if (!this.docStyles.xml && !this.stylesEditable()) return null;
    return styleLook(this.docStyles, this.fullDoc?.formatting?.theme ?? emptyFormatting().theme, resolveStyleId(this.docStyles.xml, id));
  }

  /** Formatação DIRETA da seleção (1º caractere + 1º parágrafo) no formato do
   *  diálogo de estilo — o ponto de partida de "Criar estilo". */
  selectionStyleFormat(): StyleFormat {
    if (!this.model) return {};
    return this.selectionFormat('linked');
  }

  /** Fonte CSS com que a TELA desenha uma família (a mesma face do canvas: o
   *  arquivo da fonte ou a substituta métrico-compatível) — miniaturas de
   *  estilo e prévias. Família ainda não carregada é pedida ao resolvedor. */
  canvasFont(family: string, bold = false, italic = false): { family: string; weight: number; italic: boolean } {
    const face = this.fonts ? this.liveFontProvider().face(family, bold, italic) : null;
    const css = face ? this.engFaceCss.get(face) : undefined;
    if (!css) void this.ensureFontLoaded(family);
    return css ?? { family: DEFAULT_FONT_CSS, weight: bold ? 700 : 400, italic };
  }

  /** Versão da folha de estilos (muda a cada criar/modificar/excluir/desfazer). */
  stylesVersion(): number { return this.docStyles.version; }

  /** Muda quando a lista de estilos pode ter mudado (folha, uso no documento, idioma). */
  stylesKey(): string {
    return `${this.docStyles.version}:${this.editsSinceLoad}:${this.undoStack.length}:${this.redoStack.length}:${this.hfEdit ? 1 : 0}:${uiLang(this)}`;
  }

  /** Estilo de parágrafo e de caractere no cursor (ids). */
  currentStyles(): { paragraph: string; character?: string } {
    const p = this.model?.paragraphs[this.selection.focus.para];
    const run = this.pendingProps ?? this.currentProps();
    return { paragraph: p?.props.styleId ?? this.docStyles.defaultParagraph(), character: run.charStyle };
  }

  /** Aplica um estilo como o Word (oráculo):
   *  - PARÁGRAFO: troca o estilo dos parágrafos da seleção, LIMPA a formatação
   *    direta de parágrafo e a de caractere UNIFORME no parágrafo; a parcial
   *    (uma palavra em negrito) fica;
   *  - CARACTERE: no trecho selecionado (no cursor, a palavra), tirando toda a
   *    formatação direta dele;
   *  - VINCULADO em parte de UM parágrafo: vale o par de caractere ("… Char").
   *  Estilo latente built-in entra no styles.xml com a definição do Word.
   *  `undefined` = Normal. */
  applyStyle(styleId: string | undefined): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    this.applyStyleCore(styleId);
    this.pendingProps = null;
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
  }

  private applyStyleCore(styleId: string | undefined): void {
    const ds = this.docStyles;
    const defPara = ds.defaultParagraph();
    const sid = styleId === undefined ? undefined : resolveStyleId(ds.xml, styleId);
    const id = sid === undefined || sid === defPara ? undefined : sid;
    if (id && this.stylesEditable()) this.commitStyles(ensureDefined(ds, ds.base(), id, true));
    const meta = id ? ds.meta(id) : undefined;
    const { start, end } = normalizeRange(this.range());
    if (meta?.type === 'character') { this.applyCharStyle(id!); return; }
    const twin = meta?.link ? ds.meta(meta.link) : undefined;
    if (twin?.type === 'character' && this.hasSelection() && start.para === end.para
      && !(start.offset === 0 && end.offset >= paraLength(this.model!.paragraphs[start.para]!))) {
      this.applyCharStyle(twin.id);
      return;
    }
    const RUN_KEYS: (keyof RunProps)[] = [
      'szHalfPt', 'fontAscii', 'color', 'bold', 'italic', 'underline',
      'underlineStyle', 'underlineColor', 'strike', 'doubleStrike',
      'allCaps', 'smallCaps', 'vertAlign', 'highlight', 'charSpacingTwips',
    ];
    for (let pi = start.para; pi <= end.para; pi++) {
      const p = this.model!.paragraphs[pi];
      if (!p) continue;
      // formatação direta de PARÁGRAFO cede ao estilo
      clearPara(p);
      p.props.styleId = id;
      // props de run UNIFORMES no parágrafo cedem ao estilo; as que VARIAM ficam
      const runs = p.runs;
      if (runs.length) {
        const uniform = RUN_KEYS.filter((key) => {
          const first = runs[0]!.props[key];
          return first !== undefined && first !== false && runs.every((rn) => rn.props[key] === first);
        });
        if (uniform.length) clearRunFormatting(this.model!, { start: { para: pi, offset: 0 }, end: { para: pi, offset: paraLength(p) } }, { fields: uniform, charStyle: null });
      }
    }
  }

  /** Estilo de caractere no trecho (no cursor: a palavra; fora de palavra: o
   *  texto que for digitado). Tira a formatação direta do trecho (Word). */
  private applyCharStyle(id: string | undefined): void {
    const r = this.hasSelection() ? this.range() : this.wordRangeAt(this.selection.focus, false);
    if (!r) { this.pendingProps = { ...DEFAULT_RUN_PROPS, ...(id ? { charStyle: id } : {}) }; return; }
    clearRunFormatting(this.model!, r, { charStyle: id });
    this.ensureStyleUsed(id);
  }

  /** Palavra sob o cursor ([letras/dígitos]); `space` inclui os espaços depois
   *  (é o que o Word limpa no cursor). null = cursor fora de palavra. */
  private wordRangeAt(pos: DocPosition, space: boolean): DocRange | null {
    const p = this.model?.paragraphs[pos.para];
    if (!p) return null;
    const t = paraText(p);
    const w = (i: number): boolean => i >= 0 && i < t.length && /[\p{L}\p{N}_]/u.test(t[i]!);
    if (!w(pos.offset) && !w(pos.offset - 1)) return null;
    let a = pos.offset, b = pos.offset;
    while (w(a - 1)) a--;
    while (w(b)) b++;
    if (space) while (b < t.length && t[b] === ' ') b++;
    return { start: { para: pos.para, offset: a }, end: { para: pos.para, offset: b } };
  }

  /** Usar um estilo tira o semiHidden (unhideWhenUsed), como o Word. */
  private ensureStyleUsed(id: string | undefined): void {
    if (id && this.stylesEditable()) this.commitStyles(ensureDefined(this.docStyles, this.docStyles.base(), id, true));
  }

  /** Formatação do 1º caractere e do 1º parágrafo da seleção (criar estilo). */
  private selectionFormat(type: 'paragraph' | 'character' | 'linked'): StyleFormat {
    const { start } = normalizeRange(this.range());
    const run = this.hasSelection() ? propsAt(this.model!, { para: start.para, offset: start.offset + 1 }) : (this.pendingProps ?? this.currentProps());
    const f: StyleFormat = {};
    if (run.fontAscii) f.fontAscii = run.fontAscii;
    if (run.szHalfPt !== undefined) f.szHalfPt = run.szHalfPt;
    if (run.bold) f.bold = true;
    if (run.italic) f.italic = true;
    if (run.underline && !run.link) f.underline = true;
    if (run.strike) f.strike = true;
    if (run.allCaps) f.allCaps = true;
    if (run.smallCaps) f.smallCaps = true;
    if (run.color && !(run.link && run.color === '0563C1')) f.color = run.color;
    if (run.charSpacingTwips) f.charSpacingTwips = run.charSpacingTwips;
    if (type === 'character') return f;
    const pp = this.model!.paragraphs[start.para]!.props;
    if (pp.alignment && pp.alignment !== 'left') f.alignment = pp.alignment;
    if (pp.spaceBeforeTwips !== undefined) f.spaceBeforeTwips = pp.spaceBeforeTwips;
    if (pp.spaceAfterTwips !== undefined) f.spaceAfterTwips = pp.spaceAfterTwips;
    if (pp.lineTwentieths !== undefined) f.lineTwentieths = pp.lineTwentieths;
    if (pp.indentLeftTwips) f.indentLeftTwips = pp.indentLeftTwips;
    if (pp.indentRightTwips) f.indentRightTwips = pp.indentRightTwips;
    if (pp.indentFirstLineTwips) f.indentFirstLineTwips = pp.indentFirstLineTwips;
    return f;
  }

  /** Cria um estilo (padrão: VINCULADO, na galeria, baseado no estilo do
   *  parágrafo atual, com a formatação do 1º caractere/parágrafo da seleção —
   *  como "Criar um Estilo") e o aplica à seleção. Devolve o styleId (como o Word
   *  gera: o nome sem acentos/espaços) ou null se o nome já existe. */
  createStyle(opts: CreateStyleOptions & { fromSelection?: boolean; apply?: boolean }): string | null {
    if (!this.model || this.locked() || !this.stylesEditable()) return null;
    const name = opts.name.trim();
    if (!name || this.styleNameTaken(name)) return null;
    const type = opts.type ?? 'linked';
    const format = opts.format ?? (opts.fromSelection !== false ? this.selectionFormat(type) : {});
    const basedOn = opts.basedOn ?? (type === 'character' ? undefined
      : this.model.paragraphs[this.selection.focus.para]?.props.styleId ?? this.docStyles.defaultParagraph());
    this.snapshot();
    const { xml, id } = createStyleXml(this.docStyles, this.docStyles.base(), { ...opts, name, type, basedOn, format });
    this.commitStyles(xml);
    if (opts.apply !== false) this.applyStyleCore(id);
    this.pendingProps = null;
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
    return id;
  }

  /** Modifica um estilo — nome, baseado em, próximo, galeria, atualizar
   *  automaticamente e a formatação (`format`: valor = definir no estilo, null =
   *  herdar). O documento inteiro refaz o layout; um passo de desfazer. */
  modifyStyle(id: string, opts: ModifyStyleOptions): boolean {
    if (!this.model || this.locked() || !this.stylesEditable()) return false;
    if (opts.name !== undefined && opts.name.trim() && this.styleNameTaken(opts.name.trim(), id)) return false;
    id = resolveStyleId(this.docStyles.xml, id);
    this.snapshot();
    const { xml, renamed } = modifyStyleXml(this.docStyles, this.docStyles.base(), id, opts);
    if (xml === this.docStyles.xml) { this.undoStack.pop(); return false; }
    this.commitStyles(xml);
    this.retargetStyles(renamed, []);
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
    return true;
  }

  /** "Atualizar <estilo> para Corresponder à Seleção": a formatação direta do
   *  parágrafo atual (a de parágrafo e a de caractere uniforme) entra no estilo
   *  e sai do parágrafo. Padrão: o estilo do parágrafo atual. */
  updateStyleFromSelection(id?: string): boolean {
    if (!this.model || this.locked() || !this.stylesEditable()) return false;
    const pi = this.selection.focus.para;
    const p = this.model.paragraphs[pi]!;
    const target = resolveStyleId(this.docStyles.xml, id ?? p.props.styleId ?? this.docStyles.defaultParagraph());
    const pp = p.props;
    const format: StyleFormat = {};
    if (pp.alignment) format.alignment = pp.alignment;
    if (pp.spaceBeforeTwips !== undefined) format.spaceBeforeTwips = pp.spaceBeforeTwips;
    if (pp.spaceAfterTwips !== undefined) format.spaceAfterTwips = pp.spaceAfterTwips;
    if (pp.lineTwentieths !== undefined) format.lineTwentieths = pp.lineTwentieths;
    if (pp.indentLeftTwips !== undefined) format.indentLeftTwips = pp.indentLeftTwips;
    if (pp.indentRightTwips !== undefined) format.indentRightTwips = pp.indentRightTwips;
    if (pp.indentFirstLineTwips !== undefined) format.indentFirstLineTwips = pp.indentFirstLineTwips;
    const runs = p.runs;
    const uniform = <K extends keyof RunProps>(k: K): RunProps[K] | undefined => {
      const v = runs[0]?.props[k];
      return v !== undefined && runs.every((r) => r.props[k] === v) ? v : undefined;
    };
    const fields: (keyof RunProps)[] = [];
    const take = <K extends keyof RunProps & keyof StyleFormat>(k: K, onlyTrue = false): void => {
      const v = uniform(k);
      if (v === undefined || (onlyTrue && v === false)) return;
      (format as Record<string, unknown>)[k] = v;
      fields.push(k);
    };
    take('fontAscii'); take('szHalfPt'); take('color'); take('charSpacingTwips');
    take('bold', true); take('italic', true); take('underline', true); take('strike', true); take('allCaps', true); take('smallCaps', true);
    this.snapshot();
    const { xml } = modifyStyleXml(this.docStyles, this.docStyles.base(), target, { format });
    this.commitStyles(xml);
    clearPara(p);
    if (target !== this.docStyles.defaultParagraph()) p.props.styleId = target;
    if (fields.length && runs.length) clearRunFormatting(this.model, { start: { para: pi, offset: 0 }, end: { para: pi, offset: paraLength(p) } }, { fields, charStyle: null });
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
    return true;
  }

  /** Renomeia. Personalizado troca nome E styleId (o documento acompanha);
   *  built-in ganha um alias (w:aliases), como o Word. */
  renameStyle(id: string, name: string): boolean {
    if (!this.model || this.locked() || !this.stylesEditable() || !name.trim() || this.styleNameTaken(name.trim(), id)) return false;
    id = resolveStyleId(this.docStyles.xml, id);
    this.snapshot();
    const { xml, renamed } = renameStyleXml(this.docStyles, this.docStyles.base(), id, name.trim());
    if (xml === this.docStyles.xml) { this.undoStack.pop(); return false; }
    this.commitStyles(xml);
    this.retargetStyles(renamed, []);
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
    return true;
  }

  /** Exclui um estilo PERSONALIZADO: os parágrafos voltam ao Normal e os runs
   *  perdem o estilo de caractere (Word). Built-in não se exclui → false. */
  deleteStyle(id: string): boolean {
    if (!this.model || this.locked() || !this.stylesEditable() || !this.docStyles.xml) return false;
    const r = deleteStyleXml(this.docStyles.xml, id);
    if (!r) return false;
    this.snapshot();
    this.commitStyles(r.xml);
    this.retargetStyles({}, r.removed);
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
    return true;
  }

  /** Mostra (true) ou tira (false) o estilo da galeria (w:qFormat). */
  setStyleInGallery(id: string, on: boolean): void {
    if (!this.model || this.locked() || !this.stylesEditable()) return;
    const xml = setQuickXml(this.docStyles, this.docStyles.base(), resolveStyleId(this.docStyles.xml, id), on);
    if (xml === this.docStyles.xml) return;
    this.snapshot();
    this.commitStyles(xml);
    this.refresh();
    this.chromeSync?.();
  }

  /** Inspetor de Estilo: o estilo e a formatação DIRETA de parágrafo e de texto
   *  no cursor (só as propriedades presentes). */
  inspectStyle(): {
    paragraph: { id: string; name: string; direct: Partial<ParaProps> };
    text: { id: string; name: string; direct: Partial<RunProps> };
  } {
    const lang = uiLang(this);
    const ds = this.docStyles;
    const p = this.model?.paragraphs[this.selection.focus.para];
    const run = this.hasSelection()
      ? propsAt(this.model!, { para: normalizeRange(this.range()).start.para, offset: normalizeRange(this.range()).start.offset + 1 })
      : (this.pendingProps ?? this.currentProps());
    const nameOf = (id: string): string => {
      const m = ds.meta(id);
      return m ? displayName(m, lang) : this.listStyles('all').find((s) => s.id === id)?.name ?? id;
    };
    const pid = p?.props.styleId ?? ds.defaultParagraph();
    const cid = run.charStyle ?? ds.defaultCharacter();
    const pd: Partial<ParaProps> = {};
    for (const k of ['alignment', 'spaceBeforeTwips', 'spaceAfterTwips', 'lineTwentieths', 'indentLeftTwips', 'indentRightTwips',
      'indentFirstLineTwips', 'numbering', 'borders', 'shadingHex', 'tabStops', 'pageBreakBefore'] as const) {
      const v = p?.props[k];
      if (v !== undefined && v !== false) (pd as Record<string, unknown>)[k] = v;
    }
    const rd: Partial<RunProps> = {};
    for (const k of ['fontAscii', 'szHalfPt', 'bold', 'italic', 'underline', 'strike', 'doubleStrike', 'allCaps', 'smallCaps',
      'color', 'highlight', 'vertAlign', 'charSpacingTwips'] as const) {
      const v = run[k];
      if (v === undefined || v === false) continue;
      if (run.link && ((k === 'underline' && !run.underlineStyle) || (k === 'color' && v === '0563C1'))) continue;
      (rd as Record<string, unknown>)[k] = v;
    }
    return { paragraph: { id: pid, name: nameOf(pid), direct: pd }, text: { id: cid, name: nameOf(cid), direct: rd } };
  }

  /** Inspetor: "Redefinir para o estilo Normal de parágrafo" (mantém o direto). */
  clearParagraphStyle(): void {
    this.styleEdit(() => {
      const { start, end } = normalizeRange(this.range());
      for (let pi = start.para; pi <= end.para; pi++) delete this.model!.paragraphs[pi]!.props.styleId;
    });
  }
  /** Inspetor: limpar a formatação DIRETA de parágrafo (mantém o estilo). */
  clearParagraphFormatting(): void {
    this.styleEdit(() => clearParaFormatting(this.model!, this.range()));
  }
  /** Inspetor: limpar o estilo de CARACTERE (mantém o direto). No cursor: a palavra. */
  clearCharacterStyle(): void {
    this.styleEdit(() => {
      const r = this.hasSelection() ? this.range() : this.wordRangeAt(this.selection.focus, false);
      if (r) coreApplyRunProps(this.model!, r, { charStyle: undefined });
      else if (this.pendingProps) delete this.pendingProps.charStyle;
    });
  }
  /** Inspetor: limpar a formatação DIRETA de caractere (mantém o estilo de
   *  caractere). No cursor: a palavra e o espaço depois (Word). */
  clearCharacterFormatting(): void {
    this.styleEdit(() => {
      const r = this.hasSelection() ? this.range() : this.wordRangeAt(this.selection.focus, true);
      if (r) clearRunFormatting(this.model!, r, { charStyle: null });
      else this.pendingProps = { ...DEFAULT_RUN_PROPS, ...(this.currentProps().charStyle ? { charStyle: this.currentProps().charStyle } : {}) };
    });
  }

  private styleEdit(fn: () => void): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    fn();
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
  }

  /** Enter no fim do parágrafo: o novo leva o "próximo estilo" (w:next), sem
   *  formatação direta — se o estilo tem um próximo diferente dele mesmo. */
  private applyNextStyle(prev: Paragraph, next: Paragraph): void {
    const ds = this.docStyles;
    const sid = prev.props.styleId ?? ds.defaultParagraph();
    const meta = ds.meta(sid);
    if (!meta?.next || meta.next === sid) return;
    clearPara(next);
    next.props.styleId = meta.next === ds.defaultParagraph() ? undefined : meta.next;
    this.ensureStyleUsed(next.props.styleId);
    this.pendingProps = { ...DEFAULT_RUN_PROPS };
  }

  /** Há folha de estilos editável (docx; .odt não). */
  private stylesEditable(): boolean { return this.loadedFormat !== 'odt'; }

  private styleNameTaken(name: string, except?: string): boolean {
    const k = name.toLowerCase();
    return this.listStyles('all').some((s) => s.id !== except && (s.name.toLowerCase() === k || s.rawName.toLowerCase() === k));
  }

  /** Nova versão do styles.xml: relê a folha (motor + editor) e refaz o layout. */
  private commitStyles(xml: string): void {
    if (xml === this.docStyles.xml) return;
    this.docStyles.commit(xml);
    this.syncStyleSheet();
  }

  private syncStyleSheet(): void {
    const xml = this.docStyles.xml ?? undefined;
    if (this.fullDoc) {
      this.fullDoc.styles = readStylesXml(xml);
      this.fullDoc.formatting = { ...(this.fullDoc.formatting ?? emptyFormatting()), styles: this.docStyles.sheet() };
    }
    this.engPageCache.clear();
    this.dispatchEvent(new CustomEvent('uw-styles-change'));
  }

  /** Todos os parágrafos do documento (corpo, tabelas, cabeçalhos/rodapés, notas, caixas). */
  private allParagraphs(): Paragraph[] {
    const out: Paragraph[] = [];
    const visit = (ps: readonly Paragraph[]): void => {
      for (const p of ps) {
        out.push(p);
        for (const r of p.runs) if (r.textbox) visit(r.textbox.paras);
      }
    };
    const table = (t: TableBlock): void => { for (const row of t.rows) for (const c of row.cells) { visit(c.paragraphs); c.tables.forEach(table); } };
    const body = this.bodyState();
    visit(body.model.paragraphs);
    body.tableAnchors.forEach((a) => table(a.table));
    for (const s of this.fullDoc?.sections ?? []) {
      for (const set of [s.headers, s.footers]) for (const ps of [set.default, set.first, set.even]) if (ps) visit(ps);
    }
    for (const m of [this.fullDoc?.footnotes, this.fullDoc?.endnotes]) m?.forEach((ps) => visit(ps));
    return [...new Set(out)];
  }

  private inUseCache: { key: string; set: Set<string> } | null = null;
  /** Ids de estilo em uso (styleId dos parágrafos, charStyle dos runs). */
  private stylesInUse(): Set<string> {
    const key = this.stylesKey();
    if (this.inUseCache?.key === key) return this.inUseCache.set;
    const used = new Set<string>();
    this.inUseCache = { key, set: used };
    for (const p of this.allParagraphs()) {
      if (p.props.styleId) used.add(p.props.styleId);
      for (const r of p.runs) if (r.props.charStyle) used.add(r.props.charStyle);
    }
    return used;
  }

  /** Renomeados/excluídos: os parágrafos e runs acompanham. */
  private retargetStyles(renamed: Record<string, string>, removed: readonly string[]): void {
    if (!Object.keys(renamed).length && !removed.length) return;
    const gone = new Set(removed);
    for (const p of this.allParagraphs()) {
      const s = p.props.styleId;
      if (s && renamed[s]) p.props.styleId = renamed[s];
      else if (s && gone.has(s)) delete p.props.styleId;
      for (const r of p.runs) {
        const c = r.props.charStyle;
        if (c && renamed[c]) r.props = { ...r.props, charStyle: renamed[c] };
        else if (c && gone.has(c)) { r.props = { ...r.props }; delete r.props.charStyle; }
      }
    }
  }
  setShading(hex: string | undefined): void { this.formatPara({ shadingHex: hex }); }
  setCharSpacing(twips: number | undefined): void { this.formatRuns({ charSpacingTwips: twips }); }
  setSpecialIndent(kind: 'none' | 'firstLine' | 'hanging'): void {
    this.formatPara({
      indentFirstLineTwips: kind === 'none' ? undefined : kind === 'firstLine' ? 708 : -708,
    });
  }
  setIndentRight(twips: number | undefined): void { this.formatPara({ indentRightTwips: twips }); }

  // pincel de formatação
  private painterProps: { run: RunProps; para: ParaProps } | null = null;
  copyFormat(): void {
    if (!this.model) return;
    this.painterProps = {
      run: this.currentProps(),
      para: { ...this.model.paragraphs[this.selection.focus.para]!.props },
    };
  }
  painterActive(): boolean { return this.painterProps !== null; }
  private applyPainter(): void {
    if (!this.painterProps || !this.model) return;
    const { run, para } = this.painterProps;
    this.painterProps = null;
    this.snapshot();
    if (this.hasSelection()) applyRunProps(this.model, this.range(), run);
    applyParaProps(this.model, this.range(), para);
    this.refresh();
  }

  // localizar / substituir
  findNext(needle: string): boolean {
    if (!this.model || !needle) return false;
    const lower = needle.toLowerCase();
    const startP = this.selection.focus.para;
    const startO = this.selection.focus.offset;
    const n = this.model.paragraphs.length;
    for (let k = 0; k <= n; k++) {
      const pi = (startP + k) % n;
      const text = paraText(this.model.paragraphs[pi]!).toLowerCase();
      const from = k === 0 ? startO : 0;
      const idx = text.indexOf(lower, from);
      if (idx >= 0) {
        this.selection = {
          anchor: { para: pi, offset: idx },
          focus: { para: pi, offset: idx + needle.length },
        };
        this.refreshSelection();
        this.scrollCaretIntoView();
        return true;
      }
    }
    return false;
  }
  replaceAll(needle: string, replacement: string): number {
    if (!this.model || !needle) return 0;
    this.snapshot();
    let count = 0;
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      let from = 0; // avança além da substituição p/ não re-casar com ela
      for (;;) {
        const text = paraText(this.model.paragraphs[pi]!).toLowerCase();
        const idx = text.indexOf(needle.toLowerCase(), from);
        if (idx < 0) break;
        const pos = deleteRange(this.model, {
          start: { para: pi, offset: idx },
          end: { para: pi, offset: idx + needle.length },
        });
        insertText(this.model, pos, replacement);
        from = idx + replacement.length;
        count++;
      }
    }
    this.refresh();
    return count;
  }

  /** Texto plano da seleção (parágrafos separados por \n). */
  selectedText(): string {
    if (!this.model || !this.hasSelection()) return '';
    const { start, end } = normalizeRange(this.range());
    const parts: string[] = [];
    for (let pi = start.para; pi <= end.para; pi++) {
      const paragraph = this.model.paragraphs[pi]!;
      const from = pi === start.para ? start.offset : 0;
      const to = pi === end.para ? end.offset : paraLength(paragraph);
      parts.push(this.plainTextSlice(paragraph, from, to));
    }
    return parts.join('\n');
  }

  private plainTextSlice(paragraph: Paragraph, from: number, to: number): string {
    let out = '';
    let acc = 0;
    for (const run of paragraph.runs) {
      const start = acc;
      const end = acc + run.text.length;
      acc = end;
      const sliceStart = Math.max(from, start);
      const sliceEnd = Math.min(to, end);
      if (sliceEnd <= sliceStart) continue;
      out += run.custom
        ? run.custom.fallbackText
        : run.text.slice(sliceStart - start, sliceEnd - start);
    }
    return out;
  }

  /** pos está dentro da seleção atual (range normalizado)? */
  private posInSelection(pos: DocPosition): boolean {
    if (!this.hasSelection()) return false;
    const { start, end } = normalizeRange(this.range());
    const after = pos.para > start.para || (pos.para === start.para && pos.offset >= start.offset);
    const before = pos.para < end.para || (pos.para === end.para && pos.offset <= end.offset);
    return after && before;
  }

  /** Extrai a seleção como parágrafos de runs (com props) — base do clipboard rico. */
  private extractSelection(): { text: string; paras: { runs: { text: string; props: RunProps }[] }[] } | null {
    if (!this.model || !this.hasSelection()) return null;
    const { start, end } = normalizeRange(this.range());
    const paras: { runs: { text: string; props: RunProps }[] }[] = [];
    for (let pi = start.para; pi <= end.para; pi++) {
      const p = this.model.paragraphs[pi]!;
      const from = pi === start.para ? start.offset : 0;
      const to = pi === end.para ? end.offset : paraLength(p);
      const runs: { text: string; props: RunProps }[] = [];
      let acc = 0;
      for (const run of p.runs) {
        const rs = acc, re = acc + run.text.length; acc = re;
        const s = Math.max(from, rs), e = Math.min(to, re);
        if (e > s) runs.push({
          text: run.custom ? run.custom.fallbackText : run.text.slice(s - rs, e - rs),
          props: { ...run.props },
        });
      }
      paras.push({ runs });
    }
    const text = paras.map((pp) => pp.runs.map((r) => r.text).join('')).join('\n');
    return { text, paras };
  }

  /** Copia a seleção: texto p/ o sistema + cópia RICA interna (preserva origem). */
  async copy(): Promise<void> {
    const t = this.selectedText();
    if (!t) return;
    this.richClip = this.extractSelection();
    try { await navigator.clipboard?.writeText(t); } catch { /* sem permissão */ }
  }
  /** Recorta a seleção. */
  async cut(): Promise<void> {
    if (!this.model || !this.hasSelection() || this.locked()) return;
    await this.copy();
    this.snapshot();
    const pos = this.deleteSelection();
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
  }
  /** Colar (Ctrl+V): respeita a formatação da ORIGEM (rico) quando o texto do
   * sistema ainda casa com a cópia interna; senão cola texto externo herdando o destino. */
  async paste(): Promise<void> {
    if (this.locked()) return;
    try {
      const t = await navigator.clipboard?.readText();
      if (!t) return;
      // o clipboard do SO normaliza p/ \r\n no Windows — comparar normalizado
      if (this.richClip && this.richClip.text === t.replace(/\r\n?/g, '\n')) this.insertRich(this.richClip);
      else this.pasteText(t);
      this.onSelectionChange?.(); this.chromeSync?.();
    } catch { /* sem permissão de leitura */ }
  }
  /** Colar sem formatação (Ctrl+Shift+V): sempre texto plano, herdando o DESTINO. */
  async pastePlain(): Promise<void> {
    if (this.locked()) return;
    try { const t = await navigator.clipboard?.readText(); if (t) { this.pasteText(t); this.onSelectionChange?.(); this.chromeSync?.(); } }
    catch { /* sem permissão de leitura */ }
  }

  /** Insere os parágrafos/runs ricos preservando os props de cada run (origem). */
  private insertRich(clip: { paras: { runs: { text: string; props: RunProps }[] }[] }): void {
    if (!this.model || this.view === 'read') return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    let pos = this.selection.focus;
    clip.paras.forEach((cp, i) => {
      if (i > 0) pos = splitParagraph(this.model!, pos);
      for (const run of cp.runs) if (run.text) pos = insertText(this.model!, pos, run.text, { ...run.props });
    });
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }

  /** Cola texto plano (\n divide parágrafos) HERDANDO a formatação do destino (props do caret). */
  pasteText(text: string): void {
    if (!this.model || this.view === 'read' || !text) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const paras = text.replace(/\r\n?/g, '\n').split('\n');
    let pos = this.selection.focus;
    paras.forEach((part, i) => {
      if (i > 0) pos = splitParagraph(this.model!, pos);
      if (part) pos = insertText(this.model!, pos, part); // sem props ⇒ herda o destino
    });
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }
  toggleBorder(): void {
    const p = this.model?.paragraphs[this.selection.focus.para]?.props;
    const has = !!(p?.boxBorder || p?.borders);
    const edge = { style: 'single', sizeEighthPt: 4, spacePt: 1 };
    this.formatPara({
      boxBorder: undefined,
      borders: has ? undefined : { top: { ...edge }, left: { ...edge }, bottom: { ...edge }, right: { ...edge } },
    });
  }
  setSpaceAfter(twips: number | undefined): void { this.formatPara({ spaceAfterTwips: twips }); }
  setSpaceBefore(twips: number | undefined): void { this.formatPara({ spaceBeforeTwips: twips }); }

  /**
   * Configurar Página da seção do cursor (ou das seções que a seleção toca),
   * como as galerias Margens/Orientação/Tamanho. `applyTo` como no diálogo:
   * 'section' (padrão), 'document', 'forward' (quebra de seção "próxima página"
   * no cursor e a seção de depois muda) ou 'selection' (quebras "próxima página"
   * antes e depois da seleção). Mudar a orientação gira as margens (Word).
   */
  setPageSetup(opts: {
    orientation?: 'portrait' | 'landscape';
    size?: 'A4' | 'Letter';
    margins?: 'normal' | 'narrow' | 'wide';
    /** margens personalizadas em twips (sobrepõe o preset). */
    customMargins?: { top: number; right: number; bottom: number; left: number };
    applyTo?: SectionApplyTo;
  }): void {
    if (!this.model || this.locked() || (opts.applyTo && opts.applyTo !== 'section' && opts.applyTo !== 'document' && !this.canInsertSectionBreak())) return;
    this.snapshot();
    for (const s of this.sectionTargets(opts.applyTo ?? 'section', 'nextPage')) {
      if (opts.size) {
        const [w, h] = opts.size === 'A4' ? [11906, 16838] : [12240, 15840];
        const landscape = s.pageWidthTwips > s.pageHeightTwips;
        s.pageWidthTwips = landscape ? h : w;
        s.pageHeightTwips = landscape ? w : h;
      }
      if (opts.orientation) setOrientation(s, opts.orientation);
      if (opts.margins) {
        const m = { normal: [1417, 1701], narrow: [720, 720], wide: [1417, 2880] }[opts.margins]!;
        s.marginTopTwips = s.marginBottomTwips = m[0]!;
        s.marginLeftTwips = s.marginRightTwips = m[1]!;
      }
      if (opts.customMargins) {
        s.marginTopTwips = opts.customMargins.top;
        s.marginRightTwips = opts.customMargins.right;
        s.marginBottomTwips = opts.customMargins.bottom;
        s.marginLeftTwips = opts.customMargins.left;
      }
    }
    this.refresh();
  }

  // ───────────────── seções e colunas ─────────────────

  /** Quebras de seção/coluna valem no corpo (o Word as desabilita em
   *  cabeçalho/rodapé e caixa de texto; em tabela ele divide a tabela). */
  private canInsertSectionBreak(): boolean {
    return !!this.model && !this.locked() && !this.hfEdit && !this.tbEdit && !this.cellEdit;
  }

  /**
   * Insere uma quebra de seção no cursor (com seleção: no início dela, sem
   * apagar o texto — Word). Divide o parágrafo; a seção nova (antes) é uma
   * cópia da seção do cursor e leva os cabeçalhos/rodapés; a de depois começa
   * pelo `type` (próxima página, contínua, página par/ímpar, próxima coluna).
   */
  insertSectionBreak(type: SectionType = 'nextPage'): void {
    if (!this.canInsertSectionBreak()) return;
    this.snapshot();
    const pos = this.insertSectionBreakAt(normalizeRange(this.range()).start, type);
    this.selection = { anchor: pos, focus: pos };
    this.pendingProps = null;
    this.refresh();
    this.scrollCaretIntoView();
  }

  /** Quebra de coluna (Ctrl+Shift+Enter): no meio do parágrafo ele é dividido e a
   *  quebra abre o de depois (Word); a seleção é substituída. */
  insertColumnBreak(): void {
    if (!this.canInsertSectionBreak()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const p = this.deleteSelection();
      this.selection = { anchor: p, focus: p };
    }
    let pos = this.selection.focus;
    if (pos.offset > 0) {
      pos = splitParagraph(this.model!, pos);
      this.shiftAnchors(pos.para - 1, 1);
    }
    pos = insertText(this.model!, pos, '\u000B', this.pendingProps ?? undefined);
    this.pendingProps = null;
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }

  /** Quebra de seção num ponto do corpo (dentro de um passo de desfazer já aberto). */
  private insertSectionBreakAt(pos: DocPosition, type: SectionType): DocPosition {
    const m = this.model!;
    const range = sectionRanges(m)[sectionIndexAt(m, pos.para)]!;
    const closing = range.sb ? m.paragraphs[range.end] : undefined;
    const id = this.nextSectionId++;
    this.sectionProps.set(id, this.sectionProps.get(range.sb?.id ?? 0));
    const raw = this.fullDoc?.sources?.sectPrRaw(closing);
    const next = coreInsertSectionBreak(m, pos, type, { split: (mm, p) => splitParagraph(mm, p), id, ...(raw ? { raw } : {}) });
    this.shiftAnchors(pos.para, 1);
    return next;
  }

  /**
   * sectPrs que uma configuração atinge (abre as quebras que 'forward' e
   * 'selection' pedem — o tipo é o do Word: contínua para colunas, próxima
   * página para Configurar Página).
   */
  private sectionTargets(applyTo: SectionApplyTo, breakType: SectionType): SectPr[] {
    const m = this.model!;
    const { start, end } = normalizeRange(this.range());
    if (applyTo === 'document') return sectionRanges(m).map((r) => r.sb?.sectPr ?? m.sectPr);
    if (applyTo === 'forward') {
      const at = this.insertSectionBreakAt(start, breakType);
      this.selection = { anchor: at, focus: at };
      return [sectionSectPr(m, sectionIndexAt(m, at.para))];
    }
    if (applyTo === 'selection' && comparePos(start, end) !== 0) {
      // fim primeiro (o início não se desloca); a seção do meio é a da seleção
      this.insertSectionBreakAt(end, breakType);
      const at = this.insertSectionBreakAt(start, breakType);
      const k = sectionIndexAt(m, at.para);
      const r = sectionRanges(m)[k]!;
      const last = m.paragraphs[r.end]!;
      this.selection = { anchor: at, focus: { para: r.end, offset: paraLength(last) } };
      return [sectionSectPr(m, k)];
    }
    const k0 = sectionIndexAt(m, start.para), k1 = sectionIndexAt(m, end.para);
    const out: SectPr[] = [];
    for (let k = k0; k <= k1; k++) out.push(sectionSectPr(m, k));
    return out;
  }

  /**
   * Colunas da seção do cursor. Predefinição (galeria): 'one' | 'two' | 'three'
   * | 'left' | 'right' — com texto selecionado, valem só para ele (quebras
   * contínuas antes e depois, Word). Especificação (Mais Colunas): número,
   * espaço, larguras próprias, linha entre colunas, `applyTo` e
   * `startNewColumn` (com 'forward', a seção nova começa na próxima coluna).
   */
  setColumns(spec: ColumnPreset | (ColumnSpec & { applyTo?: SectionApplyTo; startNewColumn?: boolean })): void {
    if (!this.model || this.locked()) return;
    const preset = typeof spec === 'string' ? spec : null;
    const applyTo: SectionApplyTo = preset ? (this.hasSelection() ? 'selection' : 'section') : (spec as { applyTo?: SectionApplyTo }).applyTo ?? 'section';
    if ((applyTo === 'forward' || applyTo === 'selection') && !this.canInsertSectionBreak()) return;
    this.snapshot();
    const newCol = !preset && (spec as { startNewColumn?: boolean }).startNewColumn;
    const targets = this.sectionTargets(applyTo, applyTo === 'forward' && newCol ? 'nextColumn' : 'continuous');
    for (const sp of targets) {
      const s = preset ? presetColumns(sp, preset) : (spec as ColumnSpec);
      // (uma coluna: sem w:cols no modelo — o w:space e a linha do cru ficam, como no Word)
      sp.cols = columnsFor(sp, s);
    }
    this.refresh();
  }

  /** A seção do cursor: posição, tipo de início, página e colunas. */
  getSection(): SectionInfo | null {
    const m = this.bodyModel();
    if (!m) return null;
    const para = this.cellEdit || this.hfEdit || this.tbEdit ? 0 : this.selection.focus.para;
    const k = sectionIndexAt(m, para);
    const sp = sectionSectPr(m, k);
    return {
      index: k,
      count: sectionRanges(m).length,
      type: sp.type ?? 'nextPage',
      orientation: sp.pageWidthTwips > sp.pageHeightTwips ? 'landscape' : 'portrait',
      pageWidthTwips: sp.pageWidthTwips, pageHeightTwips: sp.pageHeightTwips,
      margins: { top: sp.marginTopTwips, right: sp.marginRightTwips, bottom: sp.marginBottomTwips, left: sp.marginLeftTwips },
      columns: {
        count: sp.cols?.count ?? 1,
        spaceTwips: sp.cols?.spaceTwips ?? COLUMN_SPACE_DEFAULT,
        sep: !!sp.cols?.sep,
        equalWidth: !sp.cols?.widths,
        widths: columnWidths(sp),
        preset: columnsPresetOf(sp),
        max: maxColumns(sp),
        contentWidthTwips: contentWidth(sp),
      },
    };
  }

  undo(): void { this.popHistory(this.undoStack, this.redoStack); }
  redo(): void { this.popHistory(this.redoStack, this.undoStack); }

  /** Insere quebra de página no caret (Ctrl+Enter). */
  insertPageBreak(): void {
    this.type('\f');
  }

  /** Insere um CAMPO no caret (variáveis de cabeçalho/rodapé do app de referência).
   *  O texto é o token que o paint substitui por página; ao salvar vira
   *  fldSimple e o próprio app de referência passa a atualizá-lo. */
  insertField(kind: 'PAGE' | 'NUMPAGES' | 'DATE'): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const display = kind === 'DATE' ? new Date().toLocaleDateString('pt-BR') : kind;
    const instr = kind === 'DATE' ? ' DATE \\@ "dd/MM/yyyy" ' : ` ${kind} `;
    const { para, offset } = this.selection.focus;
    const p = this.model.paragraphs[para]!;
    // insere como run separado com field (não funde com vizinhos)
    let acc = 0;
    let inserted = false;
    for (let ri = 0; ri <= p.runs.length; ri++) {
      const run = p.runs[ri];
      const re = acc + (run?.text.length ?? 0);
      if (offset <= re || ri === p.runs.length) {
        const fieldRun: Run = {
          text: display,
          props: run ? { ...run.props } : { ...DEFAULT_RUN_PROPS },
          field: instr,
        };
        if (!run) p.runs.push(fieldRun);
        else {
          const cut = offset - acc;
          const parts: Run[] = [];
          if (run.text.slice(0, cut)) parts.push({ text: run.text.slice(0, cut), props: { ...run.props }, ...(run.field ? { field: run.field } : {}) });
          parts.push(fieldRun);
          if (run.text.slice(cut)) parts.push({ text: run.text.slice(cut), props: { ...run.props }, ...(run.field ? { field: run.field } : {}) });
          p.runs.splice(ri, 1, ...parts);
        }
        inserted = true;
        break;
      }
      acc = re;
    }
    if (!inserted) return;
    const np = { para, offset: offset + display.length };
    this.selection = { anchor: np, focus: np };
    this.refresh();
  }

  // ───────────────── sumário (TOC) ─────────────────

  /** Gera/atualiza o sumário a partir dos títulos, com páginas do NOSSO
   *  layout e leader pontilhado — o equivalente do F9 do app de referência. */
  updateToc(): boolean {
    if (!this.model || this.locked()) return false;
    const tocIdx = this.model.paragraphs.findIndex((p) => p.props.tocInstr);
    if (tocIdx < 0) return false;
    // atualização de campo ≠ edição (não dispara autosave)
    this.quietChange = true;
    this.snapshot();
    this.quietChange = false;

    // remove entradas antigas (e o resíduo vazio do campo logo após)
    let end = tocIdx + 1;
    while (
      end < this.model.paragraphs.length &&
      (this.model.paragraphs[end]!.props.tocEntry ||
        (end === tocIdx + 1 && paraLength(this.model.paragraphs[end]!) === 0 && !this.model.paragraphs[end]!.props.styleId))
    ) end++;
    const removed = end - (tocIdx + 1);
    this.model.paragraphs.splice(tocIdx + 1, removed);
    this.shiftAnchors(tocIdx, -removed);

    // níveis do instr: TOC \o "1-3"
    const instr = this.model.paragraphs[tocIdx]!.props.tocInstr!;
    const range = instr.match(/\\o\s+"(\d)-(\d)"/);
    const minLvl = range ? parseInt(range[1]!, 10) : 1;
    const maxLvl = range ? parseInt(range[2]!, 10) : 3;

    const s = this.sect();
    const contentW = s.pageWidthTwips - s.marginLeftTwips - s.marginRightTwips;
    const entries: Paragraph[] = [];
    this.model.paragraphs.forEach((p, pi) => {
      const m = p.props.styleId?.match(/^(?:Heading|Ttulo)(\d)$/);
      if (!m) return;
      const lvl = parseInt(m[1]!, 10);
      if (lvl < minLvl || lvl > maxLvl) return;
      const page = (this.layoutCache[pi]?.lines[0]?.page ?? 0) + 1;
      const text = paraText(p).replace(/[\f\n]/g, '').trim();
      if (!text) return;
      entries.push({
        runs: [{
          text: `${text}\t${page}`,
          props: { ...DEFAULT_RUN_PROPS, link: `#para:${pi}`, color: lvl === 1 ? undefined : '444444' },
        }],
        props: {
          tocEntry: true,
          indentLeftTwips: (lvl - 1) * 220 || undefined,
          spaceAfterTwips: 40,
          tabStops: [{ posTwips: contentW, align: 'right', leader: 'dot' }],
        },
      });
    });
    this.model.paragraphs.splice(tocIdx + 1, 0, ...entries);
    this.shiftAnchors(tocIdx, entries.length);
    this.refresh();
    return true;
  }

  /** Navega para um destino interno: "#para:N" ou "#bookmark". */
  navigateTo(link: string): boolean {
    if (!link.startsWith('#')) return false;
    // destino é um parágrafo do corpo: sai da célula em edição
    if (this.cellEdit) { this.exitCell(); this.refreshSelection(); }
    let paraIdx = -1;
    const pm = link.match(/^#para:(\d+)$/);
    if (pm) paraIdx = parseInt(pm[1]!, 10);
    else if (this.bookmarkParas.has(link.slice(1))) paraIdx = this.bookmarkParas.get(link.slice(1))!;
    else {
      const blockIdx = this.fullDoc?.bookmarks.get(link.slice(1));
      if (blockIdx !== undefined && this.fullDoc) {
        let count = 0;
        for (let b = 0; b < blockIdx && b < this.fullDoc.blocks.length; b++) {
          if (this.fullDoc.blocks[b]!.type === 'paragraph') count++;
        }
        paraIdx = count;
      }
    }
    const line = this.layoutCache[paraIdx]?.lines[0];
    if (!line) return false;
    const canvas = this.canvases[line.page];
    if (!canvas) return false;
    this.animateScrollTo(Math.max(0, canvas.offsetTop + line.yTwips * PX_PER_TWIP * this.zoom - 60));
    return true;
  }

  // ───────────────── comentários (anotações) ─────────────────

  getComments(): { id: number; author?: string; text: string }[] {
    return this.fullDoc?.comments ?? [];
  }

  /**
   * Posição CSS-pixel (top-left + altura) da PRIMEIRA linha que carrega este
   * comentário, no espaço de scroll do editor (somando canvas.offsetTop ao
   * y da linha). Permite à camada DOM posicionar cards "inline" alinhados ao
   * trecho anotado (gap do app de referência: comentários na margem como o Google Docs).
   */
  commentAnchorPx(id: number): { topPx: number; heightPx: number; page: number } | null {
    if (!this.model) return null;
    const scale = PX_PER_TWIP * this.zoom;
    // 1) procura no corpo (parágrafos top-level)
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      const para = this.model.paragraphs[pi]!;
      const has = para.runs.some((r) => r.props.commentIds?.includes(id));
      if (!has) continue;
      const line = this.layoutCache[pi]?.lines[0];
      if (!line) return null;
      const canvas = this.canvases[line.page];
      if (!canvas) return null;
      return {
        topPx: canvas.offsetTop + line.yTwips * scale,
        heightPx: line.heightTwips * scale,
        page: line.page,
      };
    }
    // motor: linhas das células (e do corpo, se o modelo é o de uma célula)
    if (this.eng) {
      for (const el of this.eng.lines) {
        const para = el.para;
        if (!para?.runs.some((r) => r.props.commentIds?.includes(id))) continue;
        const canvas = this.canvases[el.page];
        if (!canvas) return null;
        return { topPx: canvas.offsetTop + el.line.y * scale, heightPx: el.line.height * scale, page: el.page };
      }
      return null;
    }
    // 2) procura em tabelas (cells.paragraphs e tables aninhadas)
    for (const tl of this.tableLayouts) {
      const hit = this.findCommentRowInTable(tl.table, id);
      if (!hit) continue;
      const canvas = this.canvases[tl.page];
      if (!canvas) return null;
      const cellTopRel = tl.rowYs[hit.row] ?? 0;
      const cellHeightTwips = (tl.rowYs[hit.row + 1] ?? tl.heightTwips) - cellTopRel;
      const cellTopAbs = tl.yTwips + cellTopRel;
      return {
        topPx: canvas.offsetTop + cellTopAbs * scale,
        heightPx: cellHeightTwips * scale,
        page: tl.page,
      };
    }
    return null;
  }

  /** Acha a 1ª linha (e coluna, p/ debug) de uma tabela onde algum run carrega o commentId. */
  private findCommentRowInTable(table: TableBlock, id: number): { row: number; col: number } | null {
    for (let ri = 0; ri < table.rows.length; ri++) {
      const row = table.rows[ri]!;
      for (let ci = 0; ci < row.cells.length; ci++) {
        const cell = row.cells[ci]!;
        if (cell.paragraphs.some((p) => p.runs.some((r) => r.props.commentIds?.includes(id)))) {
          return { row: ri, col: ci };
        }
        for (const nt of cell.tables) {
          const nested = this.findCommentRowInTable(nt, id);
          if (nested) return { row: ri, col: ci }; // pai cobre a linha da nested
        }
      }
    }
    return null;
  }


  /** Comenta a seleção atual. Retorna o id (ou null sem seleção). */
  addComment(text: string, author = 'You'): number | null {
    if (!this.model || !this.hasSelection() || !text.trim() || this.locked()) return null;
    if (!this.fullDoc) {
      this.fullDoc = {
        blocks: [], sections: [], footnotes: new Map(), endnotes: new Map(),
        comments: [], styles: new Map(), bookmarks: new Map(),
      };
    }
    this.snapshot();
    const id = this.fullDoc.comments.reduce((m, c) => Math.max(m, c.id), -1) + 1;
    applyRunProps(this.model, this.range(), { commentIds: [id] });
    this.fullDoc.comments.push({ id, author, text: text.trim() });
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-comments-changed'));
    return id;
  }

  removeComment(id: number): void {
    if (!this.fullDoc || !this.model) return;
    this.snapshot();
    this.fullDoc.comments = this.fullDoc.comments.filter((c) => c.id !== id);
    for (const p of this.model.paragraphs) {
      for (const run of p.runs) {
        if (run.props.commentIds) {
          run.props.commentIds = run.props.commentIds.filter((i) => i !== id);
          if (run.props.commentIds.length === 0) delete run.props.commentIds;
        }
      }
    }
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-comments-changed'));
  }

  /** Seleciona e rola até o intervalo do comentário. */
  goToComment(id: number): void {
    if (!this.model) return;
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      let acc = 0;
      for (const run of this.model.paragraphs[pi]!.runs) {
        if (run.props.commentIds?.includes(id)) {
          this.selection = {
            anchor: { para: pi, offset: acc },
            focus: { para: pi, offset: acc + run.text.length },
          };
          this.refreshSelection();
          this.navigateTo(`#para:${pi}`);
          return;
        }
        acc += run.text.length;
      }
    }
  }

  selectAll(): void {
    if (!this.model) return;
    const lastP = this.model.paragraphs.length - 1;
    this.selection = {
      anchor: { para: 0, offset: 0 },
      focus: { para: lastP, offset: paraLength(this.model.paragraphs[lastP]!) },
    };
    this.refreshSelection();
  }

  // imagens
  private bitmaps = new WeakMap<object, ImageBitmap | 'loading'>();
  private bitmapFor(
    img: { data: Uint8Array; ext: string; svg?: Uint8Array; widthTwips?: number; heightTwips?: number },
  ): ImageBitmap | null {
    const cached = this.bitmaps.get(img);
    if (cached === 'loading') return null;
    if (cached) return cached;
    this.bitmaps.set(img, 'loading');
    // Preferir a versão VETORIAL (asvg:svgBlip), como o Word: rasteriza o SVG
    // em alta resolução em vez de esticar o PNG de fallback (que pixeliza).
    if (img.svg) { this.rasterizeSvg(img); return null; }
    const copy = new Uint8Array(img.data);
    void createImageBitmap(new Blob([copy.buffer], { type: `image/${img.ext === 'jpg' ? 'jpeg' : img.ext}` }))
      .then((bmp) => { this.bitmaps.set(img, bmp); this.imagesVersion++; this.paint(); })
      .catch(() => this.bitmaps.set(img, undefined as never));
    return null;
  }

  /** Rasteriza um SVG (asvg:svgBlip) num bitmap com supersampling, para o
   *  desenho ficar nítido no zoom/DPI do editor — como o vetor do Word. */
  private rasterizeSvg(img: { svg?: Uint8Array; widthTwips?: number; heightTwips?: number }): void {
    const text = new TextDecoder().decode(img.svg!);
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    const el = new Image();
    el.onload = () => {
      try {
        const SS = 3; // supersample
        const wPx = Math.min(4096, Math.max(1, Math.round((img.widthTwips ?? el.width) * PX_PER_TWIP * SS)));
        const hPx = Math.min(4096, Math.max(1, Math.round((img.heightTwips ?? el.height) * PX_PER_TWIP * SS)));
        const oc = document.createElement('canvas');
        oc.width = wPx; oc.height = hPx;
        const octx = oc.getContext('2d')!;
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(el, 0, 0, wPx, hPx);
        void createImageBitmap(oc)
          .then((bmp) => { this.bitmaps.set(img as object, bmp); this.imagesVersion++; this.paint(); })
          .catch(() => this.bitmaps.set(img as object, undefined as never));
      } catch { this.bitmaps.set(img as object, undefined as never); }
      URL.revokeObjectURL(url);
    };
    el.onerror = () => { this.bitmaps.set(img as object, undefined as never); URL.revokeObjectURL(url); };
    el.src = url;
  }

  /** Insere imagem no caret. Dimensões naturais a 96dpi, limitada à coluna. */
  async insertImage(data: Uint8Array, ext: string): Promise<void> {
    if (!this.model || this.locked()) return;
    const copy = new Uint8Array(data);
    const bmp = await createImageBitmap(
      new Blob([copy.buffer], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` }),
    );
    let w = bmp.width * 15;  // px@96dpi → twips
    let h = bmp.height * 15;
    const maxW = this.contentWidthTwips();
    if (w > maxW) { h = (h * maxW) / w; w = maxW; }
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const { para, offset } = this.selection.focus;
    const p = this.model.paragraphs[para]!;
    // localiza o run no offset e divide manualmente para inserir o run de imagem
    let acc = 0;
    let inserted = false;
    for (let ri = 0; ri <= p.runs.length; ri++) {
      const run = p.runs[ri];
      const rs = acc;
      const re = acc + (run?.text.length ?? 0);
      if (offset <= re || ri === p.runs.length) {
        const imageRun = {
          text: '￼',
          props: run ? { ...run.props } : { ...DEFAULT_RUN_PROPS },
          image: { data: copy, ext, widthTwips: w, heightTwips: h },
        };
        if (!run) {
          p.runs.push(imageRun);
        } else {
          const cut = offset - rs;
          const parts = [];
          if (run.text.slice(0, cut)) parts.push({ text: run.text.slice(0, cut), props: { ...run.props } });
          parts.push(imageRun);
          if (run.text.slice(cut)) parts.push({ text: run.text.slice(cut), props: { ...run.props } });
          p.runs.splice(ri, 1, ...parts);
        }
        inserted = true;
        break;
      }
      acc = re;
    }
    if (!inserted) return;
    this.selection = { anchor: { para, offset: offset + 1 }, focus: { para, offset: offset + 1 } };
    this.refresh();
  }

  /** Abre o seletor de arquivo para TROCAR a imagem flutuante selecionada
   *  (ex.: o logo do rodapé), mantendo posição/tamanho. */
  private promptReplaceImage(): void {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.style.display = 'none';
    inp.addEventListener('change', async () => {
      const file = inp.files?.[0];
      inp.remove();
      if (!file) return;
      const buf = new Uint8Array(await file.arrayBuffer());
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      await this.replaceSelectedImage(buf, ext);
    });
    document.body.appendChild(inp);
    inp.click();
  }

  /** Substitui os bytes da imagem selecionada, mantendo âncora/posição/tamanho.
   *  Sobrescreve a mídia referenciada no pacote e remove a versão vetorial
   *  (asvg:svgBlip) do XML cru, para o Word passar a exibir a nova imagem. */
  private async replaceSelectedImage(data: Uint8Array, ext: string): Promise<void> {
    const h = this.selectedFloat();
    if (!h || h.kind !== 'image') return;
    const img = h.obj as InlineImage;
    this.snapshot();
    const copy = new Uint8Array(data);
    const rid = /<a:blip[^>]*r:embed="([^"]+)"/.exec(img.rawDrawingXml ?? '')?.[1];
    if (rid && this.pkg) {
      const relsPath = this.hfEdit
        ? `word/_rels/${this.hfEdit.path.split('/').pop()}.rels`
        : 'word/_rels/document.xml.rels';
      const mediaPath = this.resolveMediaPath(rid, relsPath);
      if (mediaPath) this.pkg.setPart(mediaPath, copy);
    }
    if (img.rawDrawingXml) {
      // remove o svgBlip (senão o Word continua mostrando o vetor antigo)
      img.rawDrawingXml = img.rawDrawingXml.replace(
        /<a:extLst>[\s\S]*?<\/a:extLst>/g, (m) => (m.includes('svgBlip') ? '' : m));
    }
    img.data = copy;
    img.ext = ext;
    img.svg = undefined;
    this.bitmaps.delete(img as object);
    if (this.hfEdit) this.dirtyHf.add(this.hfEdit.path);
    this.refresh();
    this.dispatchEvent(new CustomEvent('uw-change'));
  }

  /** Resolve rId → caminho da parte de mídia no pacote (via a parte .rels). */
  private resolveMediaPath(rid: string, relsPath: string): string | null {
    const rels = this.pkg?.getPartText(relsPath);
    if (!rels) return null;
    const m = new RegExp(`Id="${rid}"[^>]*?Target="([^"]+)"`).exec(rels);
    if (!m) return null;
    let target = m[1]!;
    if (/^https?:/i.test(target)) return null;
    target = target.replace(/^\.\//, '');
    if (!target.startsWith('word/')) target = `word/${target.replace(/^\/+/, '')}`;
    return target;
  }

  saveDocx(): Uint8Array {
    if (!this.model) throw new Error('no document');
    if (this.hfEdit) this.exitHeaderFooter(); // salva sempre a partir do corpo
    // na célula de tabela o modelo é o DELA: o corpo vem de bodyState
    if (this.cellEdit?.cell.blocks) this.cellEdit.cell.blocks = reconcileBlocks(this.cellEdit.cell.blocks, this.cellEdit.cell.paragraphs, false);
    const body = this.bodyState().model;
    const pkg = this.pkg ?? DocxPackage.empty();
    this.syncSections();
    const sections = this.bodyState().sectionStarts.map((s) => s.section);
    // cabeçalhos/rodapés de TODAS as seções (refs únicas por path); a última
    // seção referencia no sectPr do body, as demais no pPr/sectPr (sectionBreak)
    const hfParts: HfPartInfo[] = [];
    const seenPath = new Set<string>();
    for (const section of sections) {
      for (const [kind, refs, set, blockSet] of [
        ['header', section.headerRefs, section.headers, section.headerBlocks],
        ['footer', section.footerRefs, section.footers, section.footerBlocks],
      ] as const) {
        for (const ref of refs) {
          if (seenPath.has(ref.path)) continue;
          const paragraphs = set[ref.type];
          if (!paragraphs) continue;
          seenPath.add(ref.path);
          hfParts.push({
            kind, type: ref.type, rid: ref.rid, path: ref.path,
            paragraphs, dirty: this.dirtyHf.has(ref.path),
            // tabelas do cabeçalho: os blocos alinhados aos parágrafos editados
            blocks: reconcileBlocks(blockSet?.[ref.type], paragraphs, true),
          });
        }
      }
    }
    // refs do body = última seção (as outras vão nos sectionBreak dos parágrafos)
    const lastSec = sections[sections.length - 1];
    const bodyParts = lastSec
      ? hfParts.filter((h) =>
          [...lastSec.headerRefs, ...lastSec.footerRefs].some((r) => r.path === h.path))
      : hfParts;

    // reconstrói o fluxo de blocos: parágrafos + tabelas ancoradas, na ordem
    const blocks: Block[] = [];
    body.paragraphs.forEach((paragraph, pi) => {
      for (const a of this.tableAnchors) {
        if (a.beforePara === pi) blocks.push(a.table);
      }
      blocks.push({ type: 'paragraph', paragraph });
    });
    for (const a of this.tableAnchors) {
      if (a.beforePara >= body.paragraphs.length) blocks.push(a.table);
    }

    // body sectPr = ÚLTIMA seção (paisagem do catálogo mora aqui)
    const saveModel: DocumentModel = { paragraphs: body.paragraphs, sectPr: lastSec?.sectPr ?? body.sectPr };

    writeDocument(pkg, saveModel, hfParts, {
      comments: this.fullDoc?.comments?.length ? this.fullDoc.comments : undefined,
      bodySectRefs: bodyParts.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid })),
      blocks: this.tableAnchors.length || this.fullDoc?.sources ? blocks : undefined,
      sources: this.fullDoc?.sources,
    });
    // folha de estilos: só regrava a parte se algum estilo mudou (o resto byte a byte)
    if (this.docStyles.dirty && this.docStyles.xml) writeStylesPart(pkg, this.docStyles.xml);
    // estilos de tabela internos que as tabelas passaram a usar
    addStylesXml(pkg, this.pendingTableStyles);
    return pkg.save();
  }

  /** Monta o documento de exportação a partir do estado VIVO do editor. */
  private buildExportDoc(title?: string, imageDataUris?: WeakMap<{ data: Uint8Array; ext: string }, string>): ExportDoc {
    return {
      title,
      paragraphs: this.model?.paragraphs.map((paragraph) => this.withPluginFallback(paragraph)) ?? [],
      tableAnchors: this.tableAnchors,
      comments: this.fullDoc?.comments ?? [],
      footnotes: this.fullDoc?.footnotes,
      endnotes: this.fullDoc?.endnotes,
      sectPr: this.model?.sectPr,
      imageDataUris,
    };
  }

  private withPluginFallback(paragraph: Paragraph): Paragraph {
    return {
      props: paragraph.props,
      runs: paragraph.runs.map((run) => run.custom ? {
        text: run.custom.fallbackText,
        props: run.props,
      } : run),
    };
  }

  /**
   * Pré-comprime as imagens do documento para inclusão em HTML/Markdown:
   * decode → downsample (lado max ~1200px) → JPEG quality 0.78 → data URI.
   * Imagens muito pequenas (≤ MAX_DIMENSION CSS px) ficam só re-encodadas
   * sem resize; PNGs minúsculos (< 32KB) ficam intactos. O resultado é um
   * WeakMap consumido pelos exportadores via `resolveImageUri`.
   *
   * Sem isso, fotos do .docx (PNGs grandes) gerariam data URIs gigantescos
   * (catálogo: 72MB) que muitos viewers de Markdown não renderizam.
   */
  private async compressImagesForExport(): Promise<WeakMap<{ data: Uint8Array; ext: string }, string>> {
    const MAX_DIM = 1200;
    const QUALITY = 0.78;
    const PASSTHROUGH_KB = 32;
    const cache = new WeakMap<{ data: Uint8Array; ext: string }, string>();
    const imgs = this.collectImages();
    const seen = new Set<{ data: Uint8Array; ext: string }>();
    const tasks = imgs.map(async (img) => {
      if (seen.has(img)) return;
      seen.add(img);
      // PNG muito pequeno: deixa como está (já é eficiente)
      if (img.data.byteLength <= PASSTHROUGH_KB * 1024) {
        cache.set(img, `data:${this.mimeFor(img.ext)};base64,${this.toBase64(img.data)}`);
        return;
      }
      try {
        const mime = this.mimeFor(img.ext);
        const blob = new Blob([img.data.slice().buffer as ArrayBuffer], { type: mime });
        const bmp = await createImageBitmap(blob);
        const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
        const w = Math.max(1, Math.round(bmp.width * scale));
        const h = Math.max(1, Math.round(bmp.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // achata alpha em branco
        ctx.drawImage(bmp, 0, 0, w, h);
        bmp.close?.();
        const dataUri: string = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => {
            if (!b) { reject(new Error('canvas.toBlob returned null')); return; }
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.onerror = () => reject(fr.error);
            fr.readAsDataURL(b);
          }, 'image/jpeg', QUALITY);
        });
        cache.set(img, dataUri);
      } catch {
        // fallback: data URI sem compressão
        cache.set(img, `data:${this.mimeFor(img.ext)};base64,${this.toBase64(img.data)}`);
      }
    });
    await Promise.all(tasks);
    return cache;
  }

  private mimeFor(ext: string): string {
    const e = ext.toLowerCase();
    if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
    if (e === 'png') return 'image/png';
    if (e === 'gif') return 'image/gif';
    if (e === 'bmp') return 'image/bmp';
    if (e === 'webp') return 'image/webp';
    return `image/${e}`;
  }

  private toBase64(bytes: Uint8Array): string {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  /** Exporta HTML semântico e fluido (web-first; reflui, não pagina). */
  async exportHtml(title?: string, opts: { images?: 'data' | 'omit' } = {}): Promise<string> {
    const cache = opts.images === 'omit' ? undefined : await this.compressImagesForExport();
    return toHtml(this.buildExportDoc(title, cache), { title, images: opts.images });
  }

  /** Exporta Markdown (GitHub Flavored). */
  async exportMarkdown(title?: string, opts: { images?: 'data' | 'omit' } = {}): Promise<string> {
    const cache = opts.images === 'omit' ? undefined : await this.compressImagesForExport();
    return toMarkdown(this.buildExportDoc(title, cache), { title, images: opts.images });
  }

  /**
   * Exporta ODT (OpenDocument Text) p/ LibreOffice/OpenOffice. Reconstrói um
   * FullDocument leve a partir do estado VIVO do editor (model + tableAnchors)
   * — passa pelo writeOdt do docx-core (src/odf).
   */
  exportOdt(opts: { images?: 'embed' | 'omit' } = {}): Uint8Array {
    if (!this.model) throw new Error('document not loaded');
    // remonta blocks na ordem (parágrafo / tabela), igual ao saveDocx
    const blocks: Block[] = [];
    this.model.paragraphs.forEach((paragraph, pi) => {
      for (const a of this.tableAnchors) {
        if (a.beforePara === pi) blocks.push(a.table);
      }
      blocks.push({ type: 'paragraph', paragraph: this.withPluginFallback(paragraph) });
    });
    for (const a of this.tableAnchors) {
      if (a.beforePara >= this.model!.paragraphs.length) blocks.push(a.table);
    }
    const fd: FullDocument = {
      blocks,
      sections: [{
        sectPr: this.model.sectPr,
        blockStart: 0,
        blockEnd: blocks.length,
        headers: {}, footers: {}, headerRefs: [], footerRefs: [],
      }],
      footnotes: this.fullDoc?.footnotes ?? new Map(),
      endnotes: this.fullDoc?.endnotes ?? new Map(),
      comments: this.fullDoc?.comments ?? [],
      styles: this.fullDoc?.styles ?? new Map(),
      bookmarks: this.fullDoc?.bookmarks ?? new Map(),
    };
    return writeOdt(fd, { images: opts.images });
  }

  focusEditor(): void { this.input.focus({ preventScroll: true }); }

  /** True when a pointer event originated in the built-in top/bottom bars.
   *  They live inside the host shadow, so their events bubble up to the
   *  document-level pointer handlers — without this guard a click on a
   *  toolbar control would hit-test the canvas behind the (sticky) bar,
   *  collapse the selection, and steal focus (closing native dropdowns).
   *  composedPath() is required because the event target is retargeted to
   *  the host by the time it reaches these listeners. */
  private eventInChrome(e: Event): boolean {
    const path = e.composedPath();
    return path.includes(this.topbarEl) || path.includes(this.bottombarEl);
  }

  /** Página atualmente visível (centro do viewport), 1-based. */
  currentPage(): number {
    const center = this.scrollTop + (this.clientHeight || 900) / 2;
    let best = 0;
    let bestDist = Infinity;
    this.canvases.forEach((c, i) => {
      const mid = c.offsetTop + c.offsetHeight / 2;
      const d = Math.abs(mid - center);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return Math.min(best + 1, this.pageCount); // no contínuo há tiles, mas 1 página lógica
  }

  /** Estatísticas para a barra de status (como a do app de referência). */
  stats(): { pages: number; words: number; chars: number; paragraph: number; page: number } {
    let words = 0, chars = 0;
    if (this.model) {
      for (const p of this.model.paragraphs) {
        const t = this.plainTextSlice(p, 0, paraLength(p));
        chars += t.length;
        words += (t.match(/\S+/g) ?? []).length;
      }
    }
    return {
      pages: this.pageCount,
      page: this.currentPage(),
      words,
      chars,
      paragraph: this.selection.focus.para + 1,
    };
  }

  /** Imprime: abre janela com as páginas como imagens (visão de impressão). */
  async print(): Promise<void> {
    // host (Electron): diálogo de impressão do sistema com as páginas prontas —
    // o shell bloqueia janelas novas
    const host = (this as { host?: import('./chrome-host.js').UniversalWriteHost | null }).host;
    if (host?.print) {
      await host.print({ pages: await this.printPages(), title: this.title || 'Write' });
      return;
    }
    // a janela abre ANTES de qualquer await (bloqueador de pop-up exige o gesto)
    const win = window.open('', '_blank');
    if (!win) return;
    const wasView = this.view;
    if (wasView !== 'print') this.setView('print');
    await this.ensureImagesDecoded();
    // toda página é pintada aqui: com a virtualização, as fora da tela não têm buffer
    const imgs = this.canvases.map((_, i) => `<img src="${this.pageImageForPrint(i)}" style="width:100%;page-break-after:always"/>`);
    if (wasView !== 'print') this.setView(wasView);
    win.document.write(`<!doctype html><title>Write — imprimir</title><body style="margin:0">${imgs.join('')}</body>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 200);
  }

  /** Páginas "como impressas" (dataURLs PNG), uma por folha. */
  async printPages(): Promise<string[]> {
    const wasView = this.view;
    if (wasView !== 'print') this.setView('print');
    await this.ensureImagesDecoded();
    const pages = this.canvases.map((_, i) => this.pageImageForPrint(i));
    if (wasView !== 'print') this.setView(wasView);
    return pages;
  }

  /** PNG (dataURL) da página `i` "como impressa" (sem adornos de tela) a
   *  96 dpi × devicePixelRatio. Aloca o buffer só durante a captura. */
  private pageImageForPrint(i: number): string {
    const c = this.canvases[i];
    if (!c) return '';
    const had = this.allocatedPages.has(i);
    const bs = this.bufferScaleFor(c);
    c.width = Math.round(parseFloat(c.style.width) * bs);
    c.height = Math.round(parseFloat(c.style.height) * bs);
    this.allocatedPages.add(i);
    const prev = this.printRender;
    this.printRender = true;
    try {
      this.paint(new Set([i]));
      return c.toDataURL('image/png');
    } finally {
      this.printRender = prev;
      if (had) this.paint(new Set([i]));
      else { c.width = 1; c.height = 1; this.allocatedPages.delete(i); }
    }
  }

  // ───────────────────────── edição ─────────────────────────

  private currentProps(): RunProps {
    if (!this.model) return { ...DEFAULT_RUN_PROPS };
    return propsAt(this.model, this.selection.focus);
  }
  private hasSelection(): boolean {
    return comparePos(this.selection.anchor, this.selection.focus) !== 0;
  }
  private range(): DocRange {
    return { start: this.selection.anchor, end: this.selection.focus };
  }
  private formatRuns(patch: Partial<RunProps>): void {
    if (!this.model || this.locked()) return;
    if (this.hasSelection()) {
      this.snapshot();
      if (this.selection.anchor.para === this.selection.focus.para) this.noteParaEdit(this.selection.focus.para);
      applyRunProps(this.model, this.range(), patch);
      this.refresh();
    } else {
      this.pendingProps = { ...(this.pendingProps ?? this.currentProps()), ...patch };
      this.onSelectionChange?.(); this.chromeSync?.();
    }
  }
  private formatPara(patch: Partial<ParaProps>): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    applyParaProps(this.model, this.range(), patch);
    this.refresh();
  }

  // imagens são imutáveis: o snapshot guarda só um índice no pool em vez
  // dos bytes (senão JSON.stringify estoura com docs de 50MB de mídia)
  private imgPool: Uint8Array[] = [];
  private imgPoolIdx = new WeakMap<Uint8Array, number>();

  private stringifyState(): string {
    // cabeçalho/rodapé e caixa de texto têm pilha própria (o modelo é o deles);
    // corpo e célula de tabela dividem a do corpo: o estado leva o corpo, as
    // TABELAS e a célula ativa (desfazer uma operação de tabela, ou texto
    // digitado numa célula depois de sair dela, como no Word)
    const own = this.hfEdit || this.tbEdit;
    const ce = own ? null : this.cellEdit;
    // blocos da célula em edição alinhados aos parágrafos (relink ao desfazer)
    if (ce?.cell.blocks) ce.cell.blocks = reconcileBlocks(ce.cell.blocks, ce.cell.paragraphs, false);
    return JSON.stringify({
      m: ce ? ce.saved.model : this.model,
      s: ce ? ce.saved.selection : this.selection,
      // versão da folha de estilos (as versões ficam em DocStyles)
      sv: this.docStyles.version,
      // âncoras de tabela e indicadores (deslocados por Enter/Backspace); as
      // seções (sectPr, refs) moram no modelo e voltam com ele
      anc: own ? undefined : {
        t: this.tableAnchors.map((a) => a.beforePara),
        b: [...this.bookmarkParas],
      },
      tb: own ? undefined : this.tableAnchors.map((a) => a.table),
      ce: ce ? { a: ce.anchor, h: ce.hops, s: this.selection } : undefined,
      ts: own ? undefined : this.tableSel ?? undefined,
    }, (key, value) => {
      if (value instanceof Uint8Array) {
        let idx = this.imgPoolIdx.get(value);
        if (idx === undefined) {
          idx = this.imgPool.length;
          this.imgPool.push(value);
          this.imgPoolIdx.set(value, idx);
        }
        return { __imgPool: idx };
      }
      return value;
    });
  }
  private parseState(json: string): {
    m: DocumentModel;
    s: { anchor: DocPosition; focus: DocPosition };
    anc?: { t: number[]; b: [string, number][] };
    sv?: number;
    tb?: TableBlock[];
    ce?: { a: number; h: CellHop[]; s: { anchor: DocPosition; focus: DocPosition } };
    ts?: TableSel;
  } {
    return JSON.parse(json, (key, value) =>
      value && typeof value === 'object' && '__imgPool' in value
        ? this.imgPool[(value as { __imgPool: number }).__imgPool]
        : value,
    );
  }

  /** Mudanças de campo (Atualizar Campos) não contam como edição p/ autosave. */
  private quietChange = false;
  /** Edições desde a carga: sem nenhuma, o PDF sai dos bytes ORIGINAIS (o
   *  .docx regravado pelo modelo de edição ainda não preserva tudo). */
  private editsSinceLoad = 0;
  private loadedBytes: Uint8Array | null = null;

  private snapshot(): void {
    if (!this.model) return;
    this.editsSinceLoad++;
    if (this.hfEdit) this.dirtyHf.add(this.hfEdit.path);
    this.undoStack.push(this.stringifyState());
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack.length = 0;
    if (!this.quietChange) {
      this.dispatchEvent(new CustomEvent('uw-change'));
    }
  }
  private popHistory(from: string[], to: string[]): void {
    if (!this.model || from.length === 0) return;
    this.floatSel = null; // o modelo é recriado → referência de run fica obsoleta
    to.push(this.stringifyState());
    const state = this.parseState(from.pop()!);
    if (this.hfEdit || this.tbEdit) {
      // cabeçalho/caixa: o array de parágrafos É o do documento (parte do HF,
      // caixa de texto) — restaura no lugar para não desligá-lo
      const linked = this.model.paragraphs;
      linked.splice(0, linked.length, ...state.m.paragraphs);
      this.model = { ...state.m, paragraphs: linked };
      this.selection = state.s;
    } else {
      const wasCell = !!this.cellEdit;
      this.cellEdit = null;
      this.model = state.m;
      this.selection = state.s;
      this.tableSel = state.ts ?? null;
      // âncoras de tabela/indicador acompanham o desfazer (Enter desfeito não
      // pode deixar a tabela um parágrafo abaixo); as tabelas voltam inteiras
      if (state.anc) {
        if (state.tb) {
          this.tableAnchors = state.tb.map((table, i) => ({ beforePara: state.anc!.t[i] ?? 0, table: TOps.relink(table) }));
          for (const a of this.tableAnchors) this.syncTableRPr(a.table);
        } else state.anc.t.forEach((v, i) => { const a = this.tableAnchors[i]; if (a) a.beforePara = v; });
        this.bookmarkParas = new Map(state.anc.b);
      }
      // de volta à célula em que o estado foi tirado
      if (state.ce) {
        const t = this.tableAnchors[state.ce.a]?.table;
        const cell = t ? resolveCell(t, state.ce.h) : null;
        if (cell) {
          this.cellEdit = { anchor: state.ce.a, hops: state.ce.h, cell, saved: { model: this.model, selection: this.selection } };
          this.model = { paragraphs: cell.paragraphs, sectPr: this.model.sectPr };
          this.selection = state.ce.s;
        }
      }
      if (wasCell !== !!this.cellEdit) this.dispatchEvent(new CustomEvent('uw-cellmode', { detail: { active: !!this.cellEdit } }));
    }
    if (state.sv !== undefined && this.docStyles.restore(state.sv)) this.syncStyleSheet();
    this.refresh();
  }

  /** deleteRange com ajuste de âncoras de tabela/seção. */
  private deleteSelection(): DocPosition {
    const { start, end } = normalizeRange(this.range());
    const delta = end.para - start.para;
    // tabelas entre os parágrafos selecionados saem com eles (como no Word)
    if (delta > 0 && !this.cellEdit && !this.hfEdit && !this.tbEdit) {
      this.tableAnchors = this.tableAnchors.filter((a) => a.beforePara <= start.para || a.beforePara > end.para);
    }
    const pos = deleteRange(this.model!, this.range());
    if (delta > 0) this.shiftAnchors(start.para, -delta);
    return pos;
  }

  private type(text: string): void {
    if (!this.model || this.locked()) return;
    const before = new CustomEvent('uw-before-input', {
      cancelable: true,
      detail: { text },
    });
    if (!this.dispatchEvent(before)) return;
    this.snapshot();
    // células selecionadas: o Word limpa o conteúdo e digita na 1ª
    if (this.tableSel) { this.clearSelectedCells(false); this.tableSel = null; }
    else if (this.selection.anchor.para === this.selection.focus.para) this.noteParaEdit(this.selection.focus.para);
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const props = this.pendingProps ?? undefined;
    const pos = insertText(this.model, this.selection.focus, text, props);
    this.pendingProps = null;
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
    this.dispatchEvent(new CustomEvent('uw-input', { detail: { text } }));
  }

  private pressEnter(): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const at = this.selection.focus.para;
    const atEnd = this.selection.focus.offset >= paraLength(this.model.paragraphs[at]!);
    const pos = splitParagraph(this.model, this.selection.focus);
    this.shiftAnchors(at, 1);
    // Enter no FIM de um parágrafo cujo estilo tem w:next: o novo vem com o
    // próximo estilo e sem formatação direta (oráculo: probe D)
    if (atEnd) this.applyNextStyle(this.model.paragraphs[at]!, this.model.paragraphs[at + 1]!);
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }

  private pressBackspace(): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.selection.anchor.para === this.selection.focus.para && (this.hasSelection() || this.selection.focus.offset > 0)) this.noteParaEdit(this.selection.focus.para);
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    } else {
      const { para, offset } = this.selection.focus;
      const prev = para > 0 ? this.model.paragraphs[para - 1]! : null;
      if (offset > 0) {
        const pos = deleteRange(this.model, {
          start: { para, offset: offset - 1 }, end: { para, offset },
        });
        this.selection = { anchor: pos, focus: pos };
      } else if (prev?.props.sectionBreak && !this.cellEdit && !this.hfEdit && !this.tbEdit) {
        // logo depois de uma quebra de seção o Word NÃO a apaga: pula a marca e
        // apaga o caractere antes dela — o fim do parágrafo da quebra, ou (vazio)
        // a marca do parágrafo anterior, que se funde a ele (oráculo bs-same, del-break-backspace)
        const len = paraLength(prev);
        let pos: DocPosition;
        if (len > 0) pos = deleteRange(this.model, { start: { para: para - 1, offset: len - 1 }, end: { para: para - 1, offset: len } });
        else if (para > 1) { pos = mergeWithPrevious(this.model, para - 1); this.shiftAnchors(para - 2, -1); }
        else pos = { para: para - 1, offset: 0 };
        this.selection = { anchor: pos, focus: pos };
      } else if (para > 0) {
        const pos = mergeWithPrevious(this.model, para);
        this.shiftAnchors(para - 1, -1);
        this.selection = { anchor: pos, focus: pos };
      } else { this.undoStack.pop(); return; }
    }
    this.refresh();
    this.scrollCaretIntoView();
  }

  private pressDelete(): void {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.selection.anchor.para === this.selection.focus.para && (this.hasSelection() || this.selection.focus.offset < paraLength(this.model.paragraphs[this.selection.focus.para]!))) this.noteParaEdit(this.selection.focus.para);
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    } else {
      const { para, offset } = this.selection.focus;
      const len = paraLength(this.model.paragraphs[para]!);
      if (offset < len) {
        deleteRange(this.model, { start: { para, offset }, end: { para, offset: offset + 1 } });
      } else if (para < this.model.paragraphs.length - 1) {
        mergeWithPrevious(this.model, para + 1);
      } else { this.undoStack.pop(); return; }
    }
    this.refresh();
  }

  /** Próxima fronteira de palavra a partir do caret. */
  private moveWord(dir: 1 | -1, extend: boolean): void {
    if (!this.model) return;
    let { para, offset } = this.selection.focus;
    const text = paraText(this.model.paragraphs[para]!);
    if (dir === 1) {
      if (offset >= text.length) {
        if (para < this.model.paragraphs.length - 1) { para++; offset = 0; }
      } else {
        while (offset < text.length && /\S/.test(text[offset]!)) offset++;
        while (offset < text.length && /\s/.test(text[offset]!)) offset++;
      }
    } else {
      if (offset === 0) {
        if (para > 0) { para--; offset = paraLength(this.model.paragraphs[para]!); }
      } else {
        while (offset > 0 && /\s/.test(text[offset - 1]!)) offset--;
        while (offset > 0 && /\S/.test(text[offset - 1]!)) offset--;
      }
    }
    const focus = { para, offset };
    this.selection = extend ? { anchor: this.selection.anchor, focus } : { anchor: focus, focus };
    this.refreshSelection();
    this.scrollCaretIntoView();
  }

  private deleteWord(dir: 1 | -1): void {
    if (!this.model || this.locked()) return;
    if (!this.hasSelection()) {
      const before = { ...this.selection.focus };
      this.moveWord(dir, false);
      const after = { ...this.selection.focus };
      if (comparePos(before, after) === 0) return;
      this.selection = { anchor: before, focus: after };
    }
    this.snapshot();
    if (this.selection.anchor.para === this.selection.focus.para) this.noteParaEdit(this.selection.focus.para);
    const pos = deleteRange(this.model, this.range());
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
  }

  private moveCaret(dir: 'left' | 'right' | 'up' | 'down' | 'home' | 'end', extend: boolean): void {
    if (!this.model) return;
    if (this.tableNavigate(dir, extend)) { this.pendingProps = null; return; }
    let { para, offset } = this.selection.focus;
    const len = (i: number) => paraLength(this.model!.paragraphs[i]!);
    if (dir === 'left') {
      if (offset > 0) offset--;
      else if (para > 0) { para--; offset = len(para); }
    } else if (dir === 'right') {
      if (offset < len(para)) offset++;
      else if (para < this.model.paragraphs.length - 1) { para++; offset = 0; }
    } else if (dir === 'home' || dir === 'end') {
      const line = this.lineOf({ para, offset });
      if (line) offset = dir === 'home' ? line.rich.start : this.lineEndOffset(line);
    } else {
      const line = this.lineOf({ para, offset });
      if (line) {
        const x = this.caretX({ para, offset }, line);
        const all = this.allLines();
        const idx = all.indexOf(line);
        const target = all[idx + (dir === 'down' ? 1 : -1)];
        if (target) {
          const hit = this.hitLineX(target, x);
          para = target.para; offset = hit;
        }
      }
    }
    const focus = { para, offset };
    this.selection = extend ? { anchor: this.selection.anchor, focus } : { anchor: focus, focus };
    this.pendingProps = null;
    this.refreshSelection();
    this.scrollCaretIntoView();
  }

  // ───────────────────────── eventos ─────────────────────────

  private bindEvents(): void {
    // Ctrl+scroll = zoom (10%–500%), ancorado no ponto sob o mouse
    this.addEventListener('wheel', (e) => {
      // Modo Leitura: scroll avança/volta um BLOCO de páginas (1 por gesto)
      if (this.view === 'read' && !e.ctrlKey) {
        e.preventDefault();
        if (Math.abs(e.deltaY) < 4 || this.readWheelLock) return;
        this.readWheelLock = true;
        setTimeout(() => { this.readWheelLock = false; }, 450);
        this.nudgeRead(e.deltaY > 0 ? 1 : -1);
        return;
      }
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const next = Math.round(this.zoom * factor * 100) / 100;
      this.setZoom(next, e.clientY - this.getBoundingClientRect().top);
    }, { passive: false });

    // Modo Leitura: swipe (toque) e teclas navegam por par
    let touchY0 = 0, touchX0 = 0;
    this.addEventListener('touchstart', (e) => {
      if (this.view !== 'read') return;
      touchY0 = e.touches[0]!.clientY; touchX0 = e.touches[0]!.clientX;
    }, { passive: true });
    this.addEventListener('touchend', (e) => {
      if (this.view !== 'read') return;
      const dy = e.changedTouches[0]!.clientY - touchY0;
      const dx = e.changedTouches[0]!.clientX - touchX0;
      const horiz = Math.abs(dx) > Math.abs(dy);
      const d = horiz ? dx : dy;
      if (Math.abs(d) < 40) return;
      this.nudgeRead(d < 0 ? 1 : -1); // swipe ↑/← = próximo bloco
    }, { passive: true });
    this.addEventListener('keydown', (e) => {
      if (this.view !== 'read') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault(); this.nudgeRead(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); this.nudgeRead(-1);
      }
    });

    // virtualização: repinta páginas que entram no viewport
    this.addEventListener('scroll', () => {
      if (this.scrollPaintQueued) return;
      this.scrollPaintQueued = true;
      requestAnimationFrame(() => {
        this.scrollPaintQueued = false;
        this.ensureVisiblePainted();
      });
    });

    this.addEventListener('mousedown', (e) => {
      if (this.eventInChrome(e)) return;
      // objetos flutuantes + entrada em caixa de texto (CLIQUE ÚNICO):
      if (e.button === 0 && !this.protectedMode) {
        // 1) alça de redimensionamento do float ATIVO (imagem selecionada OU
        //    caixa em edição) — precede a saída da caixa, senão pegar a alça sairia.
        const hn = this.handleAt(e);
        if (hn) { this.focusEditor(); this.startFloatDrag(e, 'resize', hn); return; }
        // 2) clique DENTRO da caixa em edição → só reposiciona o caret (abaixo).
        if (!(this.tbEdit && this.pointInTbRect(e))) {
          if (this.tbEdit) this.exitTextbox(); // saiu da caixa atual
          // 3) clique numa caixa de texto → ENTRA na edição direto (1 clique). Não
          //    retorna: cai no hitTest p/ caret no ponto + seleção por arrasto.
          let tbHit = this.hitTextbox(e);
          const fh0 = tbHit && this.eng ? this.hitFloat(e, 'image') : null;
          // imagem menor por cima de uma caixa de texto grande (logo dentro da
          // faixa do cabeçalho): o clique é da imagem
          if (tbHit && fh0?.kind === 'image' && fh0.rect.w * fh0.rect.h < tbHit.rect.w * tbHit.rect.h) tbHit = null;
          if (tbHit) {
            this.enterTextbox(tbHit.hostRun, tbHit.rect, tbHit.page);
          } else {
            // 4) clique numa IMAGEM → seleciona p/ mover/redimensionar.
            const fh = fh0 ?? this.hitFloat(e);
            if (fh && fh.kind === 'image') {
              if (this.floatSel !== fh.run) { this.floatSel = fh.run; this.refreshSelection(); }
              this.focusEditor();
              this.startFloatDrag(e, 'move', '');
              this.onSelectionChange?.(); this.chromeSync?.();
              return;
            }
            // 5) clique fora → desseleciona imagem.
            if (this.floatSel) { this.floatSel = null; this.refreshSelection(); }
          }
        }
      }
      // modo HF: clicar na OUTRA região (header↔footer) troca o foco (ambos
      // ativos, como no Word), depois posiciona o caret no ponto clicado.
      if (e.button === 0 && this.hfEdit && !this.tbEdit) {
        const region = this.hfRegionAtClick(e);
        if (region && (region.kind !== this.hfEdit.kind || region.page !== this.hfActivePage)) {
          this.switchHfFocus(region.kind, region.page);
          const pos = this.hitTest(e);
          if (pos) this.selection = { anchor: pos, focus: pos };
          this.focusEditor();
          e.preventDefault(); // senão o mousedown tira o foco da textarea
          // (a digitação seguinte se perdia)
          this.refresh();
          this.onSelectionChange?.(); this.chromeSync?.();
          return;
        }
      }
      // Shift+clique em outra célula da mesma tabela: seleção de células
      if (e.button === 0 && e.shiftKey && this.cellEdit) {
        const ce = this.cellEdit;
        if (this.dragCellSel({ anchor: ce.anchor, hops: ce.hops }, e)) { e.preventDefault(); this.focusEditor(); return; }
      }
      // clique comum desfaz a seleção de células
      if (e.button === 0 && this.tableSel && !e.shiftKey) this.tableSel = null;
      // motor: clicar numa célula de tabela entra na edição dela; no corpo, sai
      if (e.button === 0 && !e.shiftKey) this.routeEngineClick(e);
      const hit = this.hitTest(e);
      if (!hit) return;
      // botão direito: posiciona o caret só se clicar FORA da seleção (como o
      // app de referência) e não inicia arrasto — o evento 'contextmenu' abre o menu depois.
      if (e.button !== 0) {
        if (!this.posInSelection(hit)) {
          this.selection = { anchor: hit, focus: hit };
          this.pendingProps = null;
          this.refreshSelection();
        }
        this.focusEditor();
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      // Ctrl+click: hyperlink externo OU navegação interna (sumário/bookmark)
      if (e.ctrlKey && this.model) {
        const para = this.model.paragraphs[hit.para];
        let acc = 0;
        for (const run of para?.runs ?? []) {
          const end = acc + run.text.length;
          if (hit.offset >= acc && hit.offset <= end && run.props.link) {
            if (/^https?:/.test(run.props.link)) {
              window.open(run.props.link, '_blank', 'noopener');
              return;
            }
            if (this.navigateTo(run.props.link)) return;
          }
          acc = end;
        }
      }
      // clique em trecho comentado: avisa o painel de anotações
      if (this.model) {
        const para = this.model.paragraphs[hit.para];
        let acc = 0;
        for (const run of para?.runs ?? []) {
          const end = acc + run.text.length;
          if (hit.offset >= acc && hit.offset < end && run.props.commentIds?.length) {
            this.dispatchEvent(new CustomEvent('uw-comment-click', {
              detail: { ids: run.props.commentIds },
            }));
            break;
          }
          acc = end;
        }
      }
      this.focusEditor();
      e.preventDefault();
      const extend = e.shiftKey;
      this.selection = extend
        ? { anchor: this.selection.anchor, focus: hit }
        : { anchor: hit, focus: hit };
      this.pendingProps = null;
      this.refreshSelection();
      // arrasto que começa numa célula e passa para outra: seleção de células
      const startCell = this.cellEdit ? { anchor: this.cellEdit.anchor, hops: this.cellEdit.hops.map((x) => ({ ...x })) } : null;
      const move = (ev: MouseEvent) => {
        if (startCell && this.dragCellSel(startCell, ev)) return;
        const h = this.hitTest(ev);
        if (h) { this.selection.focus = h; this.refreshSelection(); }
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        if (this.painterProps) this.applyPainter();
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);

      // triple-click: seleciona o parágrafo
      if (e.detail === 3 && this.model) {
        const len = paraLength(this.model.paragraphs[hit.para]!);
        this.selection = {
          anchor: { para: hit.para, offset: 0 },
          focus: { para: hit.para, offset: len },
        };
        this.refreshSelection();
      }
    });

    this.input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') ?? '';
      const plain = this.plainPasteNext;
      this.plainPasteNext = false;
      if (!plain && this.richClip && this.richClip.text === text.replace(/\r\n?/g, '\n')) this.insertRich(this.richClip);
      else if (text) this.pasteText(text);
      this.onSelectionChange?.(); this.chromeSync?.();
    });

    // dica de descoberta: ao passar na margem (editável), muda cursor + avisa UI
    this.addEventListener('mousemove', (e) => {
      if (this.view !== 'print' || this.hfEdit || !this.model) return;
      const zone = this.hfZoneAt(e);
      const kind = zone?.kind ?? null;
      const wantHint = kind !== null && !this.protectedMode;
      this.style.cursor = wantHint ? 'pointer' : '';
      if (kind !== this.lastHoverHf) {
        this.lastHoverHf = kind;
        this.dispatchEvent(new CustomEvent('uw-hfhover', {
          detail: { kind: wantHint ? kind : null, x: e.clientX, y: e.clientY },
        }));
      }
    });
    this.addEventListener('mouseleave', () => {
      if (this.lastHoverHf !== null) {
        this.lastHoverHf = null;
        this.dispatchEvent(new CustomEvent('uw-hfhover', { detail: { kind: null } }));
      }
    });

    // cursor de manipulação de objeto flutuante (registrado DEPOIS do hover de HF
    // para vencer a definição de cursor quando há um objeto selecionado/sob o mouse).
    this.addEventListener('mousemove', (e) => {
      if (this.floatDrag || !this.model) return;
      // alça de redimensionamento (funciona também com a caixa em edição)
      const hn = this.handleAt(e);
      if (hn) { this.style.cursor = this.cursorForHandle(hn); return; }
      // corpo de uma imagem flutuante → mover (durante edição de texto não)
      const fh = this.tbEdit ? null : this.hitFloat(e);
      if (fh) { this.style.cursor = 'move'; return; }
      // sem objeto sob o mouse: se o cursor estava em modo objeto, limpa
      if (this.style.cursor === 'move' || this.style.cursor.endsWith('-resize')) this.style.cursor = '';
    });

    this.addEventListener('dblclick', (e) => {
      if (this.eventInChrome(e)) return;
      // modo HF: duplo-clique na OUTRA região troca o foco ANTES de tudo, p/ o
      // hitFloat/hitTextbox enxergarem a região recém-focada (ambos ativos).
      if (this.hfEdit && !this.tbEdit) {
        const region = this.hfRegionAtClick(e);
        if (region && (region.kind !== this.hfEdit.kind || region.page !== this.hfActivePage)) {
          this.switchHfFocus(region.kind, region.page);
        }
      }
      // duplo-clique numa IMAGEM flutuante (logo) → trocar a imagem, mantendo
      // posição/tamanho (como o Word: "Alterar Imagem").
      if (!this.tbEdit && this.model && !this.protectedMode) {
        const fh = this.hitFloat(e);
        if (fh && fh.kind === 'image') {
          this.floatSel = fh.run;
          this.refresh();
          this.promptReplaceImage();
          return;
        }
      }
      // duplo-clique numa caixa de texto flutuante → edita seu conteúdo. Precede
      // a entrada de HF: uma caixa da capa na zona de margem edita a caixa (não
      // o cabeçalho). Caixas do HF só existem quando já estamos em hfEdit.
      if (!this.tbEdit && this.model && !this.protectedMode) {
        const tbHit = this.hitTextbox(e);
        if (tbHit) {
          this.enterTextbox(tbHit.hostRun, tbHit.rect, tbHit.page);
          const pos = this.hitTest(e); // layoutCache agora é o da caixa
          if (pos) this.selection = { anchor: pos, focus: pos };
          this.refresh();
          this.onSelectionChange?.(); this.chromeSync?.();
          return;
        }
      }
      // editando uma caixa: duplo-clique FORA dela sai da caixa
      if (this.tbEdit && !this.pointInTbRect(e)) {
        this.exitTextbox();
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      // duplo-clique na zona de margem superior/inferior (modo print) entra
      // na edição de cabeçalho/rodapé, como no app de referência
      if (this.view === 'print' && !this.hfEdit && !this.tbEdit && this.model) {
        const zone = this.hfZoneAt(e);
        if (zone) {
          if (this.protectedMode) {
            // sem silêncio: avisa a UI p/ chamar atenção à barra amarela
            this.dispatchEvent(new CustomEvent('uw-blocked', { detail: { reason: 'protected' } }));
            return;
          }
          this.enterHeaderFooter(zone.kind, zone.page);
          // caret no ponto do duplo clique (como o Word), não no início da parte
          const pos = this.hfEdit ? this.hitTest(e) : null;
          if (pos) { this.selection = { anchor: pos, focus: pos }; this.refreshSelection(); }
          return;
        }
      }
      // já editando HF: duplo-clique no CORPO (fora das regiões header/footer)
      // volta ao documento. Header E footer permanecem ativos; só o corpo sai.
      if (this.hfEdit && !this.hfRegionAtClick(e)) {
        this.exitHeaderFooter();
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      const hit = this.hitTest(e);
      if (!hit || !this.model) return;
      const text = this.model.paragraphs[hit.para]!.runs.map((r) => r.text).join('');
      let a = hit.offset, b = hit.offset;
      while (a > 0 && !/[\s]/.test(text[a - 1]!)) a--;
      while (b < text.length && !/[\s]/.test(text[b]!)) b++;
      this.selection = { anchor: { para: hit.para, offset: a }, focus: { para: hit.para, offset: b } };
      this.refreshSelection();
    });

    // IME: durante a composição não insere; no fim, insere o resultado.
    let composing = false;
    this.input.addEventListener('compositionstart', () => { composing = true; });
    this.input.addEventListener('compositionend', (e) => {
      composing = false;
      this.input.value = '';
      if (e.data) this.type(e.data);
    });
    this.input.addEventListener('input', () => {
      if (composing) return;
      const v = this.input.value;
      if (v) { this.type(v); this.input.value = ''; }
    });

    this.input.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key;
      // células selecionadas: setas/Shift+setas, Delete/Backspace, Esc
      if (this.tableSel && this.tableSelKey(e)) return;
      if (this.cellEdit && !this.locked()) {
        // Ctrl+Shift+Enter: dividir a tabela; Alt+Shift+↑/↓: mover a linha
        if (ctrl && e.shiftKey && k === 'Enter') { e.preventDefault(); this.splitTable(); this.onSelectionChange?.(); this.chromeSync?.(); return; }
        if (e.altKey && e.shiftKey && (k === 'ArrowUp' || k === 'ArrowDown')) {
          e.preventDefault();
          this.moveTableRow(k === 'ArrowUp' ? -1 : 1);
          this.onSelectionChange?.(); this.chromeSync?.();
          return;
        }
      }
      if (ctrl) {
        if (k === 'ArrowLeft' || k === 'ArrowRight') {
          e.preventDefault();
          this.moveWord(k === 'ArrowRight' ? 1 : -1, e.shiftKey);
          this.onSelectionChange?.(); this.chromeSync?.();
          return;
        }
        if (k === 'Backspace' || k === 'Delete') {
          e.preventDefault();
          this.deleteWord(k === 'Delete' ? 1 : -1);
          this.onSelectionChange?.(); this.chromeSync?.();
          return;
        }
        if (k.toLowerCase() === 'c') { e.preventDefault(); void this.copy(); return; }
        if (k.toLowerCase() === 'x') { e.preventDefault(); void this.cut(); return; }
        if (k.toLowerCase() === 'v') { this.plainPasteNext = e.shiftKey; return; } // Shift = colar sem formatação; evento paste cuida
        const map: Record<string, () => void> = {
          b: () => this.toggleRunProp('bold'),
          i: () => this.toggleRunProp('italic'),
          u: () => this.toggleRunProp('underline'),
          z: () => this.undo(),
          y: () => this.redo(),
          a: () => this.selectAll(),
          e: () => this.setAlignment('center'),
          l: () => this.setAlignment('left'),
          r: () => this.setAlignment('right'),
          j: () => this.setAlignment('both'),
        };
        const fn = map[k.toLowerCase()];
        if (fn) { e.preventDefault(); fn(); this.onSelectionChange?.(); this.chromeSync?.(); return; }
      }
      if (k === 'PageDown' || k === 'PageUp') {
        e.preventDefault();
        const step = this.clientHeight * 0.9 * (k === 'PageDown' ? 1 : -1);
        this.scrollTop += step;
        // move o caret ~uma tela de linhas
        for (let n = 0; n < 20; n++) this.moveCaret(k === 'PageDown' ? 'down' : 'up', e.shiftKey);
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      if (ctrl && (k === 'Home' || k === 'End')) {
        e.preventDefault();
        if (!this.model) return;
        const lastP = this.model.paragraphs.length - 1;
        const focus = k === 'Home'
          ? { para: 0, offset: 0 }
          : { para: lastP, offset: paraLength(this.model.paragraphs[lastP]!) };
        this.selection = e.shiftKey
          ? { anchor: this.selection.anchor, focus }
          : { anchor: focus, focus };
        this.refreshSelection();
        this.scrollCaretIntoView();
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      if (k === 'Tab') {
        e.preventDefault();
        // célula de tabela: Tab/Shift+Tab vai para a próxima/anterior célula
        if (this.cellEdit && !ctrl) {
          this.moveCell(e.shiftKey ? -1 : 1);
          this.onSelectionChange?.(); this.chromeSync?.();
          return;
        }
        const para = this.model?.paragraphs[this.selection.focus.para];
        // Tab no início de item de lista muda o nível (comportamento do app de referência)
        if (para?.props.numbering && this.selection.focus.offset === 0) {
          const lvl = Math.max(0, Math.min(2, para.props.numbering.ilvl + (e.shiftKey ? -1 : 1)));
          this.formatPara({
            numbering: { ...para.props.numbering, ilvl: lvl },
            indentLeftTwips: 720 * (lvl + 1),
          });
        } else if (!e.shiftKey) this.type('\t');
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      // objeto flutuante selecionado: Esc desseleciona, Del remove, setas nudge
      if (this.floatSel && !this.tbEdit) {
        if (k === 'Escape') { e.preventDefault(); this.floatSel = null; this.refreshSelection(); return; }
        if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); this.deleteSelectedFloat(); return; }
        if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
          e.preventDefault();
          const h = this.selectedFloat();
          if (h) {
            this.snapshot();
            const step = e.shiftKey ? 15 : 90; // twips (~0.75pt / 4.5pt)
            const obj = h.obj;
            const ox = obj.offsetXTwips ?? 0, oy = obj.offsetYTwips ?? 0;
            if (k === 'ArrowLeft') obj.offsetXTwips = ox - step;
            else if (k === 'ArrowRight') obj.offsetXTwips = ox + step;
            else if (k === 'ArrowUp') obj.offsetYTwips = oy - step;
            else obj.offsetYTwips = oy + step;
            if (this.eng) this.moveAnchorTo(obj, h.rect.x + (obj.offsetXTwips ?? 0) - ox, h.rect.y + (obj.offsetYTwips ?? 0) - oy);
            this.refresh();
            this.dispatchEvent(new CustomEvent('uw-change'));
          }
          return;
        }
      }
      if (k === 'Escape' && this.tbEdit) {
        e.preventDefault();
        this.exitTextbox(); // sai só da caixa; permanece no HF/corpo
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      if (k === 'Escape' && this.hfEdit) {
        e.preventDefault();
        this.exitHeaderFooter();
        this.onSelectionChange?.(); this.chromeSync?.();
        return;
      }
      if (k === 'Escape' && this.cellEdit) {
        e.preventDefault();
        this.exitCell();
        this.refreshSelection();
        return;
      }
      const nav: Record<string, () => void> = {
        ArrowLeft: () => this.moveCaret('left', e.shiftKey),
        ArrowRight: () => this.moveCaret('right', e.shiftKey),
        ArrowUp: () => this.moveCaret('up', e.shiftKey),
        ArrowDown: () => this.moveCaret('down', e.shiftKey),
        Home: () => this.moveCaret('home', e.shiftKey),
        End: () => this.moveCaret('end', e.shiftKey),
        // Ctrl+Enter = quebra de página; Ctrl+Shift+Enter = quebra de coluna (como no app de referência)
        Enter: () => (ctrl && e.shiftKey ? this.insertColumnBreak() : ctrl ? this.type('\f') : this.pressEnter()),
        Backspace: () => this.pressBackspace(),
        Delete: () => this.pressDelete(),
      };
      const fn = nav[k];
      if (fn) { e.preventDefault(); fn(); this.onSelectionChange?.(); this.chromeSync?.(); }
    });
  }

  private startCaret(): void {
    window.clearInterval(this.caretTimer);
    this.caretTimer = window.setInterval(() => {
      this.caretVisible = !this.caretVisible;
      this.paint();
    }, 530);
  }

  // ───────────────────────── layout ─────────────────────────

  private sect() { return this.model!.sectPr; }

  private contentWidthTwips(): number {
    const s = this.sect();
    if (this.view === 'web') {
      // desconta as margens (600+600) p/ a PÁGINA inteira caber no viewport —
      // senão a margem direita (e os dividers) ficam fora da tela.
      return Math.max(2000, (this.clientWidth - 48) / (PX_PER_TWIP * this.zoom) - 1200);
    }
    return s.pageWidthTwips - s.marginLeftTwips - s.marginRightTwips;
  }

  /** docDefaults do DOCUMENTO (fonte/tamanho/espaçamentos de quem não tem
   *  estilo). Sem documento carregado: defaults do nosso template. */
  private docDefaults(): { para: Partial<ParaProps>; run: Partial<RunProps> } {
    return this.fullDoc?.styles.get('docDefaults') ?? { para: {}, run: {} };
  }
  /** Há styles.xml? Então os defaults do WORD valem (after=0, line=240). */
  private hasDocStyles(): boolean {
    return (this.fullDoc?.styles.size ?? 0) > 0;
  }

  /** Estilos de PARÁGRAFO recomendados do documento (id + nome na língua da
   *  interface), na ordem do Word — a lista de estilos da barra compacta. */
  paragraphStyles(): { id: string; name: string }[] {
    return this.listStyles('recommended').filter((s) => s.kind !== 'character').map((s) => ({ id: s.id, name: s.name }));
  }

  private styleOf(p: Paragraph): StyleDef | undefined {
    if (!p.props.styleId) return undefined;
    // estilos REAIS do documento (styles.xml resolvido) têm prioridade;
    // a tabela embutida só vale para documentos novos
    const docStyle = this.fullDoc?.styles.get(p.props.styleId);
    if (docStyle) {
      return {
        sizePt: docStyle.run.szHalfPt !== undefined ? docStyle.run.szHalfPt / 2 : 11,
        bold: docStyle.run.bold ?? false,
        color: docStyle.run.color,
        spaceBeforeTwips: docStyle.para.spaceBeforeTwips ?? 0,
        italic: docStyle.run.italic ?? false,
        alignment: docStyle.para.alignment,
        spaceAfterTwips: docStyle.para.spaceAfterTwips,
        lineTwentieths: docStyle.para.lineTwentieths,
        fontAscii: docStyle.run.fontAscii,
        underline: docStyle.run.underline,
        strike: docStyle.run.strike,
        allCaps: docStyle.run.allCaps,
        smallCaps: docStyle.run.smallCaps,
        borders: docStyle.para.borders,
        shadingHex: docStyle.para.shadingHex,
        indentLeftTwips: docStyle.para.indentLeftTwips,
        indentRightTwips: docStyle.para.indentRightTwips,
      };
    }
    return STYLES[p.props.styleId];
  }

  /** Escala das minúsculas em small caps (versaletes). ~0.8 do tamanho, como o
   *  Word: a maiúscula reduzida fica um pouco menor que a maiúscula cheia. */
  private static readonly SMALL_CAPS_SCALE = 0.8;
  /** Quebra o texto de um run com small caps em spans por caixa: maiúsculas/
   *  símbolos em tamanho cheio; minúsculas → MAIÚSCULAS em ~0.8 do tamanho.
   *  Preserva o nº de caracteres (offset do caret) — se maiúscula mudar o
   *  comprimento (ex.: ß→SS), mantém o char original. */
  private smallCapsSpans(
    text: string, family: string | undefined, variant: FontVariant,
    size: number, ls: number | undefined, runIndex: number,
  ): StyledSpan[] {
    const isLower = (c: string): boolean => c.toLowerCase() === c && c.toUpperCase() !== c;
    const out: StyledSpan[] = [];
    let i = 0;
    while (i < text.length) {
      const lower = isLower(text[i]!);
      let j = i;
      while (j < text.length && isLower(text[j]!) === lower) j++;
      const seg = text.slice(i, j);
      let t = seg;
      let sz = size;
      if (lower) {
        const up = seg.toUpperCase();
        t = up.length === seg.length ? up : seg; // preserva offsets
        sz = size * UniversalWriteElement.SMALL_CAPS_SCALE;
      }
      out.push({ text: t, family, variant, sizePt: sz, letterSpacingTwips: ls, runIndex });
      i = j;
    }
    return out.length ? out : [{ text: '', family, variant, sizePt: size, runIndex }];
  }

  private buildSpans(p: Paragraph, opts?: { skipFloating?: boolean }): StyledSpan[] {
    const st = this.styleOf(p);
    const spans: StyledSpan[] = p.runs.flatMap((r, ri) => {
      const dd = this.docDefaults();
      const base = r.props.szHalfPt !== undefined
        ? r.props.szHalfPt / 2
        : st?.sizePt ?? (dd.run.szHalfPt !== undefined ? dd.run.szHalfPt / 2 : 11);
      const size = r.props.vertAlign ? base * 0.65 : base;
      const bold = r.props.bold || (st?.bold ?? false);
      const italic = r.props.italic || (st?.italic ?? false);
      const variant: FontVariant =
        bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
      const family = r.props.fontAscii ?? st?.fontAscii ?? dd.run.fontAscii;
      // caixas de texto ancoradas são pintadas à parte (paintHf), nunca no fluxo
      if (r.textbox) {
        return { text: '', family, variant, sizePt: size, runIndex: ri };
      }
      if (r.image) {
        // imagens flutuantes (âncoradas) não ocupam espaço no fluxo — são
        // desenhadas à parte (corpo: floatImages; HF: paintHf). Sem isto, um
        // timbrado de página inteira no cabeçalho inflaria a linha.
        if (opts?.skipFloating && r.image.floating) {
          return { text: '', family, variant, sizePt: size, runIndex: ri };
        }
        return {
          text: r.text || '￼',
          family,
          variant,
          sizePt: size,
          imageWidthTwips: r.image.widthTwips,
          imageHeightTwips: r.image.heightTwips,
          runIndex: ri,
        };
      }
      if (r.custom) {
        const font = this.fonts!.resolve(family, variant);
        const measureText = (text: string): number => {
          const chars = Array.from(text);
          let width = 0;
          for (let i = 0; i < chars.length; i++) {
            const cp = chars[i]!.codePointAt(0)!;
            width += font.advanceTwips(cp, size);
            const next = chars[i + 1]?.codePointAt(0);
            if (next !== undefined) width += font.kernTwips(cp, next, size);
          }
          return width;
        };
        const renderer = this.inlineRenderers.get(r.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(r.custom.data) ?? r.custom.fallbackText;
        const measured = renderer?.measure?.({
          data: r.custom.data,
          fallbackText,
          props: r.props,
          sizePt: size,
          measureText,
        });
        return {
          text: '\uFFFC',
          family,
          variant,
          sizePt: size,
          imageWidthTwips: Math.max(1, measured?.widthTwips ?? measureText(fallbackText)),
          imageHeightTwips: measured?.heightTwips ?? size * TWIPS_PER_PT,
          runIndex: ri,
        };
      }
      const ls = r.props.charSpacingTwips;
      const allCaps = r.props.allCaps || st?.allCaps;
      const smallCaps = r.props.smallCaps || st?.smallCaps;
      // small caps: min\u00FAsculas viram VERSALETES (mai\u00FAsculas menores). Como um span
      // tem UM tamanho, quebramos o run em spans por caixa (min\u00FAsc. reduzidas).
      if (smallCaps && !allCaps) {
        return this.smallCapsSpans(r.text, family, variant, size, ls, ri);
      }
      const text = (allCaps || smallCaps) ? r.text.toUpperCase() : r.text;
      return { text, family, variant, sizePt: size, letterSpacingTwips: ls, runIndex: ri };
    });
    if (spans.length === 0) spans.push({ text: '', variant: 'regular', sizePt: st?.sizePt ?? 11 });
    return spans;
  }

  /** Seção vigente para o parágrafo pi. */
  private sectionIndexForPara(pi: number): number {
    let idx = 0;
    for (let i = 0; i < this.sectionStarts.length; i++) {
      if (pi >= this.sectionStarts[i]!.startPara) idx = i;
    }
    return idx;
  }
  sectPrAt(sectionIdx: number) {
    const s = this.sectionStarts[sectionIdx]?.section.sectPr;
    return s ?? this.model!.sectPr;
  }

  // ───────────────── seções derivadas do modelo ─────────────────

  private resetSections(): void {
    this.sectionStarts = [];
    this.sectionProps = new Map([[0, undefined]]);
    this.nextSectionId = 1;
    this.hfParts = new Map();
    this.sectionEff = new Map();
    this.lastSectionIds = [];
    this.lastSectionRefs = new Map();
  }

  /** Cabeçalho/rodapé que a edição criou (ou cujo conteúdo faltava): a parte
   *  entra no índice e a ref, nas refs da seção no modelo do corpo. */
  private registerHfPart(sec: Section, kind: 'header' | 'footer', ref: import('@universal-office/docx-core').HfRef, paras: Paragraph[]): void {
    const key = `${kind}:${ref.rid}`;
    const cur = this.hfParts.get(key);
    if (cur) cur.paras = paras; else this.hfParts.set(key, { path: ref.path, paras });
    const id = this.sectionIds.get(sec);
    const m = this.model;
    if (id === undefined || !m) return;
    const holder: SectionRefs | undefined = id === 0
      ? (m.bodyRefs ??= { headerRefs: [], footerRefs: [] })
      : m.paragraphs.find((p) => p.props.sectionBreak?.id === id)?.props.sectionBreak;
    if (!holder) return;
    if (kind === 'header') { if (!holder.headerRefs.some((r) => r.rid === ref.rid)) holder.headerRefs.push({ kind, type: ref.type, rid: ref.rid }); }
    else if (!holder.footerRefs.some((r) => r.rid === ref.rid)) holder.footerRefs.push({ kind, type: ref.type, rid: ref.rid });
  }

  /** Registra as partes de cabeçalho/rodapé de uma seção lida (conteúdo por rId). */
  private indexHfParts(s: Section): void {
    for (const [kind, refs, set, blocks] of [
      ['header', s.headerRefs, s.headers, s.headerBlocks],
      ['footer', s.footerRefs, s.footers, s.footerBlocks],
    ] as const) {
      for (const r of refs) {
        const key = `${kind}:${r.rid}`;
        if (this.hfParts.has(key)) continue;
        this.hfParts.set(key, { path: r.path, ...(set[r.type] ? { paras: set[r.type] } : {}), ...(blocks?.[r.type] ? { blocks: blocks[r.type] } : {}) });
      }
    }
  }

  /**
   * Refaz as seções a partir do MODELO do corpo (fonte única): cada parágrafo
   * com sectionBreak encerra uma; a última é model.sectPr. A quebra que sumiu
   * numa edição passa as refs de cabeçalho/rodapé para a seção que agora cobre o
   * texto dela, nos tipos que ela não define (o Word mantém o cabeçalho).
   */
  private syncSections(): void {
    const m = this.model;
    if (!m || this.hfEdit || this.tbEdit || this.cellEdit) return;
    const breaks: { pi: number; sb: SectionBreak }[] = [];
    const seen = new Set<number>();
    m.paragraphs.forEach((p, pi) => {
      const sb = p.props.sectionBreak;
      if (!sb) return;
      // quebra sem registro (ou id repetido): props da seção seguinte, como o Word
      if (sb.id === undefined || !this.sectionProps.has(sb.id) || seen.has(sb.id)) {
        const id = this.nextSectionId++;
        this.sectionProps.set(id, this.sectionProps.get(0));
        p.props = { ...p.props, sectionBreak: { ...sb, id } };
      }
      seen.add(p.props.sectionBreak!.id!);
      breaks.push({ pi, sb: p.props.sectionBreak! });
    });
    const ids = [...breaks.map((b) => b.sb.id!), 0];
    const holder = (id: number): SectionRefs => id === 0
      ? (m.bodyRefs ??= { headerRefs: [], footerRefs: [] })
      : breaks.find((b) => b.sb.id === id)!.sb;
    const prev = this.lastSectionIds;
    prev.forEach((x, k) => {
      if (ids.includes(x)) return;
      const gone = this.lastSectionRefs.get(x);
      if (!gone || (!gone.headerRefs.length && !gone.footerRefs.length)) return;
      const y = prev.slice(k + 1).find((id) => ids.includes(id)) ?? 0;
      const h = holder(y);
      for (const r of gone.headerRefs) if (!h.headerRefs.some((t) => t.type === r.type)) h.headerRefs.push({ ...r });
      for (const r of gone.footerRefs) if (!h.footerRefs.some((t) => t.type === r.type)) h.footerRefs.push({ ...r });
    });
    const starts: { startPara: number; section: Section }[] = [];
    let start = 0;
    for (const b of breaks) {
      starts.push({ startPara: start, section: this.effectiveSection(b.sb.id!, b.sb.sectPr, b.sb) });
      start = b.pi + 1;
    }
    starts.push({ startPara: start, section: this.effectiveSection(0, m.sectPr, m.bodyRefs) });
    this.sectionStarts = starts;
    if (this.fullDoc) this.fullDoc.sections = starts.map((s) => s.section);
    this.lastSectionIds = ids;
    this.lastSectionRefs = new Map(ids.map((id) => {
      const r = id === 0 ? m.bodyRefs : breaks.find((b) => b.sb.id === id)!.sb;
      return [id, { headerRefs: [...(r?.headerRefs ?? [])], footerRefs: [...(r?.footerRefs ?? [])] }];
    }));
  }

  /** Seção como o motor e a pintura a usam: geometria do modelo, props do
   *  sectPr guardadas (tipo e colunas do modelo valem) e cabeçalhos/rodapés das
   *  refs da seção no modelo. */
  private effectiveSection(id: number, sp: SectPr, refs: SectionRefs | undefined): Section {
    const props = this.sectionProps.get(id);
    const key = JSON.stringify([refs?.headerRefs ?? null, refs?.footerRefs ?? null, sp.type ?? '', sp.cols ?? null]);
    const c = this.sectionEff.get(id);
    if (c && c.sp === sp && c.key === key && c.props === props) return c.sec;
    const sect: import('@universal-office/docx-core').SectionProps = { ...(props ?? { type: 'nextPage' }), type: sp.type ?? 'nextPage' };
    if (sp.cols?.widths) {
      sect.colDefs = sp.cols.widths.map((w) => ({ w: w.widthTwips, space: w.spaceTwips }));
      sect.equalWidth = false;
    } else {
      delete sect.colDefs;
      delete sect.equalWidth;
    }
    const sec: Section = {
      sectPr: sp, sect, blockStart: 0, blockEnd: 0,
      headers: {}, footers: {}, headerBlocks: {}, footerBlocks: {}, headerRefs: [], footerRefs: [],
    };
    for (const [kind, list] of [['header', refs?.headerRefs ?? []], ['footer', refs?.footerRefs ?? []]] as const) {
      for (const r of list) {
        const part = this.hfParts.get(`${kind}:${r.rid}`);
        if (!part) continue;
        const type = r.type as 'default' | 'first' | 'even';
        (kind === 'header' ? sec.headerRefs : sec.footerRefs).push({ type, rid: r.rid, path: part.path });
        if (part.paras) (kind === 'header' ? sec.headers : sec.footers)[type] = part.paras;
        if (part.blocks) (kind === 'header' ? sec.headerBlocks! : sec.footerBlocks!)[type] = part.blocks;
      }
    }
    this.sectionEff.set(id, { sp, key, props, sec });
    this.sectionIds.set(sec, id);
    return sec;
  }

  /** Layout do modo de edição de HF: PRESERVA a paginação do corpo (mesmo
   *  nº de páginas/panes) e posiciona o HF apenas na banda da página ativa. */
  private layoutHfEdit(): void {
    const sb = this.savedBody!;
    this.pageCount = sb.pageCount;
    this.pageSections = sb.pageSections;
    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    const sp = this.sectPrForSavedPage(this.hfActivePage);
    const marginL = sp.marginLeftTwips;
    const contentW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
    // posiciona o HF ativo IGUAL ao render normal: cabeçalho a headerDistance do
    // topo; rodapé ancorado pela BASE (a footerDistance da borda inferior).
    const topY = this.hfEdit!.kind === 'header'
      ? (sp.headerDistanceTwips ?? 720)
      : sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720)
          - this.measureHfHeight(this.model!.paragraphs, contentW);
    this.hfRegionTopTwips = topY;
    const font = this.fonts!.resolve(undefined, 'regular');
    let y = topY;
    this.model!.paragraphs.forEach((p, pi) => {
      // skipFloating: imagens flutuantes NÃO viram span inline aqui (senão o
      // paintLine as desenha inline ALÉM do drawHfFloats → logo duplicado).
      const spans = this.buildSpans(p, { skipFloating: true });
      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts!, {
        availableTwips: contentW,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : [
          { posTwips: contentW / 2, align: 'center' as const },
          { posTwips: contentW, align: 'right' as const },
        ],
      });
      const spanCharStart: number[] = [];
      let acc = 0;
      for (const span of spans) { spanCharStart.push(acc); acc += span.text.length; }
      const laid: LaidLine[] = [];
      lines.forEach((rich) => {
        // MESMA matemática de linha/baseline do paintHf (visão normal), senão o
        // conteúdo do HF "pula" ao entrar/sair da edição.
        const lineSize = Math.max(rich.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * TWIPS_PER_PT;
        let x = marginL;
        let justifyExtra = 0;
        const align = p.props.alignment;
        if (align === 'center') x += (contentW - rich.widthTwips) / 2;
        else if (align === 'right') x += contentW - rich.widthTwips;
        laid.push({
          para: pi, rich, page: this.hfActivePage, xTwips: x, yTwips: y,
          heightTwips: lh, baselineTwips: y + lh * 0.8, justifyExtraPerSpace: justifyExtra,
        });
        y += lh;
      });
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });
    this.hfRegionHeightTwips = Math.max(y - topY, 240);
  }

  /** Layout do conteúdo INTERNO de uma caixa de texto em edição: posiciona os
   *  parágrafos no retângulo ancorado da caixa, preservando a paginação salva.
   *  Espelha a matemática de linha do paintHf p/ o conteúdo não "pular". */
  private layoutTextboxEdit(): void {
    const tb = this.tbEdit!;
    const sb = this.savedForTb!;
    this.pageCount = sb.pageCount;
    this.pageSections = sb.pageSections;
    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    // margens internas: o texto recua (lIns/tIns) como no render, p/ a edição
    // bater com o que se vê fora dela.
    const box = tb.hostRun.textbox;
    const ins = box ? this.tbInsets(box) : { l: 0, t: 0, r: 0, b: 0 };
    const originX = tb.rectTwips.x + ins.l;
    const width = Math.max(tb.rectTwips.w - ins.l - ins.r, 240);
    const font = this.fonts!.resolve(undefined, 'regular');
    let y = tb.rectTwips.y + ins.t;
    this.model!.paragraphs.forEach((p, pi) => {
      const spans = this.buildSpans(p, { skipFloating: true });
      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts!, {
        availableTwips: width,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : [
          { posTwips: width / 2, align: 'center' as const },
          { posTwips: width, align: 'right' as const },
        ],
      });
      const spanCharStart: number[] = [];
      let acc = 0;
      for (const span of spans) { spanCharStart.push(acc); acc += span.text.length; }
      const laid: LaidLine[] = [];
      lines.forEach((rich) => {
        const lineSize = Math.max(rich.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * TWIPS_PER_PT;
        let x = originX;
        const align = p.props.alignment;
        if (align === 'center') x += (width - rich.widthTwips) / 2;
        else if (align === 'right') x += width - rich.widthTwips;
        laid.push({
          para: pi, rich, page: tb.pageIdx, xTwips: x, yTwips: y,
          heightTwips: lh, baselineTwips: y + lh * 0.8, justifyExtraPerSpace: 0,
        });
        y += lh;
      });
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });
  }

  /** start da numeração do documento (1ª seção). Padrão 1 (Word). */
  private docPgNumStart(): number {
    return this.fullDoc?.sections[0]?.sectPr.pgNumStart
      ?? this.sectionStarts[0]?.section.sectPr.pgNumStart
      ?? this.savedBody?.sectionStarts[0]?.section.sectPr.pgNumStart
      ?? 1;
  }
  /** Valor do campo NUMPAGES respeitando o start: total = número da ÚLTIMA
   *  página = start + (páginas − 1). Para docs normais (start=1) = pageCount;
   *  com capa start=0, a capa não conta (ex.: 2 folhas → "1"). */
  private numPagesFor(): number {
    return Math.max(1, this.pageCount + this.docPgNumStart() - 1);
  }
  /** Número de página do campo PAGE em Word: pgNumType/@start (padrão 1) +
   *  deslocamento da página DENTRO da sua seção. Respeita start=0 (capa = 0). */
  private pageNumberFor(pageIdx: number): number {
    const ps = this.pageSections;
    const sIdx = ps[pageIdx] ?? 0;
    let firstPage = pageIdx;
    for (let i = 0; i <= pageIdx; i++) { if ((ps[i] ?? 0) === sIdx) { firstPage = i; break; } }
    const sp = this.savedBody
      ? (this.savedBody.sectionStarts[sIdx]?.section.sectPr ?? this.sect())
      : (this.sectionStarts.length ? this.sectPrAt(sIdx) : this.sect());
    const start = sp.pgNumStart ?? 1;
    return start + (pageIdx - firstPage);
  }

  /** Parágrafos do header/footer que valem na página pg (first se capa+titlePg,
   *  senão default). Vindos do fullDoc — a parte FOCADA é o mesmo array de
   *  this.model, então reflete edições ao vivo. */
  private hfPartParas(kind: 'header' | 'footer', pg: number): Paragraph[] | undefined {
    const fd = this.fullDoc;
    if (!fd) return undefined;
    const ps = this.savedBody?.pageSections ?? this.pageSections;
    const sIdx = ps[pg] ?? 0;
    const section = this.savedBody?.sectionStarts[sIdx]?.section ?? fd.sections[sIdx] ?? fd.sections[0];
    if (!section) return undefined;
    const sp = this.sectPrForSavedPage(pg);
    const set = kind === 'header' ? section.headers : section.footers;
    // titlePg: a 1ª página usa SÓ a parte 'first' (vazia se ausente → sem HF na
    // capa, como o Word). Sem titlePg, a 1ª página usa a default.
    const part = (pg === 0 && sp.titlePg) ? set.first : set.default;
    return part?.length ? part : undefined;
  }

  /** topo (twips) da região do HF: header a headerDistance; footer ancorado pela
   *  base (footerDistance + altura do conteúdo). */
  private hfTopY(kind: 'header' | 'footer', paras: Paragraph[], sp: SectPr, colW: number): number {
    return kind === 'header'
      ? (sp.headerDistanceTwips ?? 720)
      : sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720) - this.measureHfHeight(paras, colW);
  }

  /** Composição da edição de HF: imagem behindDoc ATRÁS, corpo esmaecido, header
   *  E footer em foco (o ativo destacado), como o modo "Header & Footer" do Word.
   *  Corrige (a) conteúdo sumindo sob a capa e (b) header/footer ativos juntos. */
  private paintHfEditCompose(
    ctxs: (CanvasRenderingContext2D | null)[], scales: number[], dpr: number,
  ): void {
    if (!this.hfEdit || this.tbEdit) return;
    const inkBright = this.pageDark ? '#1f1f1f' : '#1f1f1f';
    const inkDim = this.pageDark ? '#9aa0a6' : '#666';
    for (let pg = 0; pg < ctxs.length; pg++) {
      const ctx = ctxs[pg];
      if (!ctx) continue;
      const scale = scales[pg]!;
      const sp = this.sectPrForSavedPage(pg);
      const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
      const isActivePage = pg === this.hfActivePage;
      const headerParas = this.hfPartParas('header', pg);
      const footerParas = this.hfPartParas('footer', pg);
      const kinds: ('header' | 'footer')[] = ['header', 'footer'];

      // 1) camada behindDoc (capa full-bleed) de AMBOS os HF — em foco, ao fundo.
      for (const kind of kinds) {
        const paras = kind === 'header' ? headerParas : footerParas;
        if (!paras) continue;
        const topY = this.hfTopY(kind, paras, sp, colW);
        this.paintHf(ctx, scale, paras, sp.marginLeftTwips, topY, colW, pg, inkBright, sp, 'behind');
      }
      // 2) corpo esmaecido por cima do behindDoc (snapshot transparente).
      const snap = this.hfBodySnapshots[pg];
      if ((snap?.width ?? 0) > 1) {
        ctx.save(); ctx.globalAlpha = HF_DIM_ALPHA; ctx.drawImage(snap!, 0, 0); ctx.restore();
      }
      // 3) conteúdo FRONT dos HF: página ativa em foco; demais esmaecidas.
      for (const kind of kinds) {
        const paras = kind === 'header' ? headerParas : footerParas;
        if (!paras) continue;
        const topY = this.hfTopY(kind, paras, sp, colW);
        const isFocused = isActivePage && kind === this.hfEdit.kind;
        // a região FOCADA tem o texto pintado pelo laço principal (layoutCache);
        // aqui só os flutuantes FRONT dela, p/ não duplicar o texto.
        if (isFocused) {
          this.model!.paragraphs.forEach((p, pi) => {
            const paraTop = this.layoutCache[pi]?.lines[0]?.yTwips ?? topY;
            this.drawHfFloats(ctx, scale, p.runs, sp.marginLeftTwips, paraTop, colW, pg, inkBright, sp, 'front');
          });
        } else {
          ctx.save();
          if (!isActivePage) ctx.globalAlpha = HF_DIM_ALPHA;
          this.paintHf(ctx, scale, paras, sp.marginLeftTwips, topY, colW, pg, isActivePage ? inkBright : inkDim, sp, 'front');
          ctx.restore();
        }
      }
      // 4) bandas + linhas separadoras (a região ATIVA destacada).
      if (isActivePage) this.paintHfBands(ctx, scale, sp, dpr);
    }
  }

  /** Bandas realçadas de header e footer na página ativa + linhas separadoras no
   *  limite com o corpo (base da margem sup. / topo da margem inf.), como o Word. */
  private paintHfBands(
    ctx: CanvasRenderingContext2D, scale: number, sp: SectPr, dpr: number, pg?: number,
  ): void {
    const activeKind = this.hfEdit!.kind;
    const drawBand = (kind: 'header' | 'footer') => {
      // motor: o limite é onde o conteúdo do cabeçalho/rodapé termina (ou a margem)
      const band = this.eng && pg !== undefined ? this.hfBand(pg, kind) : null;
      const lineY = band ? (kind === 'header' ? band.bottom : band.top)
        : kind === 'header' ? sp.marginTopTwips : sp.pageHeightTwips - sp.marginBottomTwips;
      const bandTop = kind === 'header' ? 0 : lineY;
      const bandBot = kind === 'header' ? lineY : sp.pageHeightTwips;
      const active = kind === activeKind;
      ctx.save();
      ctx.fillStyle = active
        ? (this.pageDark ? 'rgba(80,130,200,0.16)' : 'rgba(43,87,154,0.09)')
        : (this.pageDark ? 'rgba(120,120,120,0.10)' : 'rgba(120,120,120,0.06)');
      ctx.fillRect(0, bandTop * scale, (sp.pageWidthTwips) * scale, (bandBot - bandTop) * scale);
      ctx.strokeStyle = active ? (this.pageDark ? '#5b8def' : '#2b579a') : (this.pageDark ? '#777' : '#9aa0a6');
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.moveTo(sp.marginLeftTwips * scale, lineY * scale);
      ctx.lineTo((sp.pageWidthTwips - sp.marginRightTwips) * scale, lineY * scale);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `600 ${9 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = active ? (this.pageDark ? '#9bc0ff' : '#2b579a') : (this.pageDark ? '#9aa0a6' : '#9aa0a6');
      const label = kind === 'header' ? 'Header' : 'Footer';
      const ly = (kind === 'header' ? lineY - 60 : lineY + 190) * scale;
      ctx.fillText(label, sp.marginLeftTwips * scale, ly);
      ctx.restore();
    };
    drawBand('header');
    drawBand('footer');
  }

  /** sectPr da página i segundo a estrutura SALVA do corpo (modo HF edit). */
  private sectPrForSavedPage(pageIdx: number) {
    const sb = this.savedBody;
    const sIdx = sb?.pageSections[pageIdx] ?? 0;
    return sb?.sectionStarts[sIdx]?.section.sectPr ?? this.sect();
  }

  private layout(): void {
    if (!this.model || !this.fonts) return;
    this.syncSections();
    // visão de impressão: o motor de layout do Word (o mesmo do PDF) —
    // incremental quando a edição ficou num parágrafo/tabela, senão completo
    if (this.engineActive()) {
      if (this.fastHint && this.tryFastLayout()) return;
      if (this.fastTable && this.tryFastTable()) return;
      this.fastHint = null;
      this.fastTable = null;
      window.clearTimeout(this.idleRelayout);
      this.idleRelayout = 0;
      if (this.layoutEngine()) return;
    }
    this.fastHint = null;
    this.eng = null;
    this.engPageCache.clear();
    this.syncRunRPr(this.model.paragraphs);
    // edição de caixa de texto: precede o HF (a caixa pode morar no HF)
    if (this.tbEdit && this.view === 'print' && this.savedForTb) {
      this.layoutTextboxEdit();
      return;
    }
    // edição de HF: caminho dedicado que mantém a paginação do corpo
    if (this.hfEdit && this.view === 'print' && this.savedBody) {
      this.layoutHfEdit();
      return;
    }
    // Leitura também é PAGINADA (páginas reais), só que exibida em "spread" 2-up.
    const isPaged = this.view === 'print' || this.view === 'read';

    // geometria mutável: muda quando a seção muda (modo paginado)
    let sectIdx = 0;
    let s = isPaged && this.sectionStarts.length ? this.sectPrAt(0) : this.sect();
    let contentW = this.contentWidthForSect(s);
    let marginL = isPaged ? s.marginLeftTwips : 600;
    let marginT = isPaged ? s.marginTopTwips : 600;
    let contentBottom = s.pageHeightTwips - s.marginBottomTwips;
    // colunas (w:cols): largura/índice da coluna corrente. O texto preenche a
    // coluna até contentBottom e então passa para a próxima coluna da MESMA
    // página; esgotadas as colunas, vai para a próxima página.
    let nCols = 1, colSpace = 0, colW = contentW;
    let col = 0;
    const applyColGeom = () => {
      nCols = isPaged && s.cols ? Math.max(1, s.cols.count) : 1;
      colSpace = s.cols?.spaceTwips ?? 0;
      colW = nCols > 1 ? (contentW - colSpace * (nCols - 1)) / nCols : contentW;
    };
    applyColGeom();
    const colX = () => marginL + col * (colW + colSpace);
    // O app de referência, em seção de colunas terminada por quebra nextPage (caso do
    // catálogo), NÃO balanceia: enche a coluna 1 até o fim da página e só então
    // passa para a 2. (Balanceamento só ocorre em quebra contínua.)

    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    this.pageSections = [0];
    let pendingDropCap: {
      text: string; sizePt: number; bold: boolean; italic: boolean;
      color?: string; widthTwips: number;
    } | null = null;
    let page = 0;
    let y = marginT;
    // Modo contínuo (Web/Rascunho): o documento inteiro num ÚNICO canvas estoura
    // o limite de ~16k px do browser → o buffer é reduzido (upscale) → borrado.
    // Quebramos em "tiles" de altura limitada, em limites de linha, reusando a
    // máquina de múltiplas páginas (page = tile, yTwips relativo ao tile).
    const CONT_TILE_PX = 4000;
    const tileTwips = isPaged ? Infinity : CONT_TILE_PX / (PX_PER_TWIP * this.zoom);
    const tileBottoms: number[] = [];
    const contTileBreak = (need: number): void => {
      if (!isPaged && y > (page === 0 ? marginT : 0) && y + need > tileTwips) {
        page++;
        y = 0;
      }
    };
    const listCounters: number[] = [0, 0, 0];
    let prevWasList = false;
    const ROMANS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
    const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
    // altura reservada na base da página para notas de rodapé cujas referências
    // caem nesta página (como no app de referência, a nota empurra o corpo para cima/próxima
    // página). Espelha o cálculo de paint()/exportPdf: hits*260 + 120 (separador).
    const FN_LINE = 260, FN_SEP = 120;
    let fnReserved = 0;
    let pageHadNotes = false;

    const newPage = () => {
      page++;
      y = marginT;
      col = 0;
      this.pageSections[page] = sectIdx;
      fnReserved = 0;
      pageHadNotes = false;
    };
    // fim da coluna: avança p/ a próxima coluna da mesma página, ou nova página
    const breakColumn = () => {
      if (col < nCols - 1) { col++; y = marginT; }
      else newPage();
    };

    this.model.paragraphs.forEach((p, pi) => {
      // troca de seção (modo print): nova página com nova geometria
      if (isPaged && this.sectionStarts.length > 0) {
        const si = this.sectionIndexForPara(pi);
        if (si !== sectIdx) {
          sectIdx = si;
          s = this.sectPrAt(si);
          contentW = this.contentWidthForSect(s);
          marginL = s.marginLeftTwips;
          marginT = s.marginTopTwips;
          contentBottom = s.pageHeightTwips - s.marginBottomTwips;
          applyColGeom();
          newPage();
        }
      }

      // tabelas ancoradas antes deste parágrafo
      for (const anchor of this.tableAnchors) {
        if (anchor.beforePara !== pi) continue;
        const tl = this.layoutTable(anchor.table, marginL, contentW);
        if (isPaged && y + tl.heightTwips > contentBottom && tl.heightTwips < contentBottom - marginT) {
          newPage();
        }
        contTileBreak(tl.heightTwips);
        tl.page = page;
        tl.yTwips = y;
        this.tableLayouts.push(tl);
        y += tl.heightTwips + 160;
        tileBottoms[page] = y;
      }

      const st = this.styleOf(p);
      const outlineIndent = this.view === 'outline' ? (st ? 0 : 720) : 0;
      const indent = (p.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0) + outlineIndent;
      const indentRight = p.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
      const firstDelta = p.props.indentFirstLineTwips ?? 0; // >0 firstLine, <0 hanging
      const avail = Math.max(500, colW - indent - indentRight);
      const availFirst = Math.max(500, avail - firstDelta);
      // parágrafo de campo TOC vazio: invisível (o sumário gerado vem depois)
      if (p.props.tocInstr && p.runs.every((r) => r.text.trim() === '')) {
        this.layoutCache.push({ spans: [], charAdvances: [], lines: [], spanCharStart: [] });
        return;
      }
      // drop cap: NÃO entra no fluxo — vira float sobre o próximo parágrafo
      if (p.props.dropCap && p.runs.length > 0) {
        const run = p.runs[0]!;
        const sizePt = (run.props.szHalfPt ?? 22) / 2;
        const letterFont = this.fonts!.resolve(run.props.fontAscii, run.props.bold ? 'bold' : 'regular');
        pendingDropCap = {
          text: run.text,
          sizePt,
          bold: run.props.bold,
          italic: run.props.italic,
          color: run.props.color,
          widthTwips: [...run.text].reduce((w, ch) => w + letterFont.advanceTwips(ch.codePointAt(0)!, sizePt), 0),
        };
        this.layoutCache.push({ spans: [], charAdvances: [], lines: [], spanCharStart: [] });
        return;
      }
      const dropCap = pendingDropCap;
      pendingDropCap = null;
      const dropIndent = dropCap ? dropCap.widthTwips + 120 : 0;

      // skipFloating: imagens flutuantes do corpo NÃO entram no fluxo (são
      // desenhadas pelo loop floatImages); senão viram span inline TAMBÉM e o
      // objeto aparece DUPLICADO (ex.: logo da capa).
      const spans = this.buildSpans(p, { skipFloating: true });
      const lineRulePre = {
        line: p.props.lineTwentieths ?? st?.lineTwentieths ?? 259,
        lineRule: 'auto' as const,
      };
      const pitchPre = Math.round(
        lineHeightPt(this.fonts!.resolve(undefined, 'regular'), spans[0]?.sizePt ?? 11, lineRulePre) * TWIPS_PER_PT / 2.4,
      ) * 2.4;
      const dropK = dropCap
        ? Math.max(2, Math.round((deviceEmPt(dropCap.sizePt) * TWIPS_PER_PT) / pitchPre))
        : 0;

      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts!, {
        availableTwips: avail,
        firstLineAvailableTwips: availFirst,
        tabOriginOffsetTwips: indent,
        firstLineTabOriginOffsetTwips: indent + firstDelta,
        tabStops: p.props.tabStops,
        indentFirstKLines: dropCap ? { k: dropK, indentTwips: dropIndent } : undefined,
      });
      const spanCharStart: number[] = [];
      let acc = 0;
      for (const sp of spans) { spanCharStart.push(acc); acc += sp.text.length; }

      // numeração (multinível: contadores por ilvl, níveis fundos resetam)
      let marker: string | undefined;
      if (p.props.numbering) {
        const lvl = Math.min(p.props.numbering.ilvl, 2);
        if (!prevWasList) listCounters.fill(0);
        if (p.props.numbering.kind === 'decimal') {
          listCounters[lvl] = (listCounters[lvl] ?? 0) + 1;
          for (let d = lvl + 1; d < 3; d++) listCounters[d] = 0;
          const n = listCounters[lvl]!;
          marker = lvl === 0 ? `${n}.` : lvl === 1 ? `${ALPHA[(n - 1) % 26]}.` : `${ROMANS[(n - 1) % 10]}.`;
        } else {
          marker = ['•', 'o', '▪'][lvl];
        }
        prevWasList = true;
      } else { prevWasList = false; listCounters.fill(0); }

      // fallbacks: props diretas → estilo → docDefaults do DOCUMENTO →
      // (com styles.xml: defaults do app de referência after=0/line=240; sem: nosso template)
      const dd = this.docDefaults();
      const hasStyles = this.hasDocStyles();
      const lineRule = {
        line: p.props.lineTwentieths ?? st?.lineTwentieths ?? dd.para.lineTwentieths ?? (hasStyles ? 240 : 259),
        lineRule: 'auto' as const,
      };
      // o app de referência posiciona linhas na grade de 1/600" (2.4tw) — quantizamos
      // pitch e espaçamentos para não acumular fração (visto no style-oracle)
      const qDev = (tw: number) => Math.round(tw / 2.4) * 2.4;
      const spaceBefore = qDev(p.props.spaceBeforeTwips ?? st?.spaceBeforeTwips ?? dd.para.spaceBeforeTwips ?? 0);
      const spaceAfter = qDev(p.props.spaceAfterTwips ?? st?.spaceAfterTwips ?? dd.para.spaceAfterTwips ?? (hasStyles ? 0 : 160));
      // w:pageBreakBefore: força página nova antes do parágrafo
      if (isPaged && p.props.pageBreakBefore && y > marginT) newPage();
      y += spaceBefore;

      // notas de rodapé referenciadas neste parágrafo (reservam área na base)
      let noteCount = 0;
      if (this.fullDoc) for (const r of p.runs) if (r.noteRef?.kind === 'footnote') noteCount++;

      const laid: LaidLine[] = [];
      lines.forEach((rich, li) => {
        const font = this.fonts!.resolve(undefined, 'regular');
        const sizeForHeight = Math.max(rich.maxSizePt, 1);
        const descTwips = (Math.abs(font.metrics.descender) / font.metrics.unitsPerEm) *
          deviceEmPt(sizeForHeight) * TWIPS_PER_PT;
        // linha cresce para conter imagens (ascent efetivo = maxAscTwips);
        // pitch e ascent na grade de 1/600" como o app de referência — medindo os Tm do PDF
        // do app de referência, o pitch do corpo Calibri 11 é 13,44pt = qDev(269,53tw)=268,8tw,
        // exatamente o que este snap produz (validado contra o PDF do app de referência).
        const lh = qDev(Math.max(
          lineHeightPt(font, sizeForHeight, lineRule) * TWIPS_PER_PT,
          rich.maxAscTwips + descTwips,
        ));
        const asc = qDev(Math.max(
          (font.metrics.ascender / font.metrics.unitsPerEm) *
            deviceEmPt(sizeForHeight) * TWIPS_PER_PT,
          rich.maxAscTwips,
        ));
        // reserva a área das notas deste parágrafo na página onde sua 1ª linha cai
        if (li === 0 && noteCount > 0) {
          fnReserved += noteCount * FN_LINE + (pageHadNotes ? 0 : FN_SEP);
          pageHadNotes = true;
        }
        contTileBreak(lh);
        if (isPaged && y + lh > contentBottom - fnReserved) {
          breakColumn(); // avança coluna OU nova página (reseta col/y)
          const onNewPage = col === 0;
          // o parágrafo (e suas notas) migra inteiro: re-reserva só em página nova
          if (onNewPage && li === 0 && noteCount > 0) {
            fnReserved = noteCount * FN_LINE + FN_SEP;
            pageHadNotes = true;
          }
          // órfãs/viúvas só em coluna única (mover linhas entre colunas exigiria
          // recomputar o x de cada uma — ganho não compensa a complexidade)
          if (nCols === 1) {
            // controle de órfãs (padrão do app de referência): não deixar a 1ª linha sozinha
            if (li === 1 && laid.length === 1) {
              const first = laid[0]!;
              const delta = y - first.yTwips;
              first.page = page;
              first.yTwips += delta;
              first.baselineTwips += delta;
              y += first.heightTwips;
            }
            // controle de viúvas: última linha não fica sozinha
            else if (li === lines.length - 1 && laid.length >= 2) {
              const prev = laid[laid.length - 1]!;
              if (prev.page !== page) {
                const delta = y - prev.yTwips;
                prev.page = page;
                prev.yTwips += delta;
                prev.baselineTwips += delta;
                y += prev.heightTwips;
              }
            }
          }
        }

        const inDropZone = dropCap !== null && li < dropK;
        const lineIndentX = indent + (li === 0 ? firstDelta : 0) + (inDropZone ? dropIndent : 0);
        const lineAvail = (li === 0 ? availFirst : avail) - (inDropZone ? dropIndent : 0);
        let x = colX() + lineIndentX;
        // registra o float da capitular na 1ª linha do parágrafo
        if (dropCap && li === 0) {
          this.dropCapFloats.push({
            ...dropCap,
            page,
            xTwips: colX() + indent,
            yTopTwips: y,
            kPitch: pitchPre * dropK,
          });
        }
        let justifyExtra = 0;
        const align = p.props.alignment ?? st?.alignment;
        if (align === 'center') x += (lineAvail - rich.widthTwips) / 2;
        else if (align === 'right') x += lineAvail - rich.widthTwips;
        else if (align === 'both' && li < lines.length - 1) {
          const text = spans.map((sp) => sp.text).join('').slice(rich.start, rich.end).trimEnd();
          const spaces = (text.match(/ /g) ?? []).length;
          if (spaces > 0) justifyExtra = (lineAvail - rich.widthTwips) / spaces;
        }
        laid.push({
          para: pi, rich, page, xTwips: x, yTwips: y,
          heightTwips: lh, baselineTwips: y + asc,
          marker: li === 0 && marker !== undefined
            ? { text: marker, xTwips: colX() + indent - 360, sizePt: 11 }
            : undefined,
          justifyExtraPerSpace: justifyExtra,
        });
        y += lh;
        if (!isPaged) tileBottoms[page] = y;
        // quebra de página manual (w:br type="page" → \f) encerra a página
        const fullText = spans.map((sp) => sp.text).join('');
        if (isPaged && rich.end > 0 && fullText[rich.end - 1] === '\f') {
          newPage();
        }
      });
      y += spaceAfter;
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });

    // tabelas ancoradas após o último parágrafo
    for (const anchor of this.tableAnchors) {
      if (anchor.beforePara < this.model.paragraphs.length) continue;
      const tl = this.layoutTable(anchor.table, marginL, contentW);
      if (isPaged && y + tl.heightTwips > contentBottom) newPage();
      tl.page = page;
      tl.yTwips = y;
      this.tableLayouts.push(tl);
      y += tl.heightTwips + 160;
    }

    // notas de rodapé: em quais páginas caem as referências
    this.footnoteHits = [];
    if (this.fullDoc) {
      this.layoutCache.forEach((pl, pi) => {
        const para = this.model!.paragraphs[pi]!;
        for (const run of para.runs) {
          if (run.noteRef?.kind === 'footnote') {
            const pg = pl.lines[0]?.page ?? 0;
            this.footnoteHits.push({ page: pg, id: run.noteRef.id });
          }
        }
      });
    }

    this.pageCount = isPaged ? page + 1 : 1; // contínuo = 1 página lógica (tiles à parte)
    if (!isPaged) {
      this.continuousHeight = y + 600;
      tileBottoms[page] = y; // garante o último tile
      // último tile ganha um respiro embaixo (como o padding do modo contínuo)
      this.tileHeights = tileBottoms.map((b, i) => (b ?? 0) + (i === page ? 600 : 0));
    } else {
      this.tileHeights = [];
    }
  }

  /** Substitui PAGE/NUMPAGES no texto de header/footer. */
  private substField(text: string, pageIdx: number): string {
    return text
      .replace(/\bNUMPAGES\b/g, String(this.numPagesFor()))
      .replace(/\bPAGE\b/g, String(this.pageNumberFor(pageIdx)));
  }

  /** Renderiza cabeçalho/rodapé com layout real: runs formatados, alinhamento
   *  do parágrafo, tabs centro/direita (default do app de referência) e campos por página. */
  /** Altura total (twips) do conteúdo fluído de um cabeçalho/rodapé — usada
   *  para ancorar o rodapé pela BASE (o Word coloca o rodapé com a base a
   *  footerDistance da borda inferior, não o topo). */
  /** margens internas (twips) da caixa; padrão do Word se ausentes. */
  private tbInsets(tb: DrawingTextbox): { l: number; t: number; r: number; b: number } {
    return tb.insets ?? { l: 144, t: 72, r: 144, b: 72 };
  }
  /** Origem/largura do TEXTO dentro da caixa: recuado pelas margens internas
   *  (lIns/tIns/rIns) como o Word — o texto começa em (x+lIns, y+tIns) e quebra
   *  em (w−lIns−rIns). Usado em todo lugar que pinta os parágrafos da caixa. */
  private tbInner(tb: DrawingTextbox, x: number, y: number, w: number): { x: number; y: number; w: number } {
    const ins = this.tbInsets(tb);
    return { x: x + ins.l, y: y + ins.t, w: Math.max(w - ins.l - ins.r, 120) };
  }
  /** Altura EFETIVA da caixa de texto: se spAutoFit, ajusta ao conteúdo (o cy
   *  declarado é ignorado pelo Word); senão usa a altura declarada. Assim o alvo
   *  de seleção/edição respeita o tamanho real da caixa. */
  private effectiveTbHeight(tb: DrawingTextbox): number {
    if (!tb.autoFit) return tb.heightTwips || 240;
    const ins = this.tbInsets(tb);
    // mede na MESMA largura em que o texto é renderizado (drawHfFloats usa a
    // largura declarada da caixa) + as margens verticais internas.
    const cw = Math.max(tb.widthTwips || 240, 240);
    return Math.max(this.measureHfHeight(tb.paras, cw) + ins.t + ins.b, 240);
  }
  private measureHfHeight(paras: Paragraph[], widthTwips: number): number {
    if (!this.fonts) return 0;
    const font = this.fonts.resolve(undefined, 'regular');
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: 'center' as const },
      { posTwips: widthTwips, align: 'right' as const },
    ];
    let h = 0;
    for (const p of paras) {
      const spans = this.buildSpans({ runs: p.runs, props: p.props }, { skipFloating: true });
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : defaultTabs,
      });
      for (const line of lines) {
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        h += lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * TWIPS_PER_PT;
      }
    }
    return h;
  }

  /** Posição page-absolute (twips) de um objeto flutuante âncorado, respeitando
   *  wp:positionH/V relativeFrom. originX = margem esquerda; paraTop = topo do
   *  parágrafo âncora (banda do HF); sp = geometria da seção. */
  private anchoredPos(
    a: { relH?: string; relV?: string; offsetXTwips?: number; offsetYTwips?: number },
    originXTwips: number, paraTopTwips: number,
    sp: { marginTopTwips: number; marginBottomTwips: number; pageHeightTwips: number },
  ): { x: number; y: number } {
    const ox = a.offsetXTwips ?? 0;
    const oy = a.offsetYTwips ?? 0;
    const x = a.relH === 'page' ? ox : originXTwips + ox;
    let y: number;
    if (a.relV === 'page') y = oy;
    else if (a.relV === 'margin' || a.relV === 'topMargin') y = sp.marginTopTwips + oy;
    else if (a.relV === 'bottomMargin') y = sp.pageHeightTwips - sp.marginBottomTwips + oy;
    else y = paraTopTwips + oy; // paragraph | line | text | (default)
    return { x, y };
  }

  /** Desenha os objetos FLUTUANTES (caixas de texto / imagens ancoradas) dos
   *  runs de um parágrafo de HF, na posição ancorada. Usado tanto no render
   *  normal (paintHf) quanto na EDIÇÃO de HF (senão os flutuantes somem). */
  private drawHfFloats(
    ctx: CanvasRenderingContext2D, scale: number, runs: Run[],
    originXTwips: number, paraTopTwips: number, widthTwips: number,
    pageIdx: number, color: string,
    sp: { marginTopTwips: number; marginBottomTwips: number; pageHeightTwips: number; pageWidthTwips: number },
    floatMode: 'all' | 'behind' | 'front' = 'all',
  ): void {
    // "fundo" = behindDoc OU flutuante full-bleed (capa) — que se sobrepõe ao
    // corpo e por isso deve ficar ATRÁS dele mesmo na edição (comportamento do
    // Word: o conteúdo da página não some sob a imagem).
    const pageArea = sp.pageWidthTwips * sp.pageHeightTwips;
    const isBg = (o: { behindDoc?: boolean; widthTwips: number; heightTwips: number }): boolean =>
      !!o.behindDoc || (pageArea > 0 && o.widthTwips * o.heightTwips >= 0.4 * pageArea);
    for (const r of runs) {
      const obj = r.textbox ?? r.image;
      if (!obj) continue;
      if (r === this.tbSnapshotSuppress) continue; // suprime a caixa em edição no snapshot
      if (floatMode === 'behind' && !isBg(obj)) continue;
      if (floatMode === 'front' && isBg(obj)) continue;
      if (r.textbox) {
        const tb = r.textbox;
        const { x: tx, y: ty } = tb.floating
          ? this.anchoredPos(tb, originXTwips, paraTopTwips, sp)
          : { x: originXTwips, y: paraTopTwips };
        { const iw = this.tbInner(tb, tx, ty, tb.widthTwips || widthTwips);
          this.paintHf(ctx, scale, tb.paras, iw.x, iw.y, iw.w, pageIdx, color, sp); }
        continue;
      }
      const bmp = this.bitmapFor(r.image!);
      if (!bmp) continue;
      const img = r.image!;
      const { x: ix, y: iy } = img.floating
        ? this.anchoredPos(img, originXTwips, paraTopTwips, sp)
        : { x: originXTwips, y: paraTopTwips };
      ctx.drawImage(bmp, ix * scale, iy * scale, img.widthTwips * scale, img.heightTwips * scale);
    }
  }

  /** Família CSS a usar no canvas: a fonte EMBEDADA real (ex.: "Lato", "Lato
   *  Black"); senão a que o resolvedor de fontes escolheu (do SO, instalada,
   *  substituta); senão a base embutida; senão o padrão (Liberation Sans). */
  private familyFor(family: string | undefined): string {
    if (family) {
      if (this.loadedFamilyNames.has(family)) return family;
      // resolvedor único (ex.: "Aptos Display" mesmo com "Aptos" carregada)
      this.applyResolvedFont(family);
      const r = this.appliedFonts.has(family) ? this.fontResolver.getWithFile(family) : undefined;
      if (r && r.source !== 'default') return r.cssFamily;
      const base = family.split(' ')[0]!;
      if (this.loadedFamilyNames.has(base)) return base;
    }
    return DEFAULT_FONT; // fallback (open, sempre carregada)
  }

  private paintHf(
    ctx: CanvasRenderingContext2D,
    scale: number,
    paras: Paragraph[],
    originXTwips: number,
    topYTwips: number,
    widthTwips: number,
    pageIdx: number,
    color: string,
    sp: { marginTopTwips: number; marginBottomTwips: number; pageHeightTwips: number; pageWidthTwips: number },
    floatMode: 'all' | 'behind' | 'front' = 'all',
  ): void {
    if (!this.fonts) return;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: 'center' as const },
      { posTwips: widthTwips, align: 'right' as const },
    ];
    // traço de borda (espelha paintLine) — cabeçalhos/rodapés também têm pBdr
    const stroke = (
      e: { sizeEighthPt: number; color?: string; style: string; spacePt: number } | undefined,
      ax: number, ay: number, bx: number, by: number,
    ): void => {
      if (!e) return;
      ctx.strokeStyle = this.inkColor(e.color);
      ctx.lineWidth = Math.max(1, (e.sizeEighthPt / 8) * TWIPS_PER_PT * scale);
      if (e.style === 'dashed') ctx.setLineDash([8, 5]);
      else if (e.style === 'dotted') ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    let y = topYTwips;
    for (const p of paras) {
      const runs: Run[] = p.runs.map((r) =>
        r.field
          ? { ...r, text: /NUMPAGES/i.test(r.field) ? String(this.numPagesFor())
              : /PAGE/i.test(r.field) ? String(this.pageNumberFor(pageIdx)) : r.text }
          : r,
      );
      const spans = this.buildSpans({ runs, props: p.props }, { skipFloating: true });
      // cor herdada do ESTILO do parágrafo (ex.: "Título" = branco na capa) —
      // usada quando o run não tem cor direta, antes do default passado.
      const stColor = this.styleOf(p)?.color;
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : defaultTabs,
      });
      // imagens e caixas de texto flutuantes do HF (timbrado), no offset ancorado
      this.drawHfFloats(ctx, scale, runs, originXTwips, y, widthTwips, pageIdx, color, sp, floatMode);
      const font = this.fonts.resolve(undefined, 'regular');
      const fallback = p.props.boxBorder && !p.props.borders
        ? { style: 'single', sizeEighthPt: 4, spacePt: 1 }
        : undefined;
      const bd = p.props.borders ?? (fallback
        ? { top: fallback, bottom: fallback, left: fallback, right: fallback }
        : undefined);
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li]!;
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * TWIPS_PER_PT;
        // sombreado do parágrafo (atrás do texto)
        if (p.props.shadingHex) {
          ctx.fillStyle = this.inkColor(p.props.shadingHex);
          ctx.fillRect(originXTwips * scale, y * scale, widthTwips * scale, lh * scale);
        }
        let x = originXTwips;
        const align = p.props.alignment;
        if (align === 'center') x += (widthTwips - line.widthTwips) / 2;
        else if (align === 'right') x += widthTwips - line.widthTwips;
        const baseline = y + lh * 0.8;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex]!;
          const run = runs[span.runIndex ?? seg.spanIndex];
          const renderer = run?.custom
            ? this.inlineRenderers.get(run.custom.type)?.renderer
            : undefined;
          const txt = run?.custom
            ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText
            : span.text.slice(seg.start, seg.end);
          if (!txt.trim()) continue;
          const fam = this.familyFor(span.family);
          const fontPx = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
          const v = span.variant;
          ctx.font = `${v === 'italic' || v === 'boldItalic' ? 'italic ' : ''}` +
            `${v === 'bold' || v === 'boldItalic' ? '700' : '400'} ${fontPx}px ${fam}`;
          const runColor = run?.props.color ?? stColor;
          ctx.fillStyle = runColor ? this.inkColor(runColor) : color;
          ctx.fillText(txt, (x + seg.xTwips) * scale, baseline * scale);
        }
        // bordas do parágrafo (topo na 1ª linha, base na última; laterais sempre)
        if (bd) {
          const isFirst = li === 0;
          const isLast = li === lines.length - 1;
          const spL = (bd.left?.spacePt ?? 0) * TWIPS_PER_PT;
          const spR = (bd.right?.spacePt ?? 0) * TWIPS_PER_PT;
          const spT = (bd.top?.spacePt ?? 0) * TWIPS_PER_PT;
          const spB = (bd.bottom?.spacePt ?? 0) * TWIPS_PER_PT;
          const x0 = (originXTwips - spL) * scale;
          const x1 = (originXTwips + widthTwips + spR) * scale;
          const y0 = (y - (isFirst ? spT : 0)) * scale;
          const y1 = (y + lh + (isLast ? spB : 0)) * scale;
          stroke(bd.left, x0, y0, x0, y1);
          stroke(bd.right, x1, y0, x1, y1);
          if (isFirst) stroke(bd.top, x0, y0, x1, y0);
          if (isLast) stroke(bd.bottom, x0, y1, x1, y1);
        }
        y += lh;
      }
    }
  }

  private contentWidthForSect(s: { pageWidthTwips: number; marginLeftTwips: number; marginRightTwips: number }): number {
    if (this.view === 'web') {
      return Math.max(2000, (this.clientWidth - 48) / (PX_PER_TWIP * this.zoom) - 1200);
    }
    return s.pageWidthTwips - s.marginLeftTwips - s.marginRightTwips;
  }

  /** Layout de tabela: colunas do tblGrid, linhas com altura do conteúdo. */
  private layoutTable(table: TableBlock, xTwips: number, availW: number): TableLayout {
    const PAD = 108; // margem interna padrão da célula (w:tblCellMar)
    const font = this.fonts!.resolve(undefined, 'regular');
    let cols = table.gridColsTwips.length ? [...table.gridColsTwips] : [availW];
    const total = cols.reduce((a, b) => a + b, 0);
    if (total > availW) cols = cols.map((c) => (c * availW) / total);
    const colXs = [0];
    for (const c of cols) colXs.push(colXs[colXs.length - 1]! + c);

    const tl: TableLayout = {
      table, page: 0, xTwips, yTwips: 0, heightTwips: 0,
      colXs, rowYs: [0], cellLines: [], cellShades: [], cellRects: [],
    };

    let yAcc = 0;
    const nRows = table.rows.length;
    table.rows.forEach((row, ri) => {
      let rowH = 240; // mínimo
      let col = 0;
      const pending: typeof tl.cellLines = [];
      for (const cell of row.cells) {
        const x0 = colXs[Math.min(col, colXs.length - 1)]!;
        const x1 = colXs[Math.min(col + cell.gridSpan, colXs.length - 1)]!;
        const cellW = Math.max(300, x1 - x0 - PAD * 2);
        let cy = PAD;
        const paras = [
          ...cell.paragraphs,
          ...cell.tables.flatMap((nt) => nt.rows.flatMap((r) => r.cells.flatMap((c) => c.paragraphs))),
        ];
        for (const p of paras) {
          const st = this.styleOf(p);
          const spans = this.buildSpans(p);
          const spanCharStart: number[] = [];
          let accSp = 0;
          for (const sp of spans) { spanCharStart.push(accSp); accSp += sp.text.length; }
          const { lines } = breakRich(spans, this.fonts!, { availableTwips: cellW });
          const align = p.props.alignment ?? st?.alignment;
          for (const line of lines) {
            const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
            const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * TWIPS_PER_PT;
            // alinhamento horizontal dentro da célula
            let startX = x0 + PAD;
            if (align === 'center') startX += (cellW - line.widthTwips) / 2;
            else if (align === 'right') startX += cellW - line.widthTwips;
            const baseY = cy + lh * 0.8;
            // um cellLine por SEGMENTO (run) — formatação rica por run
            for (const seg of line.segments) {
              const span = spans[seg.spanIndex]!;
              const run = p.runs[span.runIndex ?? seg.spanIndex];
              const renderer = run?.custom
                ? this.inlineRenderers.get(run.custom.type)?.renderer
                : undefined;
              const txt = run?.custom
                ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText
                : span.text.slice(seg.start, seg.end);
              if (!txt) continue;
              pending.push({
                row: ri, col,
                xTwips: startX + seg.xTwips,
                yTwips: baseY,
                text: txt,
                sizePt: span.sizePt,
                bold: span.variant === 'bold' || span.variant === 'boldItalic',
                italic: span.variant === 'italic' || span.variant === 'boldItalic',
                color: run?.props.color ?? st?.color,
                family: this.familyFor(span.family),
                underline: run?.props.underline,
                strike: run?.props.strike,
              });
            }
            cy += lh;
          }
        }
        rowH = Math.max(rowH, cy + PAD);
        if (cell.shadingHex) {
          tl.cellShades.push({ xTwips: x0, yTwips: yAcc, wTwips: x1 - x0, hTwips: 0, hex: cell.shadingHex });
        }
        // bordas resolvidas: tcBorders > tblBorders (outer nas pontas, inside no meio)
        const tb = table.borders;
        const isFirstRow = ri === 0;
        const isLastRow = ri === nRows - 1;
        const isFirstCol = col === 0;
        const isLastCol = col + cell.gridSpan >= cols.length;
        tl.cellRects.push({
          x0, y0: yAcc, x1, y1: -1,
          edges: {
            top: cell.borders?.top ?? (isFirstRow ? tb?.top : tb?.insideH),
            bottom: cell.borders?.bottom ?? (isLastRow ? tb?.bottom : tb?.insideH),
            left: cell.borders?.left ?? (isFirstCol ? tb?.left : tb?.insideV),
            right: cell.borders?.right ?? (isLastCol ? tb?.right : tb?.insideV),
          },
        });
        col += cell.gridSpan;
      }
      for (const sh of tl.cellShades) if (sh.yTwips === yAcc && sh.hTwips === 0) sh.hTwips = rowH;
      for (const cr of tl.cellRects) if (cr.y1 === -1) cr.y1 = yAcc + rowH;
      for (const cl of pending) tl.cellLines.push({ ...cl, yTwips: cl.yTwips + yAcc });
      yAcc += rowH;
      tl.rowYs.push(yAcc);
    });
    tl.heightTwips = yAcc;
    return tl;
  }
  private continuousHeight = 0;
  /** Altura (twips) de cada tile no modo contínuo (Web/Rascunho). */
  private tileHeights: number[] = [];
  private dropCapFloats: {
    text: string; sizePt: number; bold: boolean; italic: boolean; color?: string;
    widthTwips: number; page: number; xTwips: number; yTopTwips: number; kPitch: number;
  }[] = [];
  /** topo (twips) da banda do HF em edição — usado p/ desenhar o rótulo/borda. */
  private hfRegionTopTwips = 0;
  /** altura (twips) do conteúdo do HF em edição — p/ dimensionar a banda. */
  private hfRegionHeightTwips = 0;
  /** Ao capturar o snapshot de fundo (entrar em edição de HF): renderiza os HF
   *  CHEIOS, mas suprime o HF ATIVO (que será pintado por cima, em foco). Assim
   *  o fundo esmaecido contém corpo + o OUTRO HF (como o Word). Null fora disso. */
  private hfSnapshotActive: 'header' | 'footer' | null = null;
  /** Capturando o snapshot de CORPO da edição HF: suprime AMBOS header e footer
   *  (eles são repintados na composição) e usa fundo TRANSPARENTE, para o corpo
   *  compor por cima da imagem behindDoc (capa) sem veladura branca. */
  private hfCapturing = false;
  /** última zona de HF sob o mouse (p/ não repetir o evento de hover). */
  private lastHoverHf: 'header' | 'footer' | null = null;

  /** Em qual zona de HF (margem sup/inf) e PÁGINA o mouse caiu, se alguma. */
  private hfZoneAt(e: MouseEvent): { kind: 'header' | 'footer'; page: number } | null {
    for (let pg = 0; pg < this.canvases.length; pg++) {
      const rect = this.canvases[pg]!.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
      if (e.clientX < rect.left || e.clientX > rect.right) continue;
      const scale = PX_PER_TWIP * this.zoom;
      const yT = (e.clientY - rect.top) / scale;
      if (this.eng) {
        // motor: a faixa real (o cabeçalho alto empurra o corpo para baixo)
        if (yT < this.hfBand(pg, 'header').bottom) return { kind: 'header', page: pg };
        if (yT > this.hfBand(pg, 'footer').top) return { kind: 'footer', page: pg };
        return null;
      }
      const sp = this.sectionStarts.length
        ? this.sectPrAt(this.pageSections[pg] ?? 0)
        : this.sect();
      if (yT < sp.marginTopTwips) return { kind: 'header', page: pg };
      if (yT > sp.pageHeightTwips - sp.marginBottomTwips) return { kind: 'footer', page: pg };
      return null;
    }
    return null;
  }
  /** true se o ponteiro está dentro da faixa ativa (header/footer) da página em edição. */
  private hfClickInActiveBand(e: MouseEvent): boolean {
    if (!this.hfEdit) return false;
    const cv = this.canvases[Math.min(this.hfActivePage, this.canvases.length - 1)];
    if (!cv) return false;
    const rect = cv.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom) return false;
    if (e.clientX < rect.left || e.clientX > rect.right) return false;
    const scale = PX_PER_TWIP * this.zoom;
    const yT = (e.clientY - rect.top) / scale;
    // mesma geometria da banda pintada (ver paint): header = margem superior;
    // footer = margem inferior; limite no corpo.
    const isHeader = this.hfEdit.kind === 'header';
    if (this.eng) {
      const band = this.hfBand(this.hfActivePage, this.hfEdit.kind);
      return yT >= band.top && yT <= band.bottom;
    }
    const sp = this.sectPrForSavedPage(this.hfActivePage);
    const lineY = isHeader ? sp.marginTopTwips : sp.pageHeightTwips - sp.marginBottomTwips;
    const bandTop = isHeader ? 0 : lineY;
    const bandBot = isHeader ? lineY : sp.pageHeightTwips;
    return yT >= bandTop && yT <= bandBot;
  }
  /** Região de HF (header/footer) sob o clique, ou null (corpo). Usado no modo
   *  HF p/ trocar o foco entre header e footer (ambos ativos, como no Word). */
  private hfRegionAtClick(e: MouseEvent): { kind: 'header' | 'footer'; page: number } | null {
    const scale = PX_PER_TWIP * this.zoom;
    for (let pg = 0; pg < this.canvases.length; pg++) {
      const cv = this.canvases[pg];
      if (!cv) continue;
      const rect = cv.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
      if (e.clientX < rect.left || e.clientX > rect.right) continue;
      const yT = (e.clientY - rect.top) / scale;
      if (this.eng) {
        if (yT <= this.hfBand(pg, 'header').bottom) return { kind: 'header', page: pg };
        if (yT >= this.hfBand(pg, 'footer').top) return { kind: 'footer', page: pg };
        return null;
      }
      const sp = this.sectPrForSavedPage(pg);
      if (yT <= sp.marginTopTwips) return { kind: 'header', page: pg };
      if (yT >= sp.pageHeightTwips - sp.marginBottomTwips) return { kind: 'footer', page: pg };
      return null;
    }
    return null;
  }
  /** Troca o foco de edição entre header e footer (ou de página) sem sair do
   *  modo HF. As edições da parte anterior persistem (mesmas refs no fullDoc). */
  private switchHfFocus(kind: 'header' | 'footer', page: number): void {
    if (!this.hfEdit) return;
    if (this.hfEdit.kind === kind && this.hfActivePage === page) return;
    this.exitHeaderFooter();
    this.enterHeaderFooter(kind, page);
  }
  /** Geometria das colunas numa página + quais têm conteúdo (p/ o separador). */
  private colContentOnPage(pg: number, sp: SectPr): {
    n: number; gap: number; origin: (c: number) => number; hasContent: boolean[]; maxBottom: number;
  } | null {
    if (!sp.cols || sp.cols.count < 2) return null;
    const n = sp.cols.count, gap = sp.cols.spaceTwips;
    const cw = (sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips - gap * (n - 1)) / n;
    const origin = (c: number): number => sp.marginLeftTwips + c * (cw + gap);
    const hasContent = new Array(n).fill(false);
    let maxBottom = sp.marginTopTwips;
    for (const pl of this.layoutCache) for (const ln of pl.lines) {
      if (ln.page !== pg) continue;
      maxBottom = Math.max(maxBottom, ln.yTwips + ln.heightTwips);
      let best = 0;
      for (let c = 1; c < n; c++) {
        if (Math.abs(ln.xTwips - origin(c)) < Math.abs(ln.xTwips - origin(best))) best = c;
      }
      hasContent[best] = true;
    }
    maxBottom = Math.min(maxBottom, sp.pageHeightTwips - sp.marginBottomTwips);
    return { n, gap, origin, hasContent, maxBottom };
  }

  /** snapshot do corpo (por página) p/ mostrar esmaecido durante a edição de HF. */
  private hfBodySnapshots: HTMLCanvasElement[] = [];

  private allLines(): LaidLine[] {
    return this.layoutCache.flatMap((p) => p.lines);
  }
  private lineOf(pos: DocPosition): LaidLine | null {
    const pl = this.layoutCache[pos.para];
    if (!pl) return null;
    for (const l of pl.lines) {
      if (pos.offset >= l.rich.start && pos.offset <= l.rich.end) {
        if (pos.offset === l.rich.end && l !== pl.lines[pl.lines.length - 1]) continue;
        return l;
      }
    }
    return pl.lines[pl.lines.length - 1] ?? null;
  }
  private caretX(pos: DocPosition, line: LaidLine): number {
    if (line.eng) return caretXIn(line.eng, pos.offset);
    const pl = this.layoutCache[pos.para]!;
    let x = line.xTwips;
    const text = pl.spans.map((s) => s.text).join('');
    for (let i = line.rich.start; i < pos.offset && i < pl.charAdvances.length; i++) {
      x += pl.charAdvances[i]!;
      if (line.justifyExtraPerSpace && text[i] === ' ') x += line.justifyExtraPerSpace;
    }
    return x;
  }
  private hitLineX(line: LaidLine, xTwips: number): number {
    if (line.eng) return Math.max(line.rich.start, Math.min(line.rich.end, offsetAtX(line.eng, xTwips, line.rich.end)));
    const pl = this.layoutCache[line.para]!;
    let x = line.xTwips;
    const text = pl.spans.map((s) => s.text).join('');
    for (let i = line.rich.start; i < line.rich.end; i++) {
      let a = pl.charAdvances[i]!;
      if (line.justifyExtraPerSpace && text[i] === ' ') a += line.justifyExtraPerSpace;
      if (xTwips < x + a / 2) return i;
      x += a;
    }
    return line.rich.end;
  }

  /** Localiza uma caixa de texto flutuante sob o ponteiro (corpo OU HF ativo).
   *  Retorna o run que a carrega, seu retângulo ancorado (twips) e a página. */
  private hitTextbox(
    e: MouseEvent,
  ): { hostRun: Run; rect: { x: number; y: number; w: number; h: number }; page: number } | null {
    if (!this.model) return null;
    const inHf = !!this.hfEdit;
    const scale = PX_PER_TWIP * this.zoom;
    const paras = this.model.paragraphs;
    for (let pi = 0; pi < paras.length; pi++) {
      for (const r of paras[pi]!.runs) {
        if (!r.textbox) continue;
        const tb = r.textbox;
        let page: number, sp: SectPr, originX: number, paraTop: number;
        // motor: o retângulo exatamente como foi posicionado (page.objects)
        const er = this.eng ? this.engObjectOf(r, inHf ? this.hfActivePage : undefined) : null;
        if (this.eng && !er) continue;
        if (inHf) {
          page = this.hfActivePage;
          sp = this.sectPrForSavedPage(page);
          originX = sp.marginLeftTwips;
          paraTop = this.layoutCache[pi]?.lines[0]?.yTwips ?? this.hfRegionTopTwips;
        } else {
          const first = this.layoutCache[pi]?.lines[0];
          if (!first) continue;
          page = first.page;
          sp = this.sectPrAt(this.pageSections[page] ?? 0);
          originX = sp.marginLeftTwips;
          paraTop = first.yTwips;
        }
        let { x, y } = tb.floating
          ? this.anchoredPos(tb, originX, paraTop, sp)
          : { x: originX, y: paraTop };
        let w = tb.widthTwips || (sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips);
        let h = this.effectiveTbHeight(tb);
        if (er) ({ page, x, y, w, h } = er);
        const cv = this.canvases[page];
        if (!cv) continue;
        const rect = cv.getBoundingClientRect();
        if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
        if (e.clientX < rect.left || e.clientX > rect.right) continue;
        const xT = (e.clientX - rect.left) / scale;
        const yT = (e.clientY - rect.top) / scale;
        if (xT >= x && xT <= x + w && yT >= y && yT <= y + h) {
          return { hostRun: r, rect: { x, y, w, h }, page };
        }
      }
    }
    return null;
  }
  /** true se o ponteiro está dentro da caixa em edição (com pequena tolerância). */
  private pointInTbRect(e: MouseEvent): boolean {
    if (!this.tbEdit) return false;
    const cv = this.canvases[Math.min(this.tbEdit.pageIdx, this.canvases.length - 1)];
    if (!cv) return false;
    const rect = cv.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom) return false;
    const scale = PX_PER_TWIP * this.zoom;
    const xT = (e.clientX - rect.left) / scale;
    const yT = (e.clientY - rect.top) / scale;
    const r = this.tbEdit.rectTwips;
    const tol = 30; // twips
    return xT >= r.x - tol && xT <= r.x + r.w + tol && yT >= r.y - tol && yT <= r.y + r.h + tol;
  }

  // ─────────── objetos flutuantes: enumeração / hit-test / handles ───────────
  private static readonly FLOAT_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

  /** Todos os objetos flutuantes visíveis no contexto atual (corpo OU HF ativo),
   *  com o retângulo EXATAMENTE como são pintados. Vazio durante edição de texto
   *  de caixa (tbEdit). */
  private enumFloats(): FloatHandle[] {
    if (this.tbEdit || !this.model) return [];
    const out: FloatHandle[] = [];
    // motor: retângulos dos objetos como ele os posicionou (page.objects) — no
    // cabeçalho/rodapé em edição, os da página ativa
    if (this.eng) {
      const onPage = this.hfEdit ? this.hfActivePage : undefined;
      for (const p of this.model.paragraphs) {
        for (const r of p.runs) {
          const obj = r.image?.floating ? r.image : r.textbox;
          if (!obj) continue;
          const er = this.engObjectOf(r, onPage);
          if (er) out.push({ run: r, obj, kind: r.textbox ? 'textbox' : 'image', page: er.page, rect: { x: er.x, y: er.y, w: er.w, h: er.h } });
        }
      }
      return out;
    }
    if (this.hfEdit) {
      const sp = this.sectPrForSavedPage(this.hfActivePage);
      const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
      this.model.paragraphs.forEach((p, pi) => {
        const paraTop = this.layoutCache[pi]?.lines[0]?.yTwips ?? this.hfRegionTopTwips;
        for (const r of p.runs) {
          const obj = (r.textbox ?? r.image) as InlineImage | DrawingTextbox | undefined;
          if (!obj) continue;
          const { x, y } = obj.floating
            ? this.anchoredPos(obj, sp.marginLeftTwips, paraTop, sp)
            : { x: sp.marginLeftTwips, y: paraTop };
          out.push({
            run: r, obj, kind: r.textbox ? 'textbox' : 'image', page: this.hfActivePage,
            rect: { x, y, w: obj.widthTwips || colW, h: r.textbox ? this.effectiveTbHeight(r.textbox) : (obj.heightTwips || 240) },
          });
        }
      });
      return out;
    }
    // corpo: imagens flutuantes (floatImages) + caixas de texto dos parágrafos
    for (const f of this.floatImages) {
      const first = this.layoutCache[f.para]?.lines[0];
      if (!first || !f.run.image) continue;
      const img = f.run.image;
      out.push({
        run: f.run, obj: img, kind: 'image', page: first.page,
        rect: {
          x: first.xTwips + (img.offsetXTwips ?? 0),
          y: first.yTwips + (img.offsetYTwips ?? 0),
          w: img.widthTwips, h: img.heightTwips,
        },
      });
    }
    this.model.paragraphs.forEach((p, pi) => {
      const first = this.layoutCache[pi]?.lines[0];
      if (!first) return;
      const sp = this.sectPrAt(this.pageSections[first.page] ?? 0);
      const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
      for (const r of p.runs) {
        if (!r.textbox) continue;
        const { x, y } = r.textbox.floating
          ? this.anchoredPos(r.textbox, sp.marginLeftTwips, first.yTwips, sp)
          : { x: sp.marginLeftTwips, y: first.yTwips };
        out.push({
          run: r, obj: r.textbox, kind: 'textbox', page: first.page,
          rect: { x, y, w: r.textbox.widthTwips || colW, h: this.effectiveTbHeight(r.textbox) },
        });
      }
    });
    return out;
  }

  /** Handle atual do objeto selecionado (retângulo vivo, recomputado). */
  private selectedFloat(): FloatHandle | null {
    if (!this.floatSel) return null;
    return this.enumFloats().find((h) => h.run === this.floatSel) ?? null;
  }
  /** Float ATIVO para handles/resize: a caixa em EDIÇÃO (tbEdit) OU a imagem
   *  selecionada (floatSel). Assim o redimensionamento coexiste com a edição. */
  private activeFloat(): FloatHandle | null {
    if (this.tbEdit) {
      const tb = this.tbEdit.hostRun.textbox;
      if (!tb) return null;
      return {
        run: this.tbEdit.hostRun, obj: tb, kind: 'textbox',
        page: this.tbEdit.pageIdx, rect: { ...this.tbEdit.rectTwips },
      };
    }
    return this.selectedFloat();
  }

  /** Objeto flutuante sob o ponteiro (o de cima = último pintado = mais à frente). */
  private hitFloat(e: MouseEvent, kind?: FloatHandle['kind']): FloatHandle | null {
    const scale = PX_PER_TWIP * this.zoom;
    let best: FloatHandle | null = null;
    for (const h of this.enumFloats()) {
      if (kind && h.kind !== kind) continue;
      const cv = this.canvases[h.page];
      if (!cv) continue;
      const rect = cv.getBoundingClientRect();
      // fundos full-bleed / capa (área ≥ 55% da página) são click-through, como
      // o comportamento behindDoc do Word — não os agarra para seleção.
      const pageW = rect.width / scale, pageH = rect.height / scale;
      if (h.rect.w * h.rect.h >= 0.55 * pageW * pageH) continue;
      const xT = (e.clientX - rect.left) / scale;
      const yT = (e.clientY - rect.top) / scale;
      if (xT >= h.rect.x && xT <= h.rect.x + h.rect.w && yT >= h.rect.y && yT <= h.rect.y + h.rect.h) {
        best = h; // continua p/ pegar o ÚLTIMO (mais à frente)
      }
    }
    return best;
  }

  /** Centro (client px) de cada handle do objeto selecionado. */
  private handleCenters(h: FloatHandle): Record<string, { cx: number; cy: number }> | null {
    const cv = this.canvases[h.page];
    if (!cv) return null;
    const rect = cv.getBoundingClientRect();
    const scale = PX_PER_TWIP * this.zoom;
    const left = rect.left + h.rect.x * scale;
    const top = rect.top + h.rect.y * scale;
    const right = left + h.rect.w * scale;
    const bottom = top + h.rect.h * scale;
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    return {
      nw: { cx: left, cy: top }, n: { cx: midX, cy: top }, ne: { cx: right, cy: top },
      e: { cx: right, cy: midY }, se: { cx: right, cy: bottom }, s: { cx: midX, cy: bottom },
      sw: { cx: left, cy: bottom }, w: { cx: left, cy: midY },
    };
  }

  /** Nome do handle sob o ponteiro (ou null). */
  private handleAt(e: MouseEvent): string | null {
    const h = this.activeFloat();
    if (!h) return null;
    const centers = this.handleCenters(h);
    if (!centers) return null;
    const R = 7 * (window.devicePixelRatio || 1);
    for (const name of UniversalWriteElement.FLOAT_HANDLES) {
      const c = centers[name]!;
      if (Math.abs(e.clientX - c.cx) <= R && Math.abs(e.clientY - c.cy) <= R) return name;
    }
    return null;
  }

  private cursorForHandle(hn: string): string {
    if (hn === 'nw' || hn === 'se') return 'nwse-resize';
    if (hn === 'ne' || hn === 'sw') return 'nesw-resize';
    if (hn === 'n' || hn === 's') return 'ns-resize';
    return 'ew-resize';
  }

  /** Inicia arrasto de mover (handle='') ou redimensionar. Snapshot p/ undo. */
  private startFloatDrag(e: MouseEvent, mode: 'move' | 'resize', handle: string): void {
    const h = this.activeFloat();
    if (!h) return;
    e.preventDefault();
    const scale = PX_PER_TWIP * this.zoom;
    this.snapshot(); // undo + marca HF sujo
    const obj = h.obj;
    // caixa em edição: o retângulo na tela (tbEdit.rectTwips) é a referência.
    const editingTb = this.tbEdit && obj === this.tbEdit.hostRun.textbox ? this.tbEdit : null;
    const startRect = editingTb ? { ...editingTb.rectTwips } : null;
    if (mode === 'resize' && editingTb) (obj as DrawingTextbox).autoFit = false; // sizing manual
    // caixa em edição: parte do retângulo EXIBIDO (autofit), não do cy declarado.
    const startW = editingTb ? editingTb.rectTwips.w : obj.widthTwips;
    const startH = editingTb ? editingTb.rectTwips.h : obj.heightTwips;
    const d = {
      mode, handle,
      startClientX: e.clientX, startClientY: e.clientY,
      startW, startH,
      startOX: obj.offsetXTwips ?? 0, startOY: obj.offsetYTwips ?? 0,
      aspect: startH ? startW / startH : 1,
      page: h.page, moved: false,
    };
    this.floatDrag = d;
    // motor: posição exibida no início do arrasto (a âncora vira relativa à página)
    const engStart = this.eng && !editingTb ? { x: h.rect.x, y: h.rect.y } : null;
    const move = (ev: MouseEvent) => {
      if (!this.floatDrag) return;
      const dxT = (ev.clientX - d.startClientX) / scale;
      const dyT = (ev.clientY - d.startClientY) / scale;
      if (Math.abs(ev.clientX - d.startClientX) + Math.abs(ev.clientY - d.startClientY) > 2) d.moved = true;
      if (d.mode === 'move') {
        obj.offsetXTwips = Math.round(d.startOX + dxT);
        obj.offsetYTwips = Math.round(d.startOY + dyT);
      } else {
        this.applyResize(obj, d, dxT, dyT, h.kind === 'image');
      }
      if (engStart) this.moveAnchorTo(obj, engStart.x + (obj.offsetXTwips ?? 0) - d.startOX, engStart.y + (obj.offsetYTwips ?? 0) - d.startOY);
      // caixa em edição: espelha a nova geometria no retângulo de edição p/ o
      // layout/handles seguirem o arrasto.
      if (editingTb && startRect) {
        editingTb.rectTwips = {
          x: startRect.x + ((obj.offsetXTwips ?? 0) - d.startOX),
          y: startRect.y + ((obj.offsetYTwips ?? 0) - d.startOY),
          w: obj.widthTwips, h: obj.heightTwips,
        };
      }
      // um relayout por quadro (o do motor é o documento inteiro)
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (this.floatDrag) this.refresh(); });
    };
    let frame = 0;
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      cancelAnimationFrame(frame);
      frame = 0;
      const moved = this.floatDrag?.moved;
      this.floatDrag = null;
      if (!moved) this.undoStack.pop(); // clique sem arrasto: descarta snapshot
      else { this.dispatchEvent(new CustomEvent('uw-change')); }
      this.onSelectionChange?.(); this.chromeSync?.();
      this.refresh();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  private applyResize(
    obj: InlineImage | DrawingTextbox,
    d: { handle: string; startW: number; startH: number; startOX: number; startOY: number; aspect: number },
    dxT: number, dyT: number, lockAspect: boolean,
  ): void {
    const MIN = 120; // twips (~6pt)
    const hn = d.handle;
    let w = d.startW, h = d.startH, ox = d.startOX, oy = d.startOY;
    if (hn.includes('e')) w = d.startW + dxT;
    if (hn.includes('w')) { w = d.startW - dxT; ox = d.startOX + dxT; }
    if (hn.includes('s')) h = d.startH + dyT;
    if (hn.includes('n')) { h = d.startH - dyT; oy = d.startOY + dyT; }
    // trava de aspecto em cantos p/ imagem (padrão do Word)
    if (lockAspect && hn.length === 2 && d.startW > 0 && d.startH > 0) {
      const rw = w / d.startW, rh = h / d.startH;
      const r = Math.abs(rw - 1) >= Math.abs(rh - 1) ? rw : rh;
      const nw = d.startW * r, nh = d.startH * r;
      if (hn.includes('w')) ox = d.startOX + (d.startW - nw);
      if (hn.includes('n')) oy = d.startOY + (d.startH - nh);
      w = nw; h = nh;
    }
    obj.widthTwips = Math.max(MIN, Math.round(w));
    obj.heightTwips = Math.max(MIN, Math.round(h));
    obj.offsetXTwips = Math.round(ox);
    obj.offsetYTwips = Math.round(oy);
  }

  private deleteSelectedFloat(): void {
    const run = this.floatSel;
    if (!run || !this.model) return;
    this.snapshot();
    for (const p of this.model.paragraphs) {
      const idx = p.runs.indexOf(run);
      if (idx >= 0) { p.runs.splice(idx, 1); break; }
    }
    this.floatImages = this.floatImages.filter((f) => f.run !== run);
    this.floatSel = null;
    this.refresh();
    this.onSelectionChange?.(); this.chromeSync?.();
  }

  private hitTest(e: MouseEvent): DocPosition | null {
    if (!this.model) return null;
    // com páginas lado a lado, escolhe a página pelo X E pelo Y;
    // clique no vão entre páginas vai para a mais próxima na horizontal
    let order = [...this.canvases.keys()];
    order.sort((a, b) => {
      const ra = this.canvases[a]!.getBoundingClientRect();
      const rb = this.canvases[b]!.getBoundingClientRect();
      const da = Math.max(0, ra.left - e.clientX, e.clientX - ra.right);
      const db = Math.max(0, rb.left - e.clientX, e.clientX - rb.right);
      return da - db;
    });
    for (const pg of order) {
      const canvas = this.canvases[pg]!;
      const rect = canvas.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
      const scale = PX_PER_TWIP * this.zoom;
      const xT = (e.clientX - rect.left) / scale;
      const yT = (e.clientY - rect.top) / scale;
      let best: LaidLine | null = null;
      if (this.eng) {
        // motor: linhas lado a lado (células de tabela, colunas) — a faixa
        // vertical manda, depois a distância horizontal
        let bestD = Infinity;
        for (const line of this.allLines()) {
          if (line.page !== pg) continue;
          const l = line.eng;
          const x0 = l?.x ?? line.xTwips, x1 = x0 + (l?.width ?? 0);
          const dy = yT < line.yTwips ? line.yTwips - yT : yT > line.yTwips + line.heightTwips ? yT - line.yTwips - line.heightTwips : 0;
          const dx = xT < x0 ? x0 - xT : xT > x1 ? xT - x1 : 0;
          const d = dy * 4 + dx;
          if (d < bestD) { bestD = d; best = line; }
        }
      } else {
        for (const line of this.allLines()) {
          if (line.page !== pg) continue;
          if (yT >= line.yTwips && yT <= line.yTwips + line.heightTwips) { best = line; break; }
          if (!best || Math.abs(line.yTwips + line.heightTwips / 2 - yT) <
              Math.abs(best.yTwips + best.heightTwips / 2 - yT)) best = line;
        }
      }
      if (!best) return { para: 0, offset: 0 };
      return { para: best.para, offset: this.hitLineX(best, xT) };
    }
    return null;
  }

  /** Rola até o caret APENAS se ele estiver fora da tela ou cortado.
   *  Animação suave, exceto se o SO pedir movimento reduzido. */
  private scrollCaretIntoView(): void {
    const line = this.lineOf(this.selection.focus);
    if (!line) return;
    const canvas = this.canvases[line.page];
    if (!canvas) return;
    const scale = PX_PER_TWIP * this.zoom;
    const caretTop = canvas.offsetTop + line.yTwips * scale;
    const caretBottom = caretTop + line.heightTwips * scale;
    const viewH = this.clientHeight || 900;
    const viewTop = this.scrollTop;
    const viewBottom = viewTop + viewH;
    const MARGIN = 8;

    // totalmente visível (sem corte)? não rola.
    if (caretTop >= viewTop + MARGIN && caretBottom <= viewBottom - MARGIN) return;

    const target = caretTop < viewTop + MARGIN
      ? caretTop - MARGIN - 32
      : caretBottom - viewH + MARGIN + 32;
    this.animateScrollTo(Math.max(0, target));
  }

  /** Scroll animado próprio (rAF + easeOutCubic) — 'smooth' nativo é no-op em
   *  alguns Chromium; instantâneo quando o SO pede movimento reduzido. */
  private scrollAnim = 0;
  private animateScrollTo(target: number): void {
    cancelAnimationFrame(this.scrollAnim);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.scrollTop = target;
      return;
    }
    const start = this.scrollTop;
    const dist = target - start;
    if (Math.abs(dist) < 2) { this.scrollTop = target; return; }
    const DURATION = 220;
    const t0 = performance.now();
    let started = false;
    const step = (now: number) => {
      started = true;
      const t = Math.min(1, (now - t0) / DURATION);
      const ease = 1 - Math.pow(1 - t, 3);
      this.scrollTop = start + dist * ease;
      if (t < 1) this.scrollAnim = requestAnimationFrame(step);
    };
    this.scrollAnim = requestAnimationFrame(step);
    // aba oculta/throttled: rAF não roda — completa instantâneo
    window.setTimeout(() => {
      if (!started) {
        cancelAnimationFrame(this.scrollAnim);
        this.scrollTop = target;
      }
    }, 80);
  }

  // ───────────────── motor de layout no canvas (visão de impressão) ─────────────────
  // O canvas pinta a MESMA árvore de layout do PDF (@universal-office/docx-layout,
  // validada contra os PDFs do Word). O motor recebe o estado VIVO (parágrafos
  // do modelo + tabelas ancoradas + seções), sem serializar; o cursor, a
  // seleção e o clique saem dos caracteres de cada linha (LaidOutLine.chars).
  // Visões web/rascunho/estrutura, a edição de cabeçalho/rodapé e de caixa de
  // texto continuam no layout legado (compõem sobre o instantâneo do corpo
  // pintado pelo motor). layout="legacy" desliga o motor; se ele lançar
  // exceção, o editor volta ao legado sozinho (console.warn).

  /** layout="legacy": o layout antigo do canvas (o motor é o padrão). */
  private legacyRequested(): boolean {
    return (this.getAttribute('layout') ?? '').toLowerCase() === 'legacy';
  }

  /** O motor diagrama e pinta o canvas agora? */
  private engineActive(): boolean {
    return !this.legacyRequested() && !this.engineFailed && this.forceLegacy === 0 && !!this.model && !!this.fonts
      && (this.view === 'print' || this.view === 'read') && !this.tbEdit;
  }

  /** Exportações que leem o layout legado (XPS, PDF de reserva) o refazem
   *  durante a chamada e devolvem o motor depois. */
  private forceLegacy = 0;
  private withLegacyLayout<T>(fn: () => T): T {
    if (!this.eng) return fn();
    if (this.cellEdit) this.exitCell();
    this.forceLegacy++;
    try {
      this.layout();
      return fn();
    } finally {
      this.forceLegacy--;
      this.refresh();
    }
  }

  private resetEngineState(): void {
    this.eng = null;
    this.engineFailed = false;
    this.engPageCache.clear();
    this.bookmarkParas = new Map();
    this.cellEdit = null;
    this.tableSel = null;
    this.pendingTableStyles = new Map();
    this.newFormatting = null;
    this.engMissing.clear();
    this.engFontsAttempted.clear();
  }

  /** Estado do CORPO — na edição de célula o modelo é o da célula. */
  private bodyModel(): DocumentModel {
    return this.bodyState().model;
  }

  /** Corpo do documento em qualquer modo de edição (célula, cabeçalho/rodapé,
   *  caixa de texto guardam o corpo enquanto o modelo é o deles). */
  private bodyState(): {
    model: DocumentModel;
    tableAnchors: { beforePara: number; table: TableBlock }[];
    sectionStarts: { startPara: number; section: Section }[];
  } {
    if (this.savedBody) return this.savedBody;                  // HF (e caixa dentro do HF)
    if (this.savedForTb) return this.savedForTb;                // caixa de texto do corpo
    if (this.cellEdit) return { model: this.cellEdit.saved.model, tableAnchors: this.tableAnchors, sectionStarts: this.sectionStarts };
    return { model: this.model!, tableAnchors: this.tableAnchors, sectionStarts: this.sectionStarts };
  }

  /** Documento do motor a partir do estado VIVO (sem serializar). */
  private liveEngineDoc(): EngineDoc {
    const b = this.bodyState();
    if (this.cellEdit?.cell.blocks) this.cellEdit.cell.blocks = reconcileBlocks(this.cellEdit.cell.blocks, this.cellEdit.cell.paragraphs, false);
    const tb = this.tbEdit?.hostRun.textbox;
    if (tb?.blocks) tb.blocks = reconcileBlocks(tb.blocks, tb.paras, true);
    const doc = buildEngineDoc({
      fullDoc: this.fullDoc, paragraphs: b.model.paragraphs, tableAnchors: b.tableAnchors,
      sectionStarts: b.sectionStarts, sectPr: b.model.sectPr, bookmarkParas: this.bookmarkParas,
    });
    // documento novo: os estilos de tabela usados (o motor lê da formatação)
    if (!doc.full.formatting && this.newFormatting) doc.full.formatting = this.newFormatting;
    return doc;
  }

  /** Guarda nas props de cada run uma referência ao w:rPr ORIGINAL e, nos runs
   *  que a edição recriou sem ele (docx-core divide/refaz runs sem o rPr), o
   *  devolve — o motor lê a formatação do rPr (estilo de caractere, fontes de
   *  tema…) com as props como edições por cima (directRPr). Texto digitado
   *  herda as props do vizinho e, com elas, o rPr dele. */
  private syncRunRPr(paras: readonly Paragraph[]): void {
    for (const p of paras) {
      for (const r of p.runs) {
        const props = r.props as RunProps & { [RPR_REF]?: Run['rpr']; [RPR_EDITED]?: boolean };
        if (r.rpr) {
          if (props[RPR_REF] !== r.rpr) props[RPR_REF] = r.rpr;
          if (r.rprEdited) props[RPR_EDITED] = true; else if (props[RPR_EDITED]) r.rprEdited = true;
        } else if (props[RPR_REF]) { r.rpr = props[RPR_REF]; if (props[RPR_EDITED]) r.rprEdited = true; }
        if (r.textbox) this.syncRunRPr(r.textbox.paras);
      }
    }
  }
  private syncTableRPr(t: TableBlock): void {
    for (const row of t.rows) for (const c of row.cells) { this.syncRunRPr(c.paragraphs); c.tables.forEach((n) => this.syncTableRPr(n)); }
  }

  /** Provedor do motor para o canvas: as MESMAS faces do PDF (arquivo da fonte;
   *  sem licença de incorporação, a substituta métrico-compatível), com cache
   *  enquanto o Registry não muda. */
  private liveFontProvider(): EngineFontProvider {
    const v = this.fonts!.version;
    if (v !== this.engFaceCacheVersion) {
      this.engFaceCache = new Map();
      this.engFaceCacheVersion = v;
    }
    return this.engineFontProvider(this.engMissing, this.engFaceCache);
  }

  /** Carrega em 2º plano os padrões de hifenização dos idiomas do documento (o
   *  layout é síncrono e sem eles não hifeniza); chegando, refaz o layout. */
  private scheduleHyphenation(full: FullDocument): void {
    const want = hyphenationLangs(full).filter((l) => {
      const id = hyphenationPatternId(l);
      return !!id && !hyphenatorFor(l) && !this.hyphAttempted.has(id);
    });
    if (!want.length) return;
    for (const l of want) this.hyphAttempted.add(hyphenationPatternId(l)!);
    void loadHyphenation(want).then(
      () => { if (this.model) this.queueRefresh(); },
      () => { /* sem padrões: o texto fica sem hifenização */ },
    );
  }

  /** Resolve em 2º plano as famílias/variantes que o motor pediu e não tinha;
   *  chegando algo, refaz o layout. Cada família|variante é tentada uma vez
   *  (o onChange do resolvedor cobre as que mudarem depois). */
  private scheduleEngineFonts(): void {
    if (this.engFontLoad || !this.engMissing.size) return;
    const want = new Map<string, Set<FontVariant>>();
    for (const [f, vs] of this.engMissing) {
      for (const v of vs) {
        const k = `${f.toLowerCase()}|${v}`;
        if (this.engFontsAttempted.has(k)) continue;
        this.engFontsAttempted.add(k);
        let s = want.get(f);
        if (!s) want.set(f, (s = new Set()));
        s.add(v);
      }
    }
    this.engMissing.clear();
    if (!want.size) return;
    this.engFontLoad = (async () => {
      let changed = false;
      try {
        changed = await this.loadEngineFonts(want);
        // famílias sem arquivo embutível: a substituta métrica (como no PDF)
        const before = this.fonts?.version;
        await this.preparePdfFonts();
        if (this.fonts?.version !== before) changed = true;
      } catch { /* resolvedor indisponível: fica a substituição do motor */ }
      this.engFontLoad = null;
      if (changed && this.model) this.queueRefresh();
    })();
  }

  /** Faz o layout pelo motor; false se ele falhar (o chamador cai no legado). */
  private layoutEngine(): boolean {
    try {
      const t0 = performance.now();
      this.syncRunRPr(this.model!.paragraphs);
      // a célula/HF editada pode ter ganho ou perdido parágrafos: os blocos
      // (que o motor lê) acompanham a lista de parágrafos da edição
      const doc = this.liveEngineDoc();
      const t1 = performance.now();
      const result = layoutDocument(doc.full, this.liveFontProvider(), ENGINE_LAYOUT_OPTS);
      const t2 = performance.now();
      this.installEngineResult(doc, result);
      this.engineStats = { ...this.engineStats, buildMs: t1 - t0, layoutMs: t2 - t1, pages: result.pages.length, mode: 'full' };
      this.scheduleEngineFonts();
      this.scheduleHyphenation(doc.full);
      return true;
    } catch (e) {
      console.warn('[universal-write] motor de layout falhou no canvas; usando o layout legado', e);
      this.engineFailed = true;
      this.eng = null;
      if (this.cellEdit) this.exitCell();
      return false;
    }
  }

  // ── layout incremental: edição confinada a UM parágrafo do corpo ──
  // O parágrafo é diagramado sozinho (documento sintético com a mesma
  // formatação/geometria). Antes da edição confere-se que esse layout isolado
  // reproduz EXATAMENTE as linhas e os itens do parágrafo na página (senão o
  // contexto importa: numeração, flutuantes, borda agrupada, campos…). Depois
  // da edição, se o nº de linhas e as alturas não mudaram, o resto do
  // documento não muda: só os itens do parágrafo são trocados na página.
  // Senão (ou na dúvida) o layout completo.

  /** dica da edição em curso (definida ANTES de mexer no modelo) */
  private fastHint: { para: number; before: FastBefore | null } | null = null;
  /** relayout completo adiado depois de edições incrementais */
  private idleRelayout = 0;

  /** Marca que a próxima mudança do modelo fica no parágrafo `pi`. */
  private noteParaEdit(pi: number): void {
    this.fastHint = null;
    this.fastTable = null;
    // cabeçalho/rodapé: repete em várias páginas — layout completo
    if (!this.eng || !this.model || this.forceLegacy || this.hfEdit) return;
    try {
      // na célula a unidade é a tabela inteira (do corpo) que a contém
      if (this.cellEdit) this.fastTable = { anchor: this.cellEdit.anchor, before: this.fastBeforeTable(this.cellEdit.anchor) };
      else this.fastHint = { para: pi, before: this.fastBefore(pi) };
    } catch { this.fastHint = null; this.fastTable = null; }
  }

  /** dica da edição dentro de uma célula (ver fastBeforeTable) */
  private fastTable: { anchor: number; before: FastTableBefore | null } | null = null;

  /** Tabela do corpo conferida (antes da edição na célula): o layout isolado
   *  reproduz as linhas e os itens dela, e ela cabe inteira numa página. */
  private fastBeforeTable(anchor: number): FastTableBefore | null {
    const eng = this.eng!;
    const t = this.tableAnchors[anchor]?.table;
    if (!t) return null;
    const els = eng.lines.filter((el) => el.loc.kind === 'cell' && el.loc.anchor === anchor);
    if (!els.length) return null;
    const pg = els[0]!.page;
    if (els.some((el) => el.page !== pg)) return null;
    const page = eng.result.pages[pg]!;
    const synth = this.synthLayout(t, this.pageSections[pg] ?? 0);
    if (!synth || synth.pages.length !== 1) return null;
    const sp = synth.pages[0]!;
    if (sp.lines.length !== els.length) return null;
    const dx = els[0]!.line.x - sp.lines[0]!.x, dy = els[0]!.line.y - sp.lines[0]!.y;
    const eq = (a: number, b: number) => Math.abs(a - b) < 0.01;
    const tail = (ref: string) => ref.slice(ref.indexOf('/'));
    for (let i = 0; i < els.length; i++) {
      const a = els[i]!.line, b = sp.lines[i]!;
      if (tail(a.ref) !== tail(b.ref) || a.start !== b.start || a.end !== b.end || !eq(a.height, b.height) || !eq(a.x, b.x + dx) || !eq(a.y, b.y + dy)) return null;
      const ca = a.chars ?? [], cb = b.chars ?? [];
      if (ca.length !== cb.length || ca.some((c, k) => c.o !== cb[k]!.o || !eq(c.x, cb[k]!.x + dx) || !eq(c.w, cb[k]!.w))) return null;
    }
    const want = sp.items.map((it) => shiftPageItem(it, dx, dy));
    const start = findItems(page.items, want, eng.hfItems[pg] ?? 0);
    const lineAt = page.lines.indexOf(els[0]!.line);
    if (start < 0 || lineAt < 0 || els.some((el, i) => page.lines[lineAt + i] !== el.line)) return null;
    return { page: pg, dx, dy, start, count: want.length, lineAt, lineCount: els.length, bottom: itemsBottom(sp), root: els[0]!.line.ref.split('/')[0]! };
  }

  /** Edição numa célula: troca só os itens/linhas da tabela se a altura dela
   *  (e portanto o resto do documento) não mudou. */
  private tryFastTable(): boolean {
    const h = this.fastTable;
    this.fastTable = null;
    const eng = this.eng;
    const b = h?.before;
    const ce = this.cellEdit;
    if (!h || !b || !eng || !ce || ce.anchor !== h.anchor || !this.model) return false;
    const t0 = performance.now();
    const t = this.tableAnchors[h.anchor]?.table;
    if (!t) return false;
    this.syncRunRPr(this.model.paragraphs);
    if (ce.cell.blocks) ce.cell.blocks = reconcileBlocks(ce.cell.blocks, ce.cell.paragraphs, false);
    const synth = this.synthLayout(t, this.pageSections[b.page] ?? 0);
    if (!synth || synth.pages.length !== 1) return false;
    const sp = synth.pages[0]!;
    if (Math.abs(itemsBottom(sp) - b.bottom) > 0.01) return false;
    const page = eng.result.pages[b.page]!;
    const items = sp.items.map((it) => shiftPageItem(it, b.dx, b.dy));
    page.items.splice(b.start, b.count, ...items);
    const lines: LaidOutLine[] = sp.lines.map((l) => ({
      ...l, ref: b.root + l.ref.slice(l.ref.indexOf('/')), x: l.x + b.dx, y: l.y + b.dy, baseline: l.baseline + b.dy,
      ...(l.chars ? { chars: l.chars.map((c) => ({ o: c.o, x: c.x + b.dx, w: c.w })) } : {}),
    }));
    page.lines.splice(b.lineAt, b.lineCount, ...lines);
    const k = eng.lines.findIndex((el) => el.page === b.page && el.loc.kind === 'cell' && el.loc.anchor === h.anchor);
    if (k < 0) return false;
    const sec = eng.result.pages[b.page]!.section;
    eng.lines.splice(k, b.lineCount, ...lines.map((line) => {
      const loc = locateRef(line.ref, eng.doc.origins);
      return { line, page: b.page, loc, para: this.lineParagraph(loc, eng.doc, sec) };
    }));
    eng.pageVersion[b.page] = (eng.pageVersion[b.page] ?? 0) + 1;
    this.rebuildEditLines();
    this.engineStats = { ...this.engineStats, buildMs: 0, layoutMs: performance.now() - t0, mode: 'fast' };
    window.clearTimeout(this.idleRelayout);
    this.idleRelayout = window.setTimeout(() => {
      this.idleRelayout = 0;
      if (this.eng && this.model && !this.fastHint && !this.fastTable) this.refresh();
    }, 1500);
    return true;
  }

  /** Parágrafo (ou tabela) sozinho num documento sintético (página alta, sem HF). */
  private synthLayout(block: Paragraph | TableBlock, sectIdx: number): LayoutResult | null {
    const sec = this.sectionStarts[sectIdx]?.section;
    const sp = sec?.sectPr ?? this.bodyModel().sectPr;
    if ((sp.cols?.count ?? 1) > 1 || sec?.sect?.lnNumType) return null;
    const base = this.fullDoc ?? ({ footnotes: new Map(), endnotes: new Map(), comments: [], styles: new Map() } as unknown as FullDocument);
    const full: FullDocument = {
      ...base,
      blocks: ['runs' in block ? { type: 'paragraph', paragraph: block } : block],
      sections: [{
        sectPr: { ...sp, pageHeightTwips: 2_000_000, titlePg: false },
        ...(sec?.sect ? { sect: { ...sec.sect, vAlign: undefined } } : {}),
        blockStart: 0, blockEnd: 0,
        headers: {}, footers: {}, headerRefs: [], footerRefs: [], headerBlocks: {}, footerBlocks: {},
      }],
      bookmarks: new Map(),
    };
    return layoutDocument(full, this.liveFontProvider(), ENGINE_LAYOUT_OPTS);
  }

  /** Confere (antes da edição) que o parágrafo isolado reproduz o layout real. */
  private fastBefore(pi: number): FastBefore | null {
    const eng = this.eng!;
    const ls = this.layoutCache[pi]?.lines ?? [];
    const first = ls[0]?.eng;
    if (!first || ls.some((l) => l.page !== ls[0]!.page || !l.eng)) return null;
    const pg = ls[0]!.page;
    const page = eng.result.pages[pg]!;
    const para = this.model!.paragraphs[pi]!;
    const synth = this.synthLayout(para, this.pageSections[pg] ?? 0);
    if (!synth || synth.pages.length !== 1) return null;
    const sp = synth.pages[0]!;
    if (sp.lines.length !== ls.length) return null;
    const dx = first.x - sp.lines[0]!.x, dy = first.y - sp.lines[0]!.y;
    const eq = (a: number, b: number) => Math.abs(a - b) < 0.01;
    for (let i = 0; i < ls.length; i++) {
      const a = ls[i]!.eng!, b = sp.lines[i]!;
      if (a.start !== b.start || a.end !== b.end || !eq(a.height, b.height) || !eq(a.x, b.x + dx) || !eq(a.y, b.y + dy)) return null;
      const ca = a.chars ?? [], cb = b.chars ?? [];
      if (ca.length !== cb.length || ca.some((c, k) => c.o !== cb[k]!.o || !eq(c.x, cb[k]!.x + dx) || !eq(c.w, cb[k]!.w))) return null;
    }
    const want = sp.items.map((it) => shiftPageItem(it, dx, dy));
    const start = want.length ? findItems(page.items, want, eng.hfItems[pg] ?? 0) : this.emptyParaSlot(pi, pg);
    if (start < 0) return null;
    // linhas do parágrafo em page.lines (contíguas)
    const lineAt = page.lines.indexOf(first);
    if (lineAt < 0) return null;
    return { page: pg, ref: first.ref, dx, dy, start, count: want.length, lineAt, heights: sp.lines.map((l) => l.height) };
  }

  /** Parágrafo sem itens (vazio): os itens novos entram logo depois dos da
   *  última linha do parágrafo anterior na mesma página (glifos + sublinhados);
   *  -1 se não dá para saber (tabela entre eles, outra página, linha vazia). */
  private emptyParaSlot(pi: number, pg: number): number {
    if (pi === 0 || this.tableAnchors.some((a) => a.beforePara === pi)) return -1;
    const prev = this.layoutCache[pi - 1]?.lines;
    const last = prev?.[prev.length - 1]?.eng;
    if (!last || prev![prev!.length - 1]!.page !== pg) return -1;
    const items = this.eng!.result.pages[pg]!.items;
    let k = -1;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]!;
      if (it.t === 'glyphs' && Math.abs(it.y - last.baseline) < 1 && it.glyphs.length && it.glyphs[0]!.x >= last.x - 1 && it.glyphs[0]!.x <= last.x + last.width + 1) { k = i; break; }
    }
    if (k < 0) return -1;
    // decorações da linha (sublinhado/tachado) vêm depois dos glifos
    while (k + 1 < items.length) {
      const n = items[k + 1]!;
      if (n.t === 'line' && Math.abs(n.y1 - n.y2) < 0.01 && Math.abs(n.y1 - last.baseline) < 400 && n.x1 >= last.x - 1 && n.x2 <= last.x + last.width + 1) k++;
      else break;
    }
    return k + 1;
  }

  /** Aplica a edição incremental; false = precisa do layout completo. */
  private tryFastLayout(): boolean {
    const h = this.fastHint;
    this.fastHint = null;
    const eng = this.eng;
    const b = h?.before;
    if (!h || !b || !eng || this.cellEdit || !this.model) return false;
    const t0 = performance.now();
    const para = this.model.paragraphs[h.para];
    if (!para) return false;
    this.syncRunRPr([para]);
    const synth = this.synthLayout(para, this.pageSections[b.page] ?? 0);
    if (!synth || synth.pages.length !== 1) return false;
    const sp = synth.pages[0]!;
    // mesmas linhas com as mesmas alturas: o resto do documento não muda
    if (sp.lines.length !== b.heights.length || sp.lines.some((l, i) => Math.abs(l.height - b.heights[i]!) > 0.01)) return false;
    const page = eng.result.pages[b.page]!;
    const items = sp.items.map((it) => shiftPageItem(it, b.dx, b.dy));
    page.items.splice(b.start, b.count, ...items);
    const lines: LaidOutLine[] = sp.lines.map((l) => ({
      ...l, ref: b.ref, x: l.x + b.dx, y: l.y + b.dy, baseline: l.baseline + b.dy,
      ...(l.chars ? { chars: l.chars.map((c) => ({ o: c.o, x: c.x + b.dx, w: c.w })) } : {}),
    }));
    if (para.runs.some((r) => r.custom)) for (const l of lines) collapseCustomChars(l, para);
    page.lines.splice(b.lineAt, lines.length, ...lines);
    // índices de linhas do editor
    const loc: LineLoc = { kind: 'body', para: h.para };
    let k = eng.lines.findIndex((el) => el.page === b.page && el.line.ref === b.ref);
    if (k >= 0) eng.lines.splice(k, lines.length, ...lines.map((line) => ({ line, page: b.page, loc, para })));
    const len = paraLength(para);
    this.layoutCache[h.para] = {
      spans: [], charAdvances: [], spanCharStart: [],
      lines: lines.map((l, i) => ({
        para: h.para,
        rich: { start: i === 0 ? 0 : Math.min(len, l.start), end: i === lines.length - 1 ? len : Math.min(len, l.end), widthTwips: l.width, segments: [], maxSizePt: 0, maxAscTwips: 0 },
        page: b.page, xTwips: l.x, yTwips: l.y, heightTwips: l.height, baselineTwips: l.baseline, justifyExtraPerSpace: 0, eng: l,
      })),
    };
    eng.pageVersion[b.page] = (eng.pageVersion[b.page] ?? 0) + 1;
    this.engineStats = { ...this.engineStats, buildMs: 0, layoutMs: performance.now() - t0, mode: 'fast' };
    // por garantia (REF a indicadores do parágrafo etc.), um layout completo ocioso
    window.clearTimeout(this.idleRelayout);
    this.idleRelayout = window.setTimeout(() => {
      this.idleRelayout = 0;
      if (this.eng && this.model && !this.fastHint) this.refresh();
    }, 1500);
    return true;
  }


  /** Linhas dos parágrafos do modelo em EDIÇÃO (corpo, ou a célula ativa) a
   *  partir das linhas do motor — layoutCache (cursor, seleção, setas). */
  private rebuildEditLines(): void {
    if (!this.eng || !this.model) return;
    const paras = this.model!.paragraphs;
    this.layoutCache = paras.map(() => ({ spans: [], charAdvances: [], lines: [], spanCharStart: [] }));
    const ce = this.cellEdit;
    const blocksOfCell = ce ? cellBlocks(ce.cell) : [];
    // cabeçalho/rodapé em edição: as linhas dele na página ativa (a parte se
    // repete nas outras); sem nenhuma lá, a 1ª página que mostra a parte
    const hfWhich = this.hfEdit ? (this.hfEdit.kind === 'header' ? 'hdr' : 'ftr') : null;
    let hfPage = this.hfActivePage;
    if (hfWhich) {
      const shows = (pg: number) => this.eng!.lines.some((el) => el.page === pg && el.loc.kind === 'hf' && el.loc.which === hfWhich && !!el.para && paras.includes(el.para));
      if (!shows(hfPage)) {
        const other = this.eng.lines.find((el) => el.loc.kind === 'hf' && el.loc.which === hfWhich && !!el.para && paras.includes(el.para));
        if (other) this.hfActivePage = hfPage = other.page;
      }
    }
    for (const el of this.eng!.lines) {
      let pi = -1;
      if (hfWhich) {
        if (el.page === hfPage && el.loc.kind === 'hf' && el.loc.which === hfWhich && el.para) pi = paras.indexOf(el.para);
      } else if (!ce) { if (el.loc.kind === 'body') pi = el.loc.para; }
      else if (el.loc.kind === 'cell' && el.loc.anchor === ce.anchor && sameHops(el.loc.hops, ce.hops)) {
        const blk = blocksOfCell[el.loc.block];
        if (blk?.type === 'paragraph') pi = paras.indexOf(blk.paragraph);
      }
      const pl = pi >= 0 ? this.layoutCache[pi] : undefined;
      if (!pl) continue;
      const l = el.line;
      // linha repetida (cabeçalho de tabela em cada página): fica a 1ª
      if (pl.lines.some((x) => x.rich.start === l.start && x.rich.end === l.end)) continue;
      const len = paraLength(paras[pi]!);
      const clamp = (o: number) => Math.max(0, Math.min(len, o));
      pl.lines.push({
        para: pi,
        rich: { start: clamp(l.start), end: clamp(l.end), widthTwips: l.width, segments: [], maxSizePt: 0, maxAscTwips: 0 },
        page: el.page, xTwips: l.x, yTwips: l.y, heightTwips: l.height, baselineTwips: l.baseline,
        justifyExtraPerSpace: 0, eng: l,
      });
    }
    // o parágrafo inteiro é coberto pelas suas linhas (texto oculto no começo/fim)
    paras.forEach((p, pi) => {
      const ls = this.layoutCache[pi]!.lines;
      if (!ls.length) return;
      ls[0]!.rich.start = 0;
      ls[ls.length - 1]!.rich.end = paraLength(p);
    });
  }

  /** Instala o resultado: páginas, linhas do modelo em edição, camadas de HF. */
  private installEngineResult(doc: EngineDoc, result: LayoutResult): void {
    const pages = result.pages;
    this.pageCount = Math.max(1, pages.length);
    this.pageSections = pages.map((p) => doc.sectionMap[p.section] ?? 0);
    this.tableLayouts = [];
    this.dropCapFloats = [];
    this.footnoteHits = [];
    this.tileHeights = [];
    const lines: EngLine[] = [];
    pages.forEach((p, pg) => {
      for (const l of p.lines) {
        const loc = locateRef(l.ref, doc.origins);
        const para = this.lineParagraph(loc, doc, p.section);
        if (para?.runs.some((r) => r.custom)) collapseCustomChars(l, para);
        lines.push({ line: l, page: pg, loc, para });
      }
    });
    // camadas de cabeçalho/rodapé (esmaecidas) e objetos flutuantes: do motor
    const hfItems = pages.map((p) => Math.min(p.hfItems ?? 0, p.items.length));
    this.eng = { result, doc, lines, hfItems, version: ++this.engVersion, pageVersion: pages.map(() => 0) };
    this.rebuildEditLines();
  }

  /** Parágrafo do editor de uma linha do motor (corpo, célula ou cabeçalho/rodapé). */
  private lineParagraph(loc: LineLoc, doc: EngineDoc, section: number): Paragraph | null {
    if (loc.kind === 'body') return this.bodyState().model.paragraphs[loc.para] ?? null;
    if (loc.kind === 'cell') {
      const t = this.bodyState().tableAnchors[loc.anchor]?.table;
      const cell = t ? resolveCell(t, loc.hops) : null;
      const blk = cell ? cellBlocks(cell)[loc.block] : undefined;
      return blk?.type === 'paragraph' ? blk.paragraph : null;
    }
    if (loc.kind === 'hf') {
      const src = hfBlocksFor(doc.full, section, loc.which, loc.part);
      return src ? paragraphAtPath(src.blocks, loc.path) : null;
    }
    return null;
  }

  /** Objeto flutuante como o motor o posicionou (na página dada, ou o 1º). */
  private engObjectOf(run: Run, page?: number): { page: number; x: number; y: number; w: number; h: number } | null {
    const pages = this.eng?.result.pages ?? [];
    const scan = (pg: number) => pages[pg]?.objects?.find((o) => o.run === run);
    if (page !== undefined) {
      const o = scan(page);
      return o ? { page, x: o.x, y: o.y, w: o.w, h: o.h } : null;
    }
    for (let pg = 0; pg < pages.length; pg++) {
      const o = scan(pg);
      if (o) return { page: pg, x: o.x, y: o.y, w: o.w, h: o.h };
    }
    return null;
  }

  /** Família/variante CSS de cada face (fonte carregada na página). */
  private enginePaintEnv(): EnginePaintEnv {
    return {
      fontOf: (face) => this.engFaceCss.get(face) ?? {
        family: `${cssFamily(face.family)}, ${DEFAULT_FONT_CSS}`,
        weight: face.bold && !face.synthBold ? 700 : 400,
        italic: face.italic && !face.synthItalic,
      },
      image: (img) => this.bitmapFor(img),
      color: (hex) => this.inkColor(hex),
    };
  }

  /** Página do motor (fundo + itens) num canvas em cache: o caret pisca e a
   *  seleção muda sem repintar os glifos. */
  private engineBase(pg: number, page: LayoutPage, w: number, h: number, scale: number): HTMLCanvasElement {
    const sup = this.tbSnapshotSuppress;
    const hfMode = !!this.hfEdit;
    const key = `${this.eng!.version}.${this.eng!.pageVersion[pg] ?? 0}|${w}x${h}|${scale.toFixed(6)}|${this.printRender ? 1 : 0}|${this.pageDark ? 1 : 0}|`
      + `${this.hfCapturing ? 1 : 0}|${sup ? 1 : 0}|${hfMode ? 1 : 0}|${this.imagesVersion}`;
    const hit = this.engPageCache.get(pg);
    if (hit && hit.key === key) return hit.canvas;
    const off = hit?.canvas ?? document.createElement('canvas');
    off.width = w; off.height = h;
    const ctx = off.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // instantâneo do corpo (edição legada de HF): fundo transparente e sem o HF
    if (!this.hfCapturing) {
      // fundo da página do documento (w:background) — vale também no modo escuro
      ctx.fillStyle = page.background ? `#${page.background}` : this.pageDark ? '#1e1e1e' : '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const env = this.enginePaintEnv();
    const n = page.items.length;
    const hf = Math.min(this.eng!.hfItems[pg] ?? 0, n);
    // o Word esmaece o que não está em foco: o cabeçalho/rodapé ao editar o
    // corpo; o corpo ao editar o cabeçalho/rodapé (nada esmaece na impressão)
    const dim = this.printRender ? 1 : HF_DIM_ALPHA;
    const layers: [number, number, number][] = [
      ...(this.hfCapturing ? [] : [[0, hf, hfMode ? 1 : dim] as [number, number, number]]),
      [hf, n, hfMode ? dim : 1],
    ];
    // caixa de texto entrando em edição: o texto dela sai do instantâneo
    const skip = sup ? this.textboxItemRange(pg, page, sup) : null;
    for (const [from, to, alpha] of layers) {
      if (from >= to) continue;
      if (skip && skip[0] < to && skip[1] > from) {
        paintItems(ctx, page.items, env, { from, to: Math.max(from, skip[0]), alpha });
        paintItems(ctx, page.items, env, { from: Math.min(to, skip[1]), to, alpha });
      } else paintItems(ctx, page.items, env, { from, to, alpha });
    }
    this.engPageCache.set(pg, { key, canvas: off });
    return off;
  }

  /** Itens do CONTEÚDO de uma caixa de texto: o recorte (push…pop) no
   *  retângulo em que o motor a posicionou — [início, fim) ou null. */
  private textboxItemRange(pg: number, page: LayoutPage, run: Run): [number, number] | null {
    const o = page.objects?.find((x) => x.run === run);
    if (!o) return null;
    const items = page.items;
    const near = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) < 0.5;
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      if (it.t !== 'clip' || it.op !== 'push' || !near(it.x, o.x) || !near(it.y, o.y) || !near(it.w, o.w) || !near(it.h, o.h)) continue;
      let depth = 0;
      for (let j = i; j < items.length; j++) {
        const x = items[j]!;
        if (x.t === 'clip' || (x as { t: string }).t === 'xform') {
          depth += (x as { op: string }).op === 'push' ? 1 : -1;
          if (depth === 0) return [i, j + 1];
        }
      }
      return null;
    }
    void pg;
    return null;
  }

  /** Pinta as páginas do motor + adornos de tela (seleção, campos, comentários,
   *  alças de objeto, caret). */
  private paintEngine(active: Set<number>): void {
    const eng = this.eng!;
    const t0 = performance.now();
    const dpr = window.devicePixelRatio || 1;
    const sel = normalizeRange(this.range());
    const hasSel = this.hasSelection();
    const scales: number[] = [];
    const ctxs: (CanvasRenderingContext2D | null)[] = this.canvases.map((c, i) => {
      const page = eng.result.pages[i];
      if (!active.has(i) || c.width <= 1 || !page) { scales.push(0); return null; }
      const bs = c.width / (parseFloat(c.style.width) || c.width);
      const scale = PX_PER_TWIP * this.zoom * bs;
      scales.push(scale);
      const ctx = c.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(this.engineBase(i, page, c.width, c.height, scale), 0, 0);
      if (this.inlineRenderers.size && !this.hfCapturing) this.paintEngineInlines(ctx, i, scale);
      if (!this.printRender && !this.hfCapturing) {
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        this.paintEngineMarks(ctx, i);
        this.paintEngineSpelling(ctx, i);
        if (this.tableSel) this.paintTableSel(ctx, i);
        else if (hasSel) this.paintEngineSelection(ctx, i, sel);
        ctx.restore();
      }
      return ctx;
    });
    // cache só das páginas com buffer
    for (const k of [...this.engPageCache.keys()]) if (!this.allocatedPages.has(k) && !active.has(k)) this.engPageCache.delete(k);
    // edição de cabeçalho/rodapé: faixas e separadores na página ativa (Word)
    const hp = this.hfActivePage;
    if (this.hfEdit && !this.printRender && ctxs[hp]) {
      const sp = this.sectionOfPage(hp)?.sectPr ?? this.bodyState().model.sectPr;
      this.paintHfBands(ctxs[hp]!, scales[hp]!, sp, dpr, hp);
    }
    this.paintFloatAndCaret(ctxs, scales, dpr, hasSel || !!this.tableSel);
    this.engineStats.paintMs = performance.now() - t0;
  }



  /** Sombreamento de campo e realce de comentário (adornos de tela do Word);
   *  com "mostrar marcas", · nos espaços, → nos tabs e ¶ no fim do parágrafo. */
  private paintEngineMarks(ctx: CanvasRenderingContext2D, pg: number): void {
    const eng = this.eng!;
    if (this.showMarks && this.model) {
      ctx.fillStyle = this.pageDark ? '#9aa0a6' : '#888';
      ctx.textAlign = 'center';
      const body = !this.cellEdit && !this.hfEdit && !this.tbEdit;
      const secOf = (k: number): number => (body ? this.sectionIndexForPara(k) : this.pageSections[pg] ?? 0);
      this.layoutCache.forEach((pl, pi) => {
        const para = this.model!.paragraphs[pi]!;
        const text = paraText(para);
        pl.lines.forEach((line, li) => {
          if (line.page !== pg || !line.eng) return;
          const fs = Math.max(160, line.heightTwips * 0.6);
          ctx.font = `400 ${fs}px ${DEFAULT_FONT_CSS}`;
          for (const c of line.eng.chars ?? []) {
            const ch = text[c.o];
            if (ch === ' ' || ch === '\u00A0') ctx.fillText(ch === ' ' ? '·' : '°', c.x + c.w / 2, line.baselineTwips);
            else if (ch === '\t') ctx.fillText('→', c.x + c.w / 2, line.baselineTwips);
          }
          // quebra de página/coluna no meio do parágrafo: do fim do texto até a
          // margem (no início do parágrafo ela sai depois do ¶ do anterior)
          for (let o = Math.max(1, line.rich.start); o < Math.min(line.rich.end, text.length); o++) {
            const ch = text[o];
            if (ch !== '\f' && ch !== '\u000B') continue;
            const bx = this.caretX({ para: pi, offset: o }, line);
            this.paintBreakMark(ctx, bx, this.columnRightAt(secOf(pi), bx), line.baselineTwips, fs, ch === '\f' ? 'page' : 'column', false);
          }
          if (li === pl.lines.length - 1) {
            ctx.textAlign = 'left';
            const x = this.caretX({ para: pi, offset: paraLength(para) }, line);
            // marca do parágrafo que encerra a seção: a quebra, com o tipo da seção seguinte
            const nextType = (k: number): SectionType => this.sectionStarts[this.sectionIndexForPara(k) + 1]?.section.sectPr.type ?? 'nextPage';
            if (body && para.props.sectionBreak) {
              this.paintBreakMark(ctx, x + 20, this.columnRightAt(secOf(pi), x), line.baselineTwips, fs, nextType(pi), true);
            } else {
              ctx.fillText('¶', x + 20, line.baselineTwips);
              // o parágrafo VAZIO seguinte só carrega a quebra (seção contínua: não
              // ocupa linha no layout) — a marca dele vem depois deste ¶
              const nx = this.model!.paragraphs[pi + 1];
              const x0 = x + 20 + ctx.measureText('¶').width + 60;
              if (body && nx?.props.sectionBreak && !this.layoutCache[pi + 1]?.lines.length) {
                this.paintBreakMark(ctx, x0, this.columnRightAt(secOf(pi), x), line.baselineTwips, fs, nextType(pi + 1), true);
              } else {
                // o seguinte abre com quebra de página/coluna (como o Word a insere):
                // a quebra fica no fim desta coluna/página, onde o texto terminou
                const c0 = nx ? paraText(nx)[0] : undefined;
                if (c0 === '\f' || c0 === '\u000B') this.paintBreakMark(ctx, x0, this.columnRightAt(secOf(pi), x), line.baselineTwips, fs, c0 === '\f' ? 'page' : 'column', false);
              }
            }
            ctx.textAlign = 'center';
          }
        });
      });
      ctx.textAlign = 'left';
    }
    for (const el of eng.lines) {
      if (el.page !== pg || el.loc.kind === 'other') continue;
      const para = el.para;
      if (!para) continue;
      let acc = 0;
      for (const run of para.runs) {
        const a = acc;
        acc += run.text.length;
        const field = !!run.field || !!run.fieldResult;
        const comment = !!run.props.commentIds?.length;
        if (!field && !comment) continue;
        // extensão dos caracteres do run na linha (no resultado de um campo os
        // offsets dos glifos recomeçam no início do campo — não são monótonos)
        let x1 = Infinity, x2 = -Infinity;
        for (const c of el.line.chars ?? []) {
          if (c.o < a || c.o >= acc) continue;
          x1 = Math.min(x1, c.x);
          x2 = Math.max(x2, c.x + c.w);
        }
        if (!(x2 > x1)) continue;
        ctx.fillStyle = comment ? 'rgba(255, 187, 0, 0.28)' : this.pageDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
        ctx.fillRect(x1, el.line.y, x2 - x1, el.line.height);
      }
    }
  }

  /** Marca de quebra com "mostrar marcas": linha pontilhada (dupla na de seção)
   *  até o fim da coluna com o nome no meio — adorno de tela (não vai ao PDF). */
  private paintBreakMark(ctx: CanvasRenderingContext2D, x0: number, x1: number, baseline: number, fs: number, kind: SectionType | 'page' | 'column', double: boolean): void {
    const L = pickLabels(this, BREAK_MARK_LABELS);
    const label = kind === 'page' ? L.page : kind === 'column' ? L.column : `${L.section} (${L[kind]})`;
    const right = Math.max(x1, x0 + 600);
    ctx.save();
    ctx.font = `400 ${fs * 0.8}px ${DEFAULT_FONT_CSS}`;
    ctx.textAlign = 'center';
    const tw = ctx.measureText(label).width + 120;
    const mid = (x0 + right) / 2;
    const y = baseline - fs * 0.3;
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.lineWidth = 8;
    ctx.setLineDash([16, 24]);
    for (const dy of double ? [-14, 14] : [0]) {
      ctx.beginPath();
      if (tw < right - x0) {
        ctx.moveTo(x0, y + dy); ctx.lineTo(mid - tw / 2, y + dy);
        ctx.moveTo(mid + tw / 2, y + dy); ctx.lineTo(right, y + dy);
      } else { ctx.moveTo(x0, y + dy); ctx.lineTo(right, y + dy); }
      ctx.stroke();
    }
    if (tw < right - x0) ctx.fillText(label, mid, baseline);
    ctx.restore();
  }

  /** Borda direita da coluna (da seção) em que está x. */
  private columnRightAt(sectionIdx: number, x: number): number {
    const sp = this.sectPrAt(sectionIdx);
    const left = sp.marginLeftTwips;
    const frames = columnWidths(sp).map((c, i, all) => {
      const x0 = left + all.slice(0, i).reduce((a, w) => a + w.widthTwips + w.spaceTwips, 0);
      return { x0, x1: x0 + c.widthTwips };
    });
    const f = frames.find((r) => x <= r.x1 + 30) ?? frames[frames.length - 1]!;
    return f.x1;
  }

  // ───────────────────────── revisão ortográfica ─────────────────────────

  /** A revisão vale agora? (atributo nospellcheck, menu, Modo Protegido, leitura) */
  private spellActive(): boolean {
    return !this.spellOff && !this.hasAttribute('nospellcheck') && !this.protectedMode && this.view !== 'read';
  }

  /** Idioma/noProof efetivos: os estilos do documento aberto (refeito a cada documento). */
  private spellLangResolver(): LangResolver {
    const sheet = this.fullDoc?.formatting?.styles;
    if (!this.spellLangs || (this.spellLangs as unknown as { sheet?: unknown }).sheet !== sheet) this.spellLangs = new LangResolver(sheet);
    return this.spellLangs;
  }

  /** O motor sob demanda: o import (chunk) só acontece na 1ª pintura com texto. */
  private ensureSpell(): ParagraphSpell | null {
    if (this.spell || this.spellLoading) return this.spell;
    this.spellLoading = true;
    void import('@universal-office/spell').then(({ SpellChecker }) => {
      if (!this.isConnected) return;
      const engine = SpellChecker.shared() as unknown as SpellEngine;
      this.spellEngine = engine;
      this.spell = new ParagraphSpell(engine, () => this.spellLangResolver(), () => this.queueSpellRepaint());
      this.queueSpellRepaint();
    }).catch(() => { /* sem o motor (bundle sem o chunk): sem revisão */ }).finally(() => { this.spellLoading = false; });
    return null;
  }

  private queueSpellRepaint(): void {
    if (this.spellRepaint) return;
    this.spellRepaint = requestAnimationFrame(() => { this.spellRepaint = 0; if (this.eng && this.isConnected) this.paint(); });
  }

  /** Sublinhado ondulado vermelho nas palavras erradas (adorno de tela: não vai
   *  para o PDF, a impressão nem o viewer). */
  private paintEngineSpelling(ctx: CanvasRenderingContext2D, pg: number): void {
    if (!this.spellActive()) return;
    const spell = this.ensureSpell();
    if (!spell) return;
    ctx.save();
    ctx.strokeStyle = this.pageDark ? '#ff6b6b' : '#e81123';
    ctx.lineWidth = 11;
    for (const el of this.eng!.lines) {
      if (el.page !== pg || el.loc.kind === 'other' || !el.para) continue;
      const list = spell.get(el.para);
      if (!list?.length) continue;
      const chars = el.line.chars ?? [];
      for (const m of list) {
        let x1 = Infinity, x2 = -Infinity;
        for (const c of chars) {
          if (c.o < m.start || c.o >= m.end) continue;
          x1 = Math.min(x1, c.x);
          x2 = Math.max(x2, c.x + c.w);
        }
        if (!(x2 > x1)) continue;
        wavePath(ctx, x1, x2, el.line.baseline + 50);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** A revisão ortográfica está ligada (menu "Verificar ortografia ao digitar"). */
  spellCheckEnabled(): boolean { return !this.spellOff && !this.hasAttribute('nospellcheck'); }

  /** Liga/desliga a revisão nesta sessão (o atributo nospellcheck desliga de vez). */
  toggleSpellCheck(on?: boolean): void {
    this.spellOff = on === undefined ? !this.spellOff : !on;
    this.paint();
    this.chromeSync?.();
  }

  /** Palavra errada no cursor (do que já foi revisado; null = nenhuma / ainda não revisado). */
  spellingAtCaret(): (Misspelling & { para: number }) | null {
    if (!this.model || !this.spellActive()) return null;
    const pos = this.selection.focus;
    const para = this.model.paragraphs[pos.para];
    const m = para && misspellingAt(this.ensureSpell()?.get(para), pos.offset);
    return m ? { ...m, para: pos.para } : null;
  }

  /** Sugestões do Hunspell para a palavra (até `limit`, como o menu do Word). */
  async spellingSuggestions(m: Misspelling, limit = 5): Promise<string[]> {
    if (!this.spellEngine) return [];
    return (await this.spellEngine.suggest(m.word, m.lang)).slice(0, limit);
  }

  /** Troca a palavra errada (se ela ainda está lá) — desfazível. */
  replaceSpelling(m: Misspelling & { para: number }, text: string): boolean {
    if (!this.model || this.locked()) return false;
    const para = this.model.paragraphs[m.para];
    if (!para || paraText(para).slice(m.start, m.end) !== m.word) return false;
    this.snapshot();
    const pos = deleteRange(this.model, { start: { para: m.para, offset: m.start }, end: { para: m.para, offset: m.end } });
    const end = insertText(this.model, pos, text);
    this.selection = { anchor: end, focus: end };
    this.refresh();
    return true;
  }

  /** "Ignorar tudo" (nesta sessão, em todos os documentos). */
  ignoreSpelling(word: string): void { this.spellEngine?.ignore(word); }

  /** "Adicionar ao dicionário" do usuário (persistido pelo motor). */
  async addToDictionary(word: string): Promise<void> { await this.spellEngine?.add(word); }

  /**
   * Próxima palavra errada a partir do cursor (diálogo Ortografia): revisa os
   * parágrafos na hora, seleciona a palavra e a traz para a vista. `skip`: as
   * "ignorar uma vez" do diálogo. null = nada mais (dá a volta no documento).
   */
  async nextMisspelling(skip: ReadonlySet<string> = new Set()): Promise<(Misspelling & { para: number }) | null> {
    if (!this.model) return null;
    this.ensureSpell();
    for (let i = 0; i < 100 && !this.spell; i++) await new Promise((r) => setTimeout(r, 30));
    const spell = this.spell;
    if (!spell) return null;
    const paras = this.model.paragraphs;
    const startP = Math.min(this.selection.focus.para, paras.length - 1);
    const startO = normalizeRange(this.range()).end.offset;
    for (let k = 0; k <= paras.length; k++) {
      const pi = (startP + k) % paras.length;
      const list = await spell.check(paras[pi]!);
      if (this.model?.paragraphs !== paras) return null; // documento trocou no meio
      const m = list.find((x) => (k > 0 || pi !== startP || x.start >= startO) && !skip.has(`${pi}:${x.start}:${x.word}`));
      if (m) {
        this.selection = { anchor: { para: pi, offset: m.start }, focus: { para: pi, offset: m.end } };
        this.refreshSelection();
        this.scrollCaretIntoView();
        return { ...m, para: pi };
      }
    }
    return null;
  }

  /** Inlines de plugin com desenho próprio: na caixa do texto de reserva que o
   *  motor diagramou (o motor não conhece a medida do plugin). */
  private paintEngineInlines(ctx: CanvasRenderingContext2D, pg: number, scale: number): void {
    const page = this.eng!.result.pages[pg]!;
    for (const el of this.eng!.lines) {
      if (el.page !== pg || el.loc.kind === 'other') continue;
      const para = el.para;
      if (!para?.runs.some((r) => r.custom)) continue;
      let acc = 0;
      for (const run of para.runs) {
        const a = acc;
        acc += run.text.length;
        if (!run.custom) continue;
        const renderer = this.inlineRenderers.get(run.custom.type)?.renderer;
        const c = el.line.chars?.find((k) => k.o === a);
        if (!renderer?.draw || !c) continue;
        // face/tamanho/cor do texto de reserva desenhado pelo motor
        const gr = page.items.find((it) => it.t === 'glyphs' && Math.abs(it.y - el.line.baseline) < 400 && it.glyphs.some((g) => Math.abs(g.x - c.x) < 0.5));
        const run0 = gr?.t === 'glyphs' ? gr : null;
        const sizePt = run0?.sizePt ?? (run.props.szHalfPt ?? 22) / 2;
        const css = run0 ? this.enginePaintEnv().fontOf(run0.face) : { family: DEFAULT_FONT_CSS, weight: 400 as const, italic: false };
        const font = run0?.face.font ?? this.fonts!.resolve(undefined, 'regular');
        const measureText = (text: string): number => {
          let w = 0;
          for (const ch of text) w += (font.advanceWidth(font.glyphId(ch.codePointAt(0)!)) * sizePt * 20) / (font.metrics.unitsPerEm || 1000);
          return w;
        };
        const fallbackText = renderer.toText?.(run.custom.data) ?? run.custom.fallbackText;
        const ink = this.inkColor(run0?.color ?? run.props.color);
        ctx.save();
        ctx.fillStyle = this.pageDark ? '#1e1e1e' : '#ffffff';
        ctx.fillRect(c.x * scale, el.line.y * scale, c.w * scale, el.line.height * scale);
        ctx.font = `${css.italic ? 'italic ' : ''}${css.weight} ${sizePt * TWIPS_PER_PT * scale}px ${css.family}`;
        ctx.fillStyle = ink;
        renderer.draw({
          data: run.custom.data, fallbackText, props: run.props, sizePt, measureText, ctx,
          xTwips: c.x, yTwips: el.line.y, baselineTwips: el.line.baseline, widthTwips: c.w, heightTwips: el.line.height,
          scale, dark: this.pageDark, color: ink,
        });
        ctx.restore();
      }
    }
  }

  /** Fundo das células selecionadas (caixas do motor dentro do retângulo). */
  private paintTableSel(ctx: CanvasRenderingContext2D, pg: number): void {
    const ts = this.tableSel;
    if (!ts) return;
    ctx.fillStyle = 'rgba(58,114,196,0.35)';
    for (const b of this.tableBoxes(ts.anchor, ts.path)) {
      if (b.pg !== pg || b.r < ts.rect.r1 || b.r > ts.rect.r2 || b.c + b.box.span - 1 < ts.rect.c1 || b.c > ts.rect.c2) continue;
      ctx.fillRect(b.box.x, b.box.y, b.box.w, b.box.h);
    }
  }

  /** Fundo da seleção nas linhas do modelo em edição. */
  private paintEngineSelection(ctx: CanvasRenderingContext2D, pg: number, sel: DocRange): void {
    ctx.fillStyle = 'rgba(58,114,196,0.35)';
    for (let pi = sel.start.para; pi <= sel.end.para; pi++) {
      for (const line of this.layoutCache[pi]?.lines ?? []) {
        if (line.page !== pg) continue;
        const from = Math.max(line.rich.start, pi === sel.start.para ? sel.start.offset : 0);
        const to = Math.min(line.rich.end, pi === sel.end.para ? sel.end.offset : line.rich.end);
        // linha inteira selecionada além do fim: um respiro como a marca ¶ do Word
        const past = pi < sel.end.para && line === this.layoutCache[pi]!.lines[this.layoutCache[pi]!.lines.length - 1];
        if (to <= from && !past) continue;
        const x1 = this.caretX({ para: pi, offset: from }, line);
        const x2 = this.caretX({ para: pi, offset: to }, line) + (past ? 80 : 0);
        ctx.fillRect(x1, line.yTwips, Math.max(0, x2 - x1), line.heightTwips);
      }
    }
  }

  /** Fim da linha para End: numa linha quebrada, antes do espaço final (o
   *  offset do fim é o início da próxima linha). */
  private lineEndOffset(line: LaidLine): number {
    const pl = this.layoutCache[line.para];
    const last = !pl || pl.lines[pl.lines.length - 1] === line;
    if (last || !line.eng || !this.model) return line.rich.end;
    const text = paraText(this.model.paragraphs[line.para]!);
    let e = line.rich.end;
    while (e > line.rich.start && /\s/.test(text[e - 1] ?? '')) e--;
    return e;
  }

  // ───────────── cabeçalho/rodapé no motor ─────────────

  /** Seção (do editor) da página. */
  private sectionOfPage(pg: number): Section | undefined {
    const b = this.bodyState();
    const i = this.pageSections[pg] ?? 0;
    return b.sectionStarts[i]?.section ?? this.fullDoc?.sections[i] ?? this.fullDoc?.sections[0];
  }

  /**
   * Parte de cabeçalho/rodapé que a página `pg` mostra no layout do motor: a
   * variante (primeira/par/padrão — a das linhas da página, senão a regra do
   * Word) e a seção que a define (herança das anteriores). Sem parte definida,
   * a seção da própria página (o editor cria a parte nela).
   */
  private hfPartOfPage(kind: 'header' | 'footer', pg: number): { section: Section; type: HfKind } | null {
    const eng = this.eng;
    const page = eng?.result.pages[pg];
    if (!eng || !page) return null;
    const which = kind === 'header' ? 'hdr' : 'ftr';
    let type: HfKind | undefined;
    for (const el of eng.lines) if (el.page === pg && el.loc.kind === 'hf' && el.loc.which === which) { type = el.loc.part; break; }
    if (!type) {
      let sectPage = 0;
      for (let i = pg - 1; i >= 0 && eng.result.pages[i]!.section === page.section; i--) sectPage++;
      const sp = this.sectionOfPage(pg)?.sectPr;
      const evenOdd = !!this.fullDoc?.formatting?.settings.evenAndOddHeaders;
      type = sectPage === 0 && sp?.titlePg ? 'first' : evenOdd && page.number % 2 === 0 ? 'even' : 'default';
    }
    const src = hfBlocksFor(eng.doc.full, page.section, which, type);
    const b = this.bodyState();
    const definer = src ? eng.doc.sectionMap[src.definer] : undefined;
    const section = (definer !== undefined ? b.sectionStarts[definer]?.section ?? this.fullDoc?.sections[definer] : undefined) ?? this.sectionOfPage(pg);
    return section ? { section, type } : null;
  }

  /** Faixa vertical (twips) do cabeçalho/rodapé na página: a margem ou o que
   *  o conteúdo do motor ocupa, o que for maior. */
  private hfBand(pg: number, kind: 'header' | 'footer'): { top: number; bottom: number } {
    const page = this.eng?.result.pages[pg];
    const sp = this.sectionOfPage(pg)?.sectPr ?? this.bodyState().model.sectPr;
    const pageH = page?.heightTw ?? sp.pageHeightTwips;
    const which = kind === 'header' ? 'hdr' : 'ftr';
    let top = kind === 'header' ? 0 : pageH - sp.marginBottomTwips;
    let bottom = kind === 'header' ? sp.marginTopTwips : pageH;
    for (const el of this.eng?.lines ?? []) {
      if (el.page !== pg || el.loc.kind !== 'hf' || el.loc.which !== which) continue;
      if (kind === 'header') bottom = Math.max(bottom, el.line.y + el.line.height);
      else top = Math.min(top, el.line.y);
    }
    return { top, bottom };
  }

  // ───────────── edição de célula de tabela (motor) ─────────────

  /** Linha do motor sob o ponteiro numa página (qualquer contexto). */
  private engLineAt(e: MouseEvent): EngLine | null {
    const eng = this.eng;
    if (!eng) return null;
    const scale = PX_PER_TWIP * this.zoom;
    for (let pg = 0; pg < this.canvases.length; pg++) {
      const rect = this.canvases[pg]!.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right) continue;
      const xT = (e.clientX - rect.left) / scale;
      const yT = (e.clientY - rect.top) / scale;
      let best: EngLine | null = null;
      let bestD = Infinity;
      for (const el of eng.lines) {
        if (el.page !== pg || el.loc.kind === 'other') continue;
        const l = el.line;
        const dy = yT < l.y ? l.y - yT : yT > l.y + l.height ? yT - (l.y + l.height) : 0;
        const dx = xT < l.x ? l.x - xT : xT > l.x + l.width ? xT - (l.x + l.width) : 0;
        // dentro da faixa vertical vence; entre células, a mais próxima na horizontal
        const d = dy * 4 + dx;
        if (d < bestD) { bestD = d; best = el; }
      }
      return best;
    }
    return null;
  }

  /** Clique na visão do motor: entra/sai da edição de célula conforme a linha
   *  clicada (o hitTest depois acha o offset nas linhas do modelo em edição). */
  private routeEngineClick(e: MouseEvent): void {
    if (!this.eng || this.hfEdit || this.tbEdit || this.locked()) return;
    const el = this.engLineAt(e);
    if (!el) return;
    if (el.loc.kind === 'cell') {
      const ce = this.cellEdit;
      if (ce && ce.anchor === el.loc.anchor && sameHops(ce.hops, el.loc.hops)) return;
      this.enterCell(el.loc.anchor, el.loc.hops);
    } else if (el.loc.kind === 'body' && this.cellEdit) {
      this.exitCell();
      this.refreshSelection();
    }
  }

  /** Entra na edição da célula (o modelo passa a ser os parágrafos dela). */
  private enterCell(anchor: number, hops: CellHop[], caret?: DocPosition, paint = true): boolean {
    const t = this.tableAnchors[anchor]?.table;
    const cell = t ? resolveCell(t, hops) : null;
    if (!cell || !this.model) return false;
    if (this.cellEdit) this.exitCell();
    if (!cell.paragraphs.length) {
      const p: Paragraph = { runs: [], props: {} };
      cell.paragraphs.push(p);
      if (cell.blocks) cell.blocks.push({ type: 'paragraph', paragraph: p });
    }
    this.floatSel = null;
    this.cellEdit = {
      anchor, hops: hops.map((h) => ({ ...h })), cell,
      saved: { model: this.model, selection: this.selection },
    };
    this.model = { paragraphs: cell.paragraphs, sectPr: this.model.sectPr };
    const start = caret ?? { para: 0, offset: 0 };
    this.selection = { anchor: start, focus: start };
    this.pendingProps = null;
    // o layout não muda: só as linhas do modelo em edição (as da célula)
    if (!paint) { /* quem chamou refaz o layout */ } else if (this.eng) { this.rebuildEditLines(); this.refreshSelection(); } else this.refresh();
    this.dispatchEvent(new CustomEvent('uw-cellmode', { detail: { active: true } }));
    return true;
  }

  /** Sai da edição de célula (sem refazer o layout — o chamador refaz). */
  private exitCell(): void {
    const ce = this.cellEdit;
    if (!ce) return;
    if (ce.cell.blocks) ce.cell.blocks = reconcileBlocks(ce.cell.blocks, ce.cell.paragraphs, false);
    this.cellEdit = null;
    this.model = ce.saved.model;
    this.selection = ce.saved.selection;
    this.pendingProps = null;
    this.rebuildEditLines();
    this.dispatchEvent(new CustomEvent('uw-cellmode', { detail: { active: false } }));
  }

  /** Editando uma célula de tabela? */
  editingTableCell(): boolean { return this.cellEdit !== null; }

  /** Tab/Shift+Tab: próxima/anterior célula da mesma tabela (como o Word). */
  private moveCell(dir: 1 | -1): boolean {
    const ce = this.cellEdit;
    if (!ce || !this.eng) return false;
    // células da mesma tabela na ordem das linhas do motor (linha, coluna)
    const prefix = ce.hops.slice(0, -1);
    const seen: CellHop[] = [];
    for (const el of this.eng.lines) {
      if (el.loc.kind !== 'cell' || el.loc.anchor !== ce.anchor || el.loc.hops.length !== ce.hops.length) continue;
      if (!sameHops(el.loc.hops.slice(0, -1), prefix)) continue;
      const h = el.loc.hops[el.loc.hops.length - 1]!;
      if (!seen.some((s) => s.r === h.r && s.c === h.c)) seen.push(h);
    }
    seen.sort((a, b) => a.r - b.r || a.c - b.c);
    const me = ce.hops[ce.hops.length - 1]!;
    const idx = seen.findIndex((s) => s.r === me.r && s.c === me.c);
    const next = seen[idx + dir];
    // Tab na última célula: linha nova (como o Word)
    if (idx >= 0 && !next && dir === 1 && !this.locked()) return this.tabNewRow();
    if (idx < 0 || !next) return false;
    const hops = [...prefix.map((h) => ({ ...h })), { r: next.r, c: next.c }];
    if (!this.enterCell(ce.anchor, hops)) return false;
    // seleciona o conteúdo da célula (Word seleciona ao entrar por Tab)
    const ps = this.model!.paragraphs;
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: ps.length - 1, offset: paraLength(ps[ps.length - 1]!) } };
    this.refreshSelection();
    return true;
  }

  // ───────────── tabelas: seleção de células, operações e API ─────────────

  /** Seleção de células (retângulo da grade) — null = cursor/seleção de texto. */
  private tableSel: TableSel | null = null;
  /** Estilos de tabela internos acrescentados ao documento (vão para o styles.xml ao salvar). */
  private pendingTableStyles = new Map<string, string>();
  /** Formatação do documento novo (sem styles.xml) — os estilos de tabela usados. */
  private newFormatting: DocFormatting | null = null;

  /** Folha de estilos que o motor lê (a do documento ou a do documento novo). */
  private formattingForTables(): DocFormatting {
    const f = this.fullDoc ? (this.fullDoc.formatting ??= emptyFormatting()) : (this.newFormatting ??= emptyFormatting());
    // sem theme1.xml o Word usa o tema padrão do Office: as cores de tema dos
    // estilos de tabela (themeFill accent1…) resolvem por ele
    if (!Object.keys(f.theme.colors).length) f.theme.colors = this.documentThemeColors();
    return f;
  }

  /** id do estilo de tabela interno (pelo nome inglês) neste documento; acrescenta a definição se faltar. */
  private tableStyleId(name: string): string | undefined {
    return ensureTableStyle(this.formattingForTables(), name, this.pendingTableStyles);
  }

  /** Tabela no fim do caminho: `path` = passos até a célula que CONTÉM a tabela (vazio = do corpo). */
  private tableAt(anchor: number, path: readonly CellHop[]): TableBlock | null {
    let t: TableBlock | null = this.bodyState().tableAnchors[anchor]?.table ?? null;
    for (const h of path) {
      if (!t) return null;
      const cell = cellAtGrid(t, h.r, h.c);
      const blk = cell ? cellBlocks(cell)[h.b ?? -1] : undefined;
      t = blk?.type === 'table' ? blk : null;
    }
    return t;
  }

  /** Alvo das operações de tabela: a seleção de células ou a célula do cursor. */
  private tableTarget(): { anchor: number; path: CellHop[]; table: TableBlock; rect: TableRect } | null {
    if (this.hfEdit || this.tbEdit || !this.model) return null;
    const ts = this.tableSel;
    if (ts) {
      const table = this.tableAt(ts.anchor, ts.path);
      return table ? { anchor: ts.anchor, path: ts.path, table, rect: ts.rect } : null;
    }
    const ce = this.cellEdit;
    if (!ce) return null;
    const path = ce.hops.slice(0, -1);
    const me = ce.hops[ce.hops.length - 1]!;
    const table = this.tableAt(ce.anchor, path);
    if (!table) return null;
    return { anchor: ce.anchor, path, table, rect: TOps.normRect(TOps.mapTable(table), { r1: me.r, c1: me.c, r2: me.r, c2: me.c }) };
  }

  /** Entra na célula (linha r, coluna da grade c); cursor no início ou no fim. */
  private enterCellAt(anchor: number, path: readonly CellHop[], r: number, c: number, atEnd = false, paint = true): boolean {
    const t = this.tableAt(anchor, path);
    if (!t || !t.rows.length) return false;
    const m = TOps.mapTable(t);
    const ri = Math.max(0, Math.min(r, t.rows.length - 1));
    const g = TOps.cellAt(m, ri, c) ?? m.rows[ri]?.[m.rows[ri]!.length - 1];
    if (!g) return false;
    const cell = g.cell;
    const last = Math.max(0, cell.paragraphs.length - 1);
    const caret = atEnd && cell.paragraphs[last] ? { para: last, offset: paraLength(cell.paragraphs[last]!) } : undefined;
    return this.enterCell(anchor, [...path.map((h) => ({ ...h })), { r: g.ri, c: g.col }], caret, paint);
  }

  /** Referência do motor da tabela ("b3", "b3/r0/c1/b2"…) — caixas de célula e linhas. */
  private tableRefOf(anchor: number, path: readonly CellHop[]): string | null {
    const eng = this.eng;
    if (!eng) return null;
    const bi = eng.doc.origins.findIndex((o) => o.kind === 'table' && o.anchor === anchor);
    if (bi < 0) return null;
    return `b${bi}` + path.map((h) => `/r${h.r}/c${h.c}/b${h.b ?? 0}`).join('');
  }

  /** Caixas das células da tabela no layout atual: { página, linha, coluna, caixa }. */
  private tableBoxes(anchor: number, path: readonly CellHop[]): { pg: number; r: number; c: number; box: PlacedCell }[] {
    const pre = this.tableRefOf(anchor, path);
    const out: { pg: number; r: number; c: number; box: PlacedCell }[] = [];
    if (!pre || !this.eng) return out;
    this.eng.result.pages.forEach((p, pg) => {
      for (const box of p.cells ?? []) {
        if (!box.ref.startsWith(pre + '/r')) continue;
        const m = /^\/r(\d+)\/c(\d+)$/.exec(box.ref.slice(pre.length));
        if (m) out.push({ pg, r: +m[1]!, c: +m[2]!, box });
      }
    });
    return out;
  }

  /** Altura exibida de cada linha r1..r2 (soma das partes em cada página). */
  private rowHeights(anchor: number, path: readonly CellHop[], r1: number, r2: number): number[] {
    const boxes = this.tableBoxes(anchor, path);
    const out: number[] = [];
    for (let r = r1; r <= r2; r++) {
      const perPage = new Map<number, number>();
      for (const b of boxes) if (b.r === r) perPage.set(b.pg, Math.max(perPage.get(b.pg) ?? 0, b.box.h));
      out.push([...perPage.values()].reduce((a, b) => a + b, 0));
    }
    return out;
  }

  /** Executa uma operação de tabela: UM passo de desfazer, fora da célula (o
   *  corpo é o modelo durante a operação), layout completo e o resultado. */
  private editTable(fn: (tg: { anchor: number; path: CellHop[]; table: TableBlock; rect: TableRect }) => TableAfter | false): boolean {
    if (!this.model || this.locked()) return false;
    const tg = this.tableTarget();
    if (!tg) return false;
    this.snapshot();
    if (this.cellEdit) this.exitCell();
    const after = fn(tg);
    if (after === false) { this.undoStack.pop(); this.refresh(); return false; }
    TOps.syncLegacy(tg.table);
    this.afterTableEdit(tg.anchor, tg.path, after);
    return true;
  }

  /** Cursor/seleção depois de uma operação de tabela. */
  private afterTableEdit(anchor: number, path: CellHop[], a: TableAfter): void {
    this.tableSel = null;
    this.pendingProps = null;
    if (a.body) {
      if (this.cellEdit) this.exitCell();
      this.selection = { anchor: a.body, focus: a.body };
    } else if (a.enter) {
      this.enterCellAt(anchor, a.enter.path, a.enter.r, a.enter.c, a.enter.end, false);
    } else if (a.select) {
      const r = a.select;
      this.enterCellAt(anchor, path, r.r1, r.c1, false, false);
      const t = this.tableAt(anchor, path);
      const n = t ? TOps.cellsIn(TOps.mapTable(t), r).filter((g) => TOps.vMergeOf(g.cell) !== 'continue').length : 0;
      if (n > 1) this.tableSel = { anchor, path, rect: r, origin: { r: r.r1, c: r.c1 } };
      else if (this.model) {
        // uma célula só (mesclar): o conteúdo dela fica selecionado, como no Word
        const ps = this.model.paragraphs;
        this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: ps.length - 1, offset: paraLength(ps[ps.length - 1]!) } };
      }
    } else if (a.caret) {
      this.enterCellAt(anchor, path, a.caret.r, a.caret.c, a.caret.end, false);
    }
    this.refresh();
    this.scrollCaretIntoView();
  }

  /** Remove a tabela (do corpo ou da célula que a contém). */
  private removeTableAt(anchor: number, path: CellHop[]): TableAfter {
    if (!path.length) {
      const a = this.tableAnchors[anchor]!;
      this.tableAnchors.splice(anchor, 1);
      const body = this.model!.paragraphs;
      return { body: { para: Math.min(a.beforePara, body.length - 1), offset: 0 } };
    }
    const outer = this.tableAt(anchor, path.slice(0, -1));
    const h = path[path.length - 1]!;
    const cell = outer ? cellAtGrid(outer, h.r, h.c) : null;
    if (cell) TOps.setCellContent(cell, TOps.cellContent(cell).filter((_, i) => i !== h.b));
    return { enter: { path: path.slice(0, -1), r: h.r, c: h.c } };
  }

  /** Cursor logo depois da tabela (no corpo, ou na célula de fora). */
  private afterTableTarget(anchor: number, path: CellHop[]): TableAfter {
    if (!path.length) {
      const a = this.tableAnchors[anchor]!;
      return { body: { para: Math.min(a.beforePara, this.model!.paragraphs.length - 1), offset: 0 } };
    }
    const h = path[path.length - 1]!;
    return { enter: { path: path.slice(0, -1), r: h.r, c: h.c, end: true } };
  }

  /** Recuo esquerdo efetivo do parágrafo (direto ou do estilo). */
  private paraIndent(p: Paragraph): number {
    return p.props.indentLeftTwips ?? (this.styleOf(p) as { indentLeftTwips?: number } | undefined)?.indentLeftTwips ?? 0;
  }

  /**
   * Insere uma tabela no cursor, como o botão Inserir Tabela: estilo "Tabela com
   * grade", colunas iguais na largura disponível e o cursor na 1ª célula. No
   * meio de um parágrafo, ele é dividido; dentro de uma célula, a tabela fica
   * aninhada. `autofit`/`colWidthTwips` = opções do diálogo Inserir Tabela.
   */
  insertTable(rows: number, cols: number, opts: { autofit?: 'fixed' | 'content' | 'window'; colWidthTwips?: number } = {}): void {
    if (!this.model || this.locked() || this.hfEdit || this.tbEdit) return;
    rows = Math.max(1, Math.min(32767, Math.floor(rows) || 1));
    cols = Math.max(1, Math.min(63, Math.floor(cols) || 1));
    this.snapshot();
    this.tableSel = null;
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const styleId = this.tableStyleId('Table Grid') ?? null;
    let { para, offset } = this.selection.focus;
    if (offset > 0) { splitParagraph(this.model, { para, offset }); this.shiftAnchors(para, 1); para++; }
    const ce = this.cellEdit;
    if (ce) {
      // aninhada: o bloco entra antes do parágrafo do cursor, na célula
      const me = ce.hops[ce.hops.length - 1]!;
      const path = ce.hops.slice(0, -1);
      const target = ce.cell.paragraphs[para];
      this.exitCell();
      const outer = this.tableAt(ce.anchor, path);
      const g = outer ? TOps.cellAt(TOps.mapTable(outer), me.r, me.c) : undefined;
      if (!outer || !g) return;
      const avail = TOps.gridWidth(outer, g.col, g.span) - 216;
      const t = TOps.newTable(rows, cols, { availTwips: avail, styleId, autofit: opts.autofit, colTwips: opts.colWidthTwips });
      const blocks = [...TOps.cellContent(g.cell)];
      let bi = blocks.findIndex((b) => b.type === 'paragraph' && b.paragraph === target);
      if (bi < 0) bi = blocks.length - 1;
      blocks.splice(bi, 0, t);
      TOps.setCellContent(g.cell, blocks);
      this.enterCellAt(ce.anchor, [...path, { r: me.r, c: me.c, b: bi }], 0, 0, false, false);
      this.refresh();
      return;
    }
    const p = this.model.paragraphs[para]!;
    const ind = this.paraIndent(p);
    const t = TOps.newTable(rows, cols, {
      availTwips: this.contentWidthTwips() - ind, indTwips: ind > 0 ? ind : undefined,
      styleId, autofit: opts.autofit, colTwips: opts.colWidthTwips,
    });
    let at = this.tableAnchors.findIndex((a) => a.beforePara > para);
    if (at < 0) at = this.tableAnchors.length;
    this.tableAnchors.splice(at, 0, { beforePara: para, table: t });
    this.enterCellAt(at, [], 0, 0, false, false);
    this.refresh();
    this.scrollCaretIntoView();
  }

  insertRowAbove(): void { this.editTable((tg) => ({ select: TOps.insertRows(tg.table, tg.rect, 'above') })); }
  insertRowBelow(): void { this.editTable((tg) => ({ select: TOps.insertRows(tg.table, tg.rect, 'below') })); }
  insertColumnLeft(): void { this.editTable((tg) => ({ select: TOps.insertColumns(tg.table, tg.rect, 'left') })); }
  insertColumnRight(): void { this.editTable((tg) => ({ select: TOps.insertColumns(tg.table, tg.rect, 'right') })); }

  /** Inserir Células: deslocar à direita/para baixo, ou linha/coluna inteira. */
  insertCells(shift: 'right' | 'down' | 'row' | 'column' = 'down'): void {
    if (shift === 'row') { this.insertRowAbove(); return; }
    if (shift === 'column') { this.insertColumnLeft(); return; }
    this.editTable((tg) => ({ select: TOps.insertCells(tg.table, tg.rect, shift) }));
  }

  deleteRow(): void {
    this.editTable((tg) => {
      const { r1, r2 } = tg.rect;
      if (!TOps.deleteRows(tg.table, r1, r2)) return this.removeTableAt(tg.anchor, tg.path);
      // cursor na 1ª célula da linha que ocupou o lugar; sem ela, depois da tabela
      return r1 < tg.table.rows.length ? { caret: { r: r1, c: 0 } } : this.afterTableTarget(tg.anchor, tg.path);
    });
  }

  deleteColumn(): void {
    this.editTable((tg) => {
      if (!TOps.deleteColumns(tg.table, tg.rect.c1, tg.rect.c2)) return this.removeTableAt(tg.anchor, tg.path);
      // topo da coluna que ocupou o lugar (medido)
      return { caret: { r: 0, c: Math.min(tg.rect.c1, TOps.mapTable(tg.table).nCols - 1) } };
    });
  }

  deleteTable(): void { this.editTable((tg) => this.removeTableAt(tg.anchor, tg.path)); }

  /** Excluir Células: deslocar à esquerda/para cima, ou linha/coluna inteira. */
  deleteCells(shift: 'left' | 'up' | 'row' | 'column' = 'left'): void {
    if (shift === 'row') { this.deleteRow(); return; }
    if (shift === 'column') { this.deleteColumn(); return; }
    this.editTable((tg) => {
      TOps.deleteCells(tg.table, tg.rect, shift);
      return { caret: { r: tg.rect.r1, c: tg.rect.c1 } };
    });
  }

  /** Espaçamento do Normal sem o do estilo de tabela (peculiaridade medida da mescla vertical). */
  private normalSpacing(): { after?: number; line?: number } {
    const d = this.docDefaults().para;
    return { after: d.spaceAfterTwips, line: d.lineTwentieths };
  }

  mergeCells(): void {
    this.editTable((tg) => {
      if (!TOps.canMerge(tg.table, tg.rect)) return false;
      return { select: TOps.mergeCells(tg.table, tg.rect, { normalSpacing: this.normalSpacing() }) };
    });
  }

  /** Dividir Células em `cols` × `rows` (padrão do diálogo: 2 × 1, mesclar antes). */
  splitCell(cols = 2, rows = 1, mergeFirst = true): void {
    this.editTable((tg) => ({
      select: TOps.splitCells(tg.table, tg.rect, cols, rows, {
        mergeFirst, normalSpacing: this.normalSpacing(),
        rowHeights: this.rowHeights(tg.anchor, tg.path, tg.rect.r1, tg.rect.r2),
      }),
    }));
  }

  /** Dividir Tabela antes da linha do cursor (parágrafo vazio entre as partes;
   *  na 1ª linha, o parágrafo entra antes da tabela, como Ctrl+Shift+Enter). */
  splitTable(): void {
    this.editTable((tg) => {
      const r = tg.rect.r1;
      const empty = (): Paragraph => ({ runs: [], props: {} });
      if (!tg.path.length) {
        const a = this.tableAnchors[tg.anchor]!;
        const k = a.beforePara;
        this.model!.paragraphs.splice(k, 0, empty());
        this.shiftAnchors(k - 1, 1);
        if (r === 0) return { body: { para: k, offset: 0 } };
        a.beforePara = k;
        const t2 = TOps.splitTable(tg.table, r);
        if (t2) this.tableAnchors.splice(tg.anchor + 1, 0, { beforePara: k + 1, table: t2 });
        return { body: { para: k, offset: 0 } };
      }
      // aninhada: parágrafo e a 2ª parte entram na célula de fora
      const h = tg.path[tg.path.length - 1]!;
      const outer = this.tableAt(tg.anchor, tg.path.slice(0, -1));
      const cell = outer ? cellAtGrid(outer, h.r, h.c) : null;
      if (!cell) return false;
      const blocks = [...TOps.cellContent(cell)];
      const bi = h.b ?? 0;
      if (r === 0) blocks.splice(bi, 0, { type: 'paragraph', paragraph: empty() });
      else {
        const t2 = TOps.splitTable(tg.table, r);
        blocks.splice(bi + 1, 0, { type: 'paragraph', paragraph: empty() }, ...(t2 ? [t2] : []));
      }
      TOps.setCellContent(cell, blocks);
      return { enter: { path: tg.path.slice(0, -1), r: h.r, c: h.c } };
    });
  }

  /** Selecionar célula / linha / coluna / tabela (como o menu Selecionar). */
  selectCell(): void { this.selectTablePart('cell'); }
  selectRow(): void { this.selectTablePart('row'); }
  selectColumn(): void { this.selectTablePart('column'); }
  selectTable(): void { this.selectTablePart('table'); }

  private selectTablePart(which: 'cell' | 'row' | 'column' | 'table'): void {
    const tg = this.tableTarget();
    if (!tg) return;
    const m = TOps.mapTable(tg.table);
    let r = tg.rect;
    if (which === 'row') r = { ...r, c1: 0, c2: m.nCols - 1 };
    else if (which === 'column') r = { ...r, r1: 0, r2: tg.table.rows.length - 1 };
    else if (which === 'table') r = TOps.wholeRect(tg.table);
    r = TOps.normRect(m, r);
    if (!this.cellEdit) this.enterCellAt(tg.anchor, tg.path, r.r1, r.c1, false, false);
    this.tableSel = { anchor: tg.anchor, path: tg.path, rect: r, origin: { r: r.r1, c: r.c1 } };
    if (which === 'cell' && this.model) {
      // uma célula: o Word seleciona a célula inteira (a marca de célula junto)
      const ps = this.model.paragraphs;
      this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: ps.length - 1, offset: paraLength(ps[ps.length - 1]!) } };
    }
    this.refreshSelection();
    this.onSelectionChange?.(); this.chromeSync?.();
  }

  /** Distribuir Linhas: as selecionadas (ou todas) com a média das alturas exibidas. */
  distributeRows(): void {
    this.editTable((tg) => {
      let { r1, r2 } = tg.rect;
      if (r1 === r2) { r1 = 0; r2 = tg.table.rows.length - 1; }
      TOps.distributeRows(tg.table, r1, r2, this.rowHeights(tg.anchor, tg.path, r1, r2));
      return { select: { ...tg.rect } };
    });
  }

  /** Distribuir Colunas: as selecionadas (com o cursor numa célula, todas). */
  distributeColumns(): void {
    this.editTable((tg) => {
      let { c1, c2 } = tg.rect;
      if (c1 === c2) { c1 = 0; c2 = TOps.mapTable(tg.table).nCols - 1; }
      TOps.distributeColumns(tg.table, c1, c2);
      return { select: { ...tg.rect } };
    });
  }

  /** Altura das linhas selecionadas (twips; 0 = automática). */
  setRowHeight(twips: number, rule: 'atLeast' | 'exact' = 'atLeast'): void {
    this.editTable((tg) => { TOps.setRowHeight(tg.table, tg.rect.r1, tg.rect.r2, twips, rule); return { select: { ...tg.rect } }; });
  }

  /** Largura das colunas selecionadas (twips) — a tabela alarga/encolhe, como no Word. */
  setColumnWidth(twips: number): void {
    if (!(twips > 0)) return;
    this.editTable((tg) => { TOps.setColumnWidth(tg.table, tg.rect.c1, tg.rect.c2, twips); return { select: { ...tg.rect } }; });
  }

  /** AutoAjuste: ao conteúdo, à janela ou largura fixa da coluna. */
  autoFitTable(mode: 'content' | 'window' | 'fixed'): void {
    this.editTable((tg) => {
      const ind = tg.table.tblPr?.tblInd?.type === 'dxa' ? tg.table.tblPr.tblInd.w : 0;
      TOps.autoFit(tg.table, mode, this.contentWidthTwips() - ind);
      return { select: { ...tg.rect } };
    });
  }

  /** Alinhamento na célula (os 9 botões): horizontal nos parágrafos + vAlign. */
  setCellAlignment(h: 'left' | 'center' | 'right' | 'both', v: 'top' | 'center' | 'bottom'): void {
    this.editTable((tg) => {
      const m = TOps.mapTable(tg.table);
      TOps.setCellProps(tg.table, tg.rect, { vAlign: v === 'top' ? undefined : v });
      for (const g of TOps.cellsIn(m, TOps.normRect(m, tg.rect))) {
        for (const p of g.cell.paragraphs) {
          const st = (this.styleOf(p) as { alignment?: string } | undefined)?.alignment ?? 'left';
          if (h === 'left' && st === 'left') delete p.props.alignment; else p.props.alignment = h;
        }
      }
      return { select: { ...tg.rect } };
    });
  }

  /** Direção do texto das células: vertical acrescenta não-dividir e altura
   *  mínima de 2 cm na linha e recuo de 0,2 cm nos parágrafos (medido). */
  setTextDirection(dir: 'lrTb' | 'tbRl' | 'btLr'): void {
    this.editTable((tg) => {
      TOps.setTextDirection(tg.table, tg.rect, dir);
      if (dir !== 'lrTb') {
        const m = TOps.mapTable(tg.table);
        for (const g of TOps.cellsIn(m, TOps.normRect(m, tg.rect))) {
          for (const p of g.cell.paragraphs) { p.props.indentLeftTwips = 113; p.props.indentRightTwips = 113; }
        }
      }
      return { select: { ...tg.rect } };
    });
  }

  /** O botão Direção do Texto: horizontal → para baixo (tbRl) → para cima (btLr) → horizontal. */
  cycleTextDirection(): void {
    const s = this.getTableState();
    if (!s) return;
    this.setTextDirection(s.textDirection === 'tbRl' ? 'btLr' : s.textDirection === 'btLr' ? 'lrTb' : 'tbRl');
  }

  /** Repetir Linhas de Cabeçalho: liga/desliga nas linhas da 1ª até a seleção. */
  toggleRepeatHeaderRows(): void {
    this.editTable((tg) => {
      const on = !this.getTableState()?.headerRow;
      TOps.setRowProps(tg.table, 0, tg.rect.r2, { tblHeader: on ? true : undefined });
      return { select: { ...tg.rect } };
    });
  }

  /** Margens padrão das células (twips), espaçamento entre células e redimensionar automaticamente. */
  setTableCellMargins(m: { top?: number; left?: number; bottom?: number; right?: number }, spacingTwips?: number, autoResize?: boolean): void {
    this.editTable((tg) => {
      const w = (v: number | undefined): WidthSpec | undefined => (v === undefined ? undefined : { w: Math.round(v), type: 'dxa' });
      const mar = { top: w(m.top), left: w(m.left), bottom: w(m.bottom), right: w(m.right) };
      TOps.setTableProps(tg.table, { tblCellMar: Object.values(mar).some(Boolean) ? JSON.parse(JSON.stringify(mar)) : undefined });
      if (spacingTwips !== undefined) TOps.setCellSpacing(tg.table, spacingTwips);
      if (autoResize !== undefined) TOps.setTableProps(tg.table, { tblLayout: autoResize ? undefined : 'fixed' });
      return { select: { ...tg.rect } };
    });
  }

  /** Converter em Texto: a tabela vira parágrafos (separador: tabulação, parágrafo, ; ou outro). */
  convertTableToText(separator: TextSeparator = 'tab'): void {
    this.editTable((tg) => {
      const paras = TOps.tableToText(tg.table, separator);
      if (!paras.length) paras.push({ runs: [], props: {} });
      for (const p of paras) this.syncRunRPr([p]);
      if (!tg.path.length) {
        const a = this.tableAnchors[tg.anchor]!;
        const k = a.beforePara;
        this.tableAnchors.splice(tg.anchor, 1);
        this.model!.paragraphs.splice(k, 0, ...paras);
        this.shiftAnchors(k - 1, paras.length);
        // o texto convertido fica selecionado
        const last = k + paras.length - 1;
        this.tableSel = null;
        this.selection = { anchor: { para: k, offset: 0 }, focus: { para: last, offset: paraLength(this.model!.paragraphs[last]!) } };
        return { keep: true };
      }
      const h = tg.path[tg.path.length - 1]!;
      const outer = this.tableAt(tg.anchor, tg.path.slice(0, -1));
      const cell = outer ? cellAtGrid(outer, h.r, h.c) : null;
      if (!cell) return false;
      const blocks = [...TOps.cellContent(cell)];
      blocks.splice(h.b ?? 0, 1, ...paras.map((paragraph) => ({ type: 'paragraph' as const, paragraph })));
      TOps.setCellContent(cell, blocks);
      return { enter: { path: tg.path.slice(0, -1), r: h.r, c: h.c } };
    });
  }

  /**
   * Converter Texto em Tabela: os parágrafos da seleção viram linhas (cortadas
   * no separador; com separador de parágrafo, `cols` por linha). Sem separador,
   * detecta como o diálogo (tabulação, ponto e vírgula, parágrafos). A tabela
   * nova fica selecionada. Devolve false sem seleção no corpo.
   */
  convertTextToTable(opts: { separator?: TextSeparator; cols?: number; autofit?: 'fixed' | 'content' | 'window'; colWidthTwips?: number } = {}): boolean {
    if (!this.model || this.locked() || this.hfEdit || this.tbEdit || this.cellEdit) return false;
    const { start, end } = normalizeRange(this.range());
    const p1 = start.para;
    const p2 = end.offset === 0 && end.para > start.para ? end.para - 1 : end.para;
    const paras = this.model.paragraphs.slice(p1, p2 + 1);
    if (!paras.length) return false;
    const sep = opts.separator ?? TOps.guessSeparator(paras);
    this.snapshot();
    const ind = this.paraIndent(paras[0]!);
    const t = TOps.textToTable(paras, sep, {
      cols: opts.cols ?? (sep === 'paragraph' ? 1 : TOps.columnsFor(paras, sep)),
      availTwips: this.contentWidthTwips() - ind, indTwips: ind > 0 ? ind : undefined,
      styleId: this.tableStyleId('Table Grid') ?? null, autofit: opts.autofit, colTwips: opts.colWidthTwips,
    });
    const n = p2 - p1 + 1;
    this.model.paragraphs.splice(p1, n);
    if (p1 >= this.model.paragraphs.length) this.model.paragraphs.push({ runs: [], props: {} });
    // tabelas que estavam entre os parágrafos convertidos ficam antes da nova
    for (const a of this.tableAnchors) {
      if (a.beforePara > p1 && a.beforePara <= p2) a.beforePara = p1;
      else if (a.beforePara > p2) a.beforePara -= n;
    }
    for (const s of this.sectionStarts) if (s.startPara > p2) s.startPara -= n;
    let at = this.tableAnchors.findIndex((a) => a.beforePara > p1);
    if (at < 0) at = this.tableAnchors.length;
    this.tableAnchors.splice(at, 0, { beforePara: p1, table: t });
    this.syncTableRPr(t);
    this.afterTableEdit(at, [], { select: TOps.wholeRect(t) });
    return true;
  }

  // ───────────── tabelas: Design da Tabela ─────────────

  /** Estilos internos carregados (sob demanda). */
  private builtinTableStyles: BuiltinTableStyle[] = [];

  /**
   * Estilos para a galeria Estilos de Tabela, na ordem do Word: os do
   * documento que não são internos (Personalizado) e os internos — os modernos
   * (Tabelas Simples, de Grade, de Lista) ou, em documento em modo de
   * compatibilidade, os do Word 2010.
   */
  async tableStyleList(): Promise<TableStyleInfo[]> {
    this.builtinTableStyles = await loadBuiltinTableStyles();
    const f = this.formattingForTables();
    const builtinNames = new Set(this.builtinTableStyles.map((b) => b.name.toLowerCase()));
    const out: TableStyleInfo[] = [];
    for (const s of Object.values(f.styles.styles)) {
      if (s.type !== 'table' || !s.name || builtinNames.has(s.name.toLowerCase())) continue;
      out.push({ name: s.name, label: { en: s.name, pt: s.name }, group: 'custom', id: s.styleId });
    }
    const modern = (f.settings?.compatibilityMode ?? 15) >= 15;
    const en = (n: string): string => n.replace(/ Accent (\d)$/, ' - Accent $1');
    for (const b of this.builtinTableStyles) {
      if (b.name === 'Normal Table' || b.modern !== modern) continue;
      const group = /^Grid Table \d/.test(b.name) ? 'grid' : /^List Table/.test(b.name) ? 'list' : 'plain';
      out.push({ name: b.name, label: { en: en(b.name), pt: b.local }, group, id: styleIdByName(f, b.name) });
    }
    const rank = (i: TableStyleInfo): number => {
      if (i.group !== 'plain') return 0;
      return i.name === 'Table Grid' ? 0 : i.name === 'Grid Table Light' ? 1 : 2;
    };
    return out.sort((a, b) => (a.group === b.group && a.group === 'plain' ? rank(a) - rank(b) || a.name.localeCompare(b.name) : 0));
  }

  /** Aplica o estilo de tabela (nome inglês do w:name; null = Limpar). Como o
   *  Word, apaga o sombreamento direto das células; a formatação do texto fica. */
  async setTableStyle(name: string | null): Promise<void> {
    if (name && !this.builtinTableStyles.length) this.builtinTableStyles = await loadBuiltinTableStyles();
    this.editTable((tg) => {
      const id = name ? ensureTableStyle(this.formattingForTables(), name, this.pendingTableStyles, this.builtinTableStyles) : undefined;
      if (name && !id) return false;
      TOps.setTableProps(tg.table, { tblStyle: id });
      for (const row of tg.table.rows) {
        if (row.trPr) delete row.trPr.cnfStyle;
        for (const c of row.cells) if (c.tcPr) { delete c.tcPr.shd; delete c.tcPr.cnfStyle; TOps.syncLegacyCell(c); }
      }
      return { select: this.tableSel ? { ...tg.rect } : undefined, caret: this.tableSel ? undefined : { r: tg.rect.r1, c: tg.rect.c1 } } as TableAfter;
    });
  }

  /** Opções de Estilo de Tabela (as caixas do Design da Tabela). */
  setTableStyleOptions(o: { headerRow?: boolean; totalRow?: boolean; bandedRows?: boolean; firstColumn?: boolean; lastColumn?: boolean; bandedColumns?: boolean }): void {
    this.editTable((tg) => {
      const patch: Partial<TblLook> = {};
      if (o.headerRow !== undefined) patch.firstRow = o.headerRow;
      if (o.totalRow !== undefined) patch.lastRow = o.totalRow;
      if (o.firstColumn !== undefined) patch.firstColumn = o.firstColumn;
      if (o.lastColumn !== undefined) patch.lastColumn = o.lastColumn;
      if (o.bandedRows !== undefined) patch.noHBand = !o.bandedRows;
      if (o.bandedColumns !== undefined) patch.noVBand = !o.bandedColumns;
      TOps.setLook(tg.table, patch);
      for (const row of tg.table.rows) {
        if (row.trPr) delete row.trPr.cnfStyle;
        for (const c of row.cells) if (c.tcPr) delete c.tcPr.cnfStyle;
      }
      return this.keepTableSel(tg);
    });
  }

  /** Cores do tema do documento (chaves do theme1.xml; sem tema, o do Office 2023) — paletas da interface. */
  documentThemeColors(): Record<string, string> {
    const c = (this.fullDoc?.formatting ?? this.newFormatting)?.theme?.colors ?? {};
    return Object.keys(c).length ? { ...c } : {
      dk1: '000000', lt1: 'FFFFFF', dk2: '0E2841', lt2: 'E8E8E8', accent1: '156082', accent2: 'E97132',
      accent3: '196B24', accent4: '0F9ED5', accent5: 'A02B93', accent6: '4EA72E', hlink: '467886', folHlink: '96607D',
    };
  }

  /** Mantém a seleção (de células ou o cursor) depois de uma operação que não muda a estrutura. */
  private keepTableSel(tg: { rect: TableRect }): TableAfter {
    return this.tableSel ? { select: { ...tg.rect } } : { caret: { r: tg.rect.r1, c: tg.rect.c1 } };
  }

  /**
   * Sombreamento das células: "RRGGBB", uma cor do tema
   * ({ themeColor: 'accent1', tint?: '33', shade?: 'BF' } — grava themeFill como
   * o Word) ou null (Sem Cor). Tabela inteira selecionada: também o tblPr.
   */
  setCellShading(color: string | { themeColor: string; tint?: string; shade?: string } | null): void {
    this.editTable((tg) => {
      let shd: ShadingSpec | null = null;
      if (typeof color === 'string') shd = { val: 'clear', color: 'auto', fill: color.replace(/^#/, '').toUpperCase() };
      else if (color) {
        const f = this.formattingForTables();
        shd = {
          val: 'clear', color: 'auto', fill: themeHex(f.theme?.colors ?? {}, color.themeColor, color.tint, color.shade), themeFill: color.themeColor,
          ...(color.tint ? { themeFillTint: color.tint } : {}), ...(color.shade ? { themeFillShade: color.shade } : {}),
        };
      }
      const whole = this.isWholeTable(tg);
      TOps.setShading(tg.table, tg.rect, shd, whole);
      return this.keepTableSel(tg);
    });
  }

  /** A seleção cobre a tabela inteira? */
  private isWholeTable(tg: { table: TableBlock; rect: TableRect }): boolean {
    const w = TOps.wholeRect(tg.table);
    return !!this.tableSel && tg.rect.r1 === 0 && tg.rect.c1 === 0 && tg.rect.r2 >= w.r2 && tg.rect.c2 >= w.c2;
  }

  /** Caneta das bordas (Estilo, Espessura e Cor da Caneta): o padrão do Word é simples, ½ pt, automática. */
  private borderPen: BorderSpec = { val: 'single', sz: 4, space: 0, color: 'auto' };
  getBorderPen(): BorderSpec { return { ...this.borderPen }; }
  setBorderPen(p: Partial<BorderSpec>): void {
    this.borderPen = { ...this.borderPen, ...p };
    this.dispatchEvent(new CustomEvent('uw-borderpen', { detail: this.getBorderPen() }));
  }

  /**
   * Bordas (o menu Bordas): aplica a caneta (ou `spec`) aos lados pedidos da
   * seleção. Tabela inteira → w:tblBorders como diferença do estilo; células
   * → w:tcBorders nas duas células de cada aresta (medido).
   */
  setCellBorders(kind: BorderKind, spec?: BorderSpec | null): void {
    this.editTable((tg) => {
      const pen = spec === undefined ? this.borderPen : spec;
      const whole = this.isWholeTable(tg);
      const style = tg.table.tblPr?.tblStyle ? this.formattingForTables().styles.styles[tg.table.tblPr.tblStyle] : undefined;
      TOps.setBorders(tg.table, tg.rect, kind, kind === 'none' ? null : pen, { wholeTable: whole, styleBorders: style?.tblPr?.tblBorders });
      return this.keepTableSel(tg);
    });
  }

  /**
   * Miniatura de um estilo de tabela (galeria): tabela 5 × 5 com as opções de
   * estilo atuais, diagramada e pintada pelo próprio motor no canvas dado.
   */
  async renderTableStyleThumb(canvas: HTMLCanvasElement, name: string, look?: TblLook): Promise<void> {
    if (!this.builtinTableStyles.length) this.builtinTableStyles = await loadBuiltinTableStyles();
    const f0 = this.formattingForTables();
    const f: DocFormatting = { ...f0, styles: { ...f0.styles, styles: { ...f0.styles.styles } } };
    const id = ensureTableStyle(f, name, new Map(), this.builtinTableStyles);
    const W = 1440 * 1.2, rowH = 150;
    const t = TOps.newTable(5, 5, { availTwips: W + 10, styleId: id ?? null });
    if (look) t.tblPr!.tblLook = { ...look };
    for (const row of t.rows) row.trPr = { trHeight: { val: rowH, hRule: 'exact' } };
    const sectPr = { pageWidthTwips: W + 240, pageHeightTwips: rowH * 5 + 240, marginLeftTwips: 120, marginRightTwips: 120, marginTopTwips: 120, marginBottomTwips: 120 } as SectPr;
    const full = {
      blocks: [t, { type: 'paragraph', paragraph: { runs: [], props: {} } }],
      sections: [{ sectPr, blockStart: 0, blockEnd: 1, headers: {}, footers: {}, headerRefs: [], footerRefs: [] }],
      footnotes: new Map(), endnotes: new Map(), comments: [], styles: new Map(), bookmarks: new Map(), formatting: f,
    } as unknown as FullDocument;
    const res = layoutDocument(full, this.liveFontProvider(), ENGINE_LAYOUT_OPTS);
    const page = res.pages[0];
    const ctx = canvas.getContext('2d');
    if (!page || !ctx) return;
    const scale = Math.min(canvas.width / (W + 240), canvas.height / (rowH * 5 + 240));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, -120 * scale + (canvas.width - W * scale) / 2, -120 * scale + (canvas.height - rowH * 5 * scale) / 2);
    paintItems(ctx, page.items, this.enginePaintEnv());
    // traços de "texto" como nas miniaturas do Word (cor do texto de cada célula)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ───────────── tabelas: mouse e teclado ─────────────

  /** Caixa de célula do motor sob o ponteiro (tabelas do corpo). */
  private cellBoxAt(e: MouseEvent): { anchor: number; path: CellHop[]; r: number; c: number; box: PlacedCell; pg: number } | null {
    const eng = this.eng;
    if (!eng) return null;
    const scale = PX_PER_TWIP * this.zoom;
    for (let pg = 0; pg < this.canvases.length; pg++) {
      const rc = this.canvases[pg]!.getBoundingClientRect();
      if (e.clientY < rc.top || e.clientY > rc.bottom || e.clientX < rc.left || e.clientX > rc.right) continue;
      const xT = (e.clientX - rc.left) / scale, yT = (e.clientY - rc.top) / scale;
      let best: { anchor: number; path: CellHop[]; r: number; c: number; box: PlacedCell; pg: number } | null = null;
      for (const box of eng.result.pages[pg]?.cells ?? []) {
        if (xT < box.x || xT > box.x + box.w || yT < box.y || yT > box.y + box.h) continue;
        const loc = locateRef(box.ref + '/b0', eng.doc.origins);
        if (loc.kind !== 'cell') continue;
        const last = loc.hops[loc.hops.length - 1]!;
        // a mais interna (tabela aninhada por cima da célula de fora)
        if (!best || loc.hops.length > best.path.length + 1) best = { anchor: loc.anchor, path: loc.hops.slice(0, -1), r: last.r, c: last.c, box, pg };
      }
      return best;
    }
    return null;
  }

  /** Arrasto que começou numa célula e passou para outra da mesma tabela: seleção de células. */
  private dragCellSel(start: { anchor: number; hops: CellHop[] }, ev: MouseEvent): boolean {
    const hit = this.cellBoxAt(ev);
    const path = start.hops.slice(0, -1);
    const me = start.hops[start.hops.length - 1]!;
    if (!hit || hit.anchor !== start.anchor || hit.path.length !== path.length || !sameHops([...hit.path, { r: 0, c: 0 }], [...path, { r: 0, c: 0 }])) return !!this.tableSel;
    if (hit.r === me.r && hit.c === me.c) {
      if (this.tableSel) { this.tableSel = null; this.refreshSelection(); this.onSelectionChange?.(); this.chromeSync?.(); }
      return false;
    }
    const t = this.tableAt(start.anchor, path);
    if (!t) return false;
    const rect = TOps.normRect(TOps.mapTable(t), { r1: Math.min(me.r, hit.r), c1: Math.min(me.c, hit.c), r2: Math.max(me.r, hit.r), c2: Math.max(me.c, hit.c) });
    this.tableSel = { anchor: start.anchor, path, rect, origin: { r: me.r, c: me.c } };
    this.refreshSelection();
    this.onSelectionChange?.(); this.chromeSync?.();
    return true;
  }

  /** Limpa o conteúdo das células selecionadas (Delete; ou antes de digitar por cima). */
  private clearSelectedCells(snapshot = true): void {
    const ts = this.tableSel;
    const t = ts ? this.tableAt(ts.anchor, ts.path) : null;
    if (!ts || !t || this.locked()) return;
    if (snapshot) this.snapshot();
    if (this.cellEdit) this.exitCell();
    const m = TOps.mapTable(t);
    for (const g of TOps.cellsIn(m, ts.rect)) {
      if (TOps.vMergeOf(g.cell) === 'continue') continue;
      TOps.setCellContent(g.cell, [{ type: 'paragraph', paragraph: TOps.formatLike(g.cell.paragraphs[0]) }]);
    }
    this.enterCellAt(ts.anchor, ts.path, ts.rect.r1, ts.rect.c1, false, false);
  }

  /** Teclas com células selecionadas. */
  private tableSelKey(e: KeyboardEvent): boolean {
    const ts = this.tableSel!;
    const t = this.tableAt(ts.anchor, ts.path);
    if (!t) { this.tableSel = null; return false; }
    const k = e.key;
    const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (arrows.includes(k) && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const m = TOps.mapTable(t);
      if (e.shiftKey) {
        // move o canto oposto à origem
        const o = ts.origin;
        let r = o.r === ts.rect.r1 ? ts.rect.r2 : ts.rect.r1;
        let c = o.c === ts.rect.c1 ? ts.rect.c2 : ts.rect.c1;
        if (k === 'ArrowUp') r = Math.max(0, r - 1);
        else if (k === 'ArrowDown') r = Math.min(t.rows.length - 1, r + 1);
        else if (k === 'ArrowLeft') c = Math.max(0, (TOps.cellAt(m, r, c)?.col ?? c) - 1);
        else { const g = TOps.cellAt(m, r, c); c = Math.min(m.nCols - 1, g ? g.col + g.span : c + 1); }
        const rect = TOps.normRect(m, { r1: Math.min(o.r, r), c1: Math.min(o.c, c), r2: Math.max(o.r, r), c2: Math.max(o.c, c) });
        const single = TOps.cellsIn(m, rect).filter((g) => TOps.vMergeOf(g.cell) !== 'continue').length <= 1;
        this.tableSel = single ? null : { ...ts, rect };
      } else {
        // colapsa no início (←/↑) ou no fim (→/↓)
        this.tableSel = null;
        const end = k === 'ArrowRight' || k === 'ArrowDown';
        if (this.cellEdit) this.exitCell();
        this.enterCellAt(ts.anchor, ts.path, end ? ts.rect.r2 : ts.rect.r1, end ? ts.rect.c2 : ts.rect.c1, end, false);
      }
      this.refreshSelection();
      this.onSelectionChange?.(); this.chromeSync?.();
      return true;
    }
    if (k === 'Escape') { e.preventDefault(); this.tableSel = null; this.refreshSelection(); this.onSelectionChange?.(); this.chromeSync?.(); return true; }
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault();
      const m = TOps.mapTable(t);
      const fullRows = ts.rect.c1 === 0 && ts.rect.c2 >= m.nCols - 1;
      // Backspace com linhas inteiras exclui as linhas (a tabela toda: a tabela)
      if (k === 'Backspace' && fullRows) {
        if (ts.rect.r1 === 0 && ts.rect.r2 >= t.rows.length - 1) this.deleteTable(); else this.deleteRow();
      } else {
        this.clearSelectedCells();
        this.tableSel = ts;
        this.refresh();
      }
      this.onSelectionChange?.(); this.chromeSync?.();
      return true;
    }
    if (k === 'Tab') { this.tableSel = null; return false; }
    return false;
  }

  /** Setas entre células e entre o corpo e as tabelas (como o Word). true = tratou. */
  private tableNavigate(dir: 'left' | 'right' | 'up' | 'down' | 'home' | 'end', extend: boolean): boolean {
    if (dir === 'home' || dir === 'end' || this.hfEdit || this.tbEdit || !this.model || !this.eng) return false;
    const pos = this.selection.focus;
    const ps = this.model.paragraphs;
    const line = this.lineOf(pos);
    const lines = this.allLines();
    const x = line ? this.caretX(pos, line) : 0;
    const ce = this.cellEdit;
    if (ce) {
      const atStart = pos.para === 0 && pos.offset === 0;
      const atEnd = pos.para === ps.length - 1 && pos.offset === paraLength(ps[pos.para]!);
      const leaving = (dir === 'left' && atStart) || (dir === 'right' && atEnd)
        || (dir === 'up' && (!line || lines[0] === line)) || (dir === 'down' && (!line || lines[lines.length - 1] === line));
      if (!leaving) return false;
      const path = ce.hops.slice(0, -1);
      const me = ce.hops[ce.hops.length - 1]!;
      const t = this.tableAt(ce.anchor, path);
      if (!t) return false;
      const m = TOps.mapTable(t);
      if (extend) {
        // Shift+seta saindo da célula: começa a seleção de células
        const g = TOps.cellAt(m, me.r, me.c);
        let r = me.r, c = me.c;
        if (dir === 'up') r = Math.max(0, TOps.vExtent(m, me.r, me.c)[0] - 1);
        else if (dir === 'down') r = Math.min(t.rows.length - 1, TOps.vExtent(m, me.r, me.c)[1] + 1);
        else if (dir === 'left') c = Math.max(0, me.c - 1);
        else c = Math.min(m.nCols - 1, (g ? g.col + g.span : me.c + 1));
        const rect = TOps.normRect(m, { r1: Math.min(me.r, r), c1: Math.min(me.c, c), r2: Math.max(me.r, r), c2: Math.max(me.c, c) });
        if (TOps.cellsIn(m, rect).filter((x2) => TOps.vMergeOf(x2.cell) !== 'continue').length > 1) {
          this.tableSel = { anchor: ce.anchor, path, rect, origin: { r: me.r, c: me.c } };
          this.refreshSelection();
        }
        return true;
      }
      if (dir === 'left' || dir === 'right') {
        const order = m.rows.flat().filter((g) => TOps.vMergeOf(g.cell) !== 'continue');
        const i = order.findIndex((g) => g.ri === me.r && g.col === me.c);
        const nx = order[i + (dir === 'right' ? 1 : -1)];
        if (nx) { this.enterCellAt(ce.anchor, path, nx.ri, nx.col, dir === 'left'); this.scrollCaretIntoView(); return true; }
        return this.leaveTable(ce.anchor, path, dir === 'right' ? 'after' : 'before');
      }
      const [a, b] = TOps.vExtent(m, me.r, me.c);
      const r = dir === 'down' ? b + 1 : a - 1;
      if (r >= 0 && r < t.rows.length) { this.enterRowAt(ce.anchor, path, r, x, dir === 'up'); return true; }
      return this.leaveTable(ce.anchor, path, dir === 'down' ? 'after' : 'before', x);
    }
    if (extend) return false;
    // corpo → tabela vizinha do parágrafo do cursor
    const p = pos.para;
    const pl = this.layoutCache[p]?.lines ?? [];
    const lastLine = !line || pl[pl.length - 1] === line;
    const firstLine = !line || pl[0] === line;
    if ((dir === 'down' && lastLine) || (dir === 'right' && pos.offset === paraLength(ps[p]!))) {
      const ai = this.tableAnchors.findIndex((a) => a.beforePara === p + 1);
      if (ai < 0 || p + 1 > ps.length - 1 + 1) return false;
      if (dir === 'down') this.enterRowAt(ai, [], 0, x, false);
      else { this.enterCellAt(ai, [], 0, 0); this.scrollCaretIntoView(); }
      return true;
    }
    if ((dir === 'up' && firstLine) || (dir === 'left' && pos.offset === 0)) {
      let ai = -1;
      this.tableAnchors.forEach((a, i) => { if (a.beforePara === p) ai = i; });
      if (ai < 0) return false;
      const t = this.tableAnchors[ai]!.table;
      if (dir === 'up') this.enterRowAt(ai, [], t.rows.length - 1, x, true);
      else {
        const m = TOps.mapTable(t);
        const lastRow = m.rows[m.rows.length - 1]!;
        const g = lastRow[lastRow.length - 1]!;
        this.enterCellAt(ai, [], g.ri, g.col, true);
        this.scrollCaretIntoView();
      }
      return true;
    }
    return false;
  }

  /** Entra na linha r da tabela na célula sob x (twips), na 1ª ou na última linha de texto dela. */
  private enterRowAt(anchor: number, path: CellHop[], r: number, x: number, fromBelow: boolean): void {
    let c = 0;
    for (const b of this.tableBoxes(anchor, path)) if (b.r === r && x >= b.box.x && x <= b.box.x + b.box.w) { c = b.c; break; }
    const t = this.tableAt(anchor, path);
    if (t && TOps.vMergeOf(TOps.cellAt(TOps.mapTable(t), r, c)?.cell ?? { paragraphs: [], tables: [], gridSpan: 1 }) === 'continue') r = TOps.vExtent(TOps.mapTable(t), r, c)[0];
    if (!this.enterCellAt(anchor, path, r, c)) return;
    const ls = this.allLines();
    const target = fromBelow ? ls[ls.length - 1] : ls[0];
    if (target) {
      const pos = { para: target.para, offset: this.hitLineX(target, x) };
      this.selection = { anchor: pos, focus: pos };
      this.refreshSelection();
    }
    this.scrollCaretIntoView();
  }

  /** Sai da tabela pela frente/por trás: para o parágrafo vizinho (ou a tabela vizinha). */
  private leaveTable(anchor: number, path: CellHop[], where: 'before' | 'after', x?: number): boolean {
    if (path.length) {
      // aninhada: volta para a célula de fora
      const h = path[path.length - 1]!;
      this.enterCellAt(anchor, path.slice(0, -1), h.r, h.c, where === 'after');
      return true;
    }
    const a = this.tableAnchors[anchor]!;
    // outra tabela colada (mesmo parágrafo âncora)
    const nb = where === 'after' ? this.tableAnchors.findIndex((o, i) => i > anchor && o.beforePara === a.beforePara)
      : [...this.tableAnchors.keys()].reverse().find((i) => i < anchor && this.tableAnchors[i]!.beforePara === a.beforePara) ?? -1;
    if (nb >= 0) {
      const t = this.tableAnchors[nb]!.table;
      if (x !== undefined) this.enterRowAt(nb, [], where === 'after' ? 0 : t.rows.length - 1, x, where === 'before');
      else if (where === 'after') this.enterCellAt(nb, [], 0, 0);
      else { const m = TOps.mapTable(t); const g = m.rows[m.rows.length - 1]!.at(-1)!; this.enterCellAt(nb, [], g.ri, g.col, true); }
      return true;
    }
    const para = where === 'after' ? a.beforePara : a.beforePara - 1;
    if (para < 0 || !this.cellEdit) return true;
    this.exitCell();
    const ps = this.model!.paragraphs;
    const p = Math.min(para, ps.length - 1);
    let offset = where === 'after' ? 0 : paraLength(ps[p]!);
    const pl = this.layoutCache[p]?.lines ?? [];
    const line = where === 'after' ? pl[0] : pl[pl.length - 1];
    if (x !== undefined && line) offset = this.hitLineX(line, x);
    this.selection = { anchor: { para: p, offset }, focus: { para: p, offset } };
    this.refreshSelection();
    this.scrollCaretIntoView();
    return true;
  }

  /** Tab na última célula: linha nova abaixo (formatação da última) e o cursor na 1ª célula dela. */
  private tabNewRow(): boolean {
    return this.editTable((tg) => {
      const last = tg.table.rows.length - 1;
      const sel = TOps.insertRows(tg.table, { ...tg.rect, r1: last, r2: last }, 'below', 1);
      return { caret: { r: sel.r1, c: 0 } };
    });
  }

  /** Alt+Shift+↑/↓ numa célula: move a linha (sem mesclas verticais). */
  private moveTableRow(dir: -1 | 1): boolean {
    const tg = this.tableTarget();
    if (!tg) return false;
    const { r1, r2 } = tg.rect;
    const to = dir < 0 ? r1 - 1 : r2 + 1;
    if (to < 0 || to >= tg.table.rows.length) return true;
    const m = TOps.mapTable(tg.table);
    const merged = (r: number): boolean => m.rows[r]!.some((g) => !!TOps.vMergeOf(g.cell));
    for (let r = Math.min(r1, to); r <= Math.max(r2, to); r++) if (merged(r)) return true;
    const me = this.cellEdit?.hops[this.cellEdit.hops.length - 1];
    return this.editTable((t) => {
      const rows = t.table.rows.splice(r1, r2 - r1 + 1);
      t.table.rows.splice(dir < 0 ? r1 - 1 : r1 + 1, 0, ...rows);
      return { caret: { r: (me?.r ?? r1) + dir, c: me?.c ?? 0 } };
    });
  }

  /** O que o Converter Texto em Tabela daria com a seleção: separador (detectado
   *  como o diálogo, se não vier), colunas e linhas. null numa tabela/cabeçalho. */
  textToTableGuess(separator?: TextSeparator, cols?: number): { separator: TextSeparator; cols: number; rows: number } | null {
    if (!this.model || this.cellEdit || this.hfEdit || this.tbEdit) return null;
    const { start, end } = normalizeRange(this.range());
    const p2 = end.offset === 0 && end.para > start.para ? end.para - 1 : end.para;
    const paras = this.model.paragraphs.slice(start.para, p2 + 1);
    if (!paras.length) return null;
    const sep = separator ?? TOps.guessSeparator(paras);
    const c = sep === 'paragraph' ? Math.max(1, cols ?? 1) : TOps.columnsFor(paras, sep);
    return { separator: sep, cols: c, rows: sep === 'paragraph' ? Math.ceil(paras.length / c) : paras.length };
  }

  /** Estado da tabela do cursor/seleção (null fora de tabela) — barras e diálogos. */
  getTableState(): TableState | null {
    const tg = this.tableTarget();
    if (!tg) return null;
    const t = tg.table;
    const m = TOps.mapTable(t);
    const g = TOps.cellAt(m, tg.rect.r1, tg.rect.c1);
    const tcPr = g?.cell.tcPr ?? {};
    const rows = t.rows.slice(tg.rect.r1, tg.rect.r2 + 1);
    const trh = rows[0]?.trPr?.trHeight;
    const style = t.tblPr?.tblStyle;
    return {
      rows: t.rows.length, cols: m.nCols, rect: { ...tg.rect }, cells: !!this.tableSel,
      nested: tg.path.length > 0,
      canMerge: TOps.canMerge(t, tg.rect),
      style, look: { ...TOps.DEFAULT_LOOK, ...(t.tblPr?.tblLook ?? {}) },
      vAlign: tcPr.vAlign ?? 'top', textDirection: tcPr.textDirection ?? 'lrTb',
      headerRow: t.rows.slice(0, tg.rect.r2 + 1).every((r) => !!r.trPr?.tblHeader),
      // sem altura definida, a exibida (como a caixa Altura do Word)
      rowHeight: trh ? { twips: trh.val, rule: trh.hRule } : { twips: this.rowHeights(tg.anchor, tg.path, tg.rect.r1, tg.rect.r1)[0] ?? 0, rule: 'auto' },
      colWidth: TOps.gridWidth(t, tg.rect.c1, tg.rect.c2 - tg.rect.c1 + 1),
      shading: tcPr.shd?.fill && tcPr.shd.fill !== 'auto' ? tcPr.shd.fill : undefined,
      tblPr: t.tblPr ? JSON.parse(JSON.stringify(t.tblPr)) as TblPr : {},
    };
  }

  /** Mudou só a apresentação (zoom, tema, marcas, proteção): com o motor o
   *  layout continua válido — refaz canvases e pintura, sem diagramar. */
  private refreshView(): void {
    if (!this.eng || !this.engineActive()) { this.refresh(); return; }
    this.rebuildCanvases();
    if (this.view === 'read') this.applyReadSpread();
    else for (const c of this.canvases) if (c.style.display === 'none') c.style.display = '';
    this.engPageCache.clear();
    this.ensureVisiblePainted();
    this.positionProxy();
    this.onSelectionChange?.(); this.chromeSync?.();
  }

  /** Só a seleção/caret mudou: repinta sem refazer o layout (o do motor custa). */
  private refreshSelection(): void {
    if (!this.eng) { this.refresh(); return; }
    this.paint();
    this.positionProxy();
    this.onSelectionChange?.(); this.chromeSync?.();
  }



  /** Arrastar/redimensionar objeto no layout do motor: a âncora passa a ser
   *  relativa à PÁGINA com a posição exibida (o motor lê wp:positionH/V). */
  private moveAnchorTo(obj: InlineImage | DrawingTextbox, x: number, y: number): void {
    const a = obj.anchor;
    if (!a) return;
    if (a.simplePos) { a.simplePos = { x: Math.round(x), y: Math.round(y) }; return; }
    a.posH = { relativeFrom: 'page', offset: Math.round(x) };
    a.posV = { relativeFrom: 'page', offset: Math.round(y) };
  }

  // ───────────────────────── pintura ─────────────────────────

  refresh(): void {
    this.layout();
    this.rebuildCanvases();
    if (this.view === 'read') this.applyReadSpread(); // só mostra o par atual
    else for (const c of this.canvases) if (c.style.display === 'none') c.style.display = ''; // limpa ocultação da Leitura
    this.ensureVisiblePainted();
    this.positionProxy();
    this.onSelectionChange?.(); this.chromeSync?.();
  }

  /** Mantém a textarea-proxy JUNTO AO CARET: o browser rola o elemento
   *  focado para a vista ao digitar — se a proxy ficasse no fim do
   *  documento, digitar saltava a rolagem para o final. De quebra, o
   *  popup de IME aparece na posição certa. */
  private positionProxy(): void {
    const line = this.lineOf(this.selection.focus);
    const canvas = line ? this.canvases[line.page] : undefined;
    if (!line || !canvas) {
      this.input.style.top = '0px';
      this.input.style.left = '0px';
      return;
    }
    const scale = PX_PER_TWIP * this.zoom;
    const x = canvas.offsetLeft + this.caretX(this.selection.focus, line) * scale;
    const y = canvas.offsetTop + line.yTwips * scale;
    this.input.style.left = `${Math.round(x)}px`;
    this.input.style.top = `${Math.round(y)}px`;
    this.input.style.height = `${Math.max(8, Math.round(line.heightTwips * scale))}px`;
  }

  private rebuildCanvases(): void {
    if (!this.model) return;
    const s = this.sect();
    const dpr = window.devicePixelRatio || 1;
    const cssScale = PX_PER_TWIP * this.zoom;
    const isPaged = this.view === 'print' || this.view === 'read';
    const widthT = this.view === 'web'
      ? this.contentWidthTwips() + 1200
      : s.pageWidthTwips;
    const heightT = isPaged ? s.pageHeightTwips : Math.max(this.continuousHeight, 3000);
    const count = isPaged ? this.pageCount : this.tileHeights.length;

    // dimensões CSS desejadas por página (ou tile, no modo contínuo)
    const cssOf = (i: number) => {
      let w = widthT, h = heightT;
      const ep = this.eng?.result.pages[i];
      if (!isPaged) {
        h = this.tileHeights[i] ?? heightT;
      } else if (ep) {
        // motor: o tamanho de cada página vem do layout (seção da página)
        w = ep.widthTw; h = ep.heightTw;
      } else if (isPaged && this.hfEdit && this.savedBody) {
        // edição de HF: usa a geometria SALVA do corpo (preserva paisagem etc.)
        const sp = this.sectPrForSavedPage(i);
        w = sp.pageWidthTwips; h = sp.pageHeightTwips;
      } else if (isPaged && this.sectionStarts.length > 0) {
        const sp = this.sectPrAt(this.pageSections[i] ?? 0);
        w = sp.pageWidthTwips; h = sp.pageHeightTwips;
      }
      return { wPx: `${Math.round(w * cssScale)}px`, hPx: `${Math.round(h * cssScale)}px` };
    };

    // REUSA os elementos <canvas> existentes quando a estrutura não mudou.
    // Recriar canvas a cada refresh destruía o alvo do dblclick entre os dois
    // cliques → o browser nunca disparava dblclick (entrada no HF falhava).
    const sameCount = this.canvases.length === count;
    const sameSizes = sameCount && this.canvases.every((c, i) => {
      const { wPx, hPx } = cssOf(i);
      return c.style.width === wPx && c.style.height === hPx;
    });
    if (sameCount && sameSizes) {
      // só limpa os buffers p/ repintura sob demanda (mantém identidade do DOM);
      // as não alocadas já estão em 1×1 (documento de 1000 páginas: não mexe nelas)
      for (const i of this.allocatedPages) { const c = this.canvases[i]; if (c) { c.width = 1; c.height = 1; } }
      this.allocatedPages.clear();
      void dpr;
      return;
    }

    this.container.replaceChildren();
    this.canvases = [];
    this.allocatedPages.clear();
    this.engPageCache.clear();
    for (let i = 0; i < count; i++) {
      const { wPx, hPx } = cssOf(i);
      const c = document.createElement('canvas');
      c.className = 'page';
      // o buffer real é alocado sob demanda (virtualização) — só o CSS aqui
      c.width = 1;
      c.height = 1;
      c.style.width = wPx;
      c.style.height = hPx;
      this.container.append(c);
      this.canvases.push(c);
    }
    void dpr;
  }

  /** Páginas com buffer alocado e pintado (virtualização para zoom alto). */
  private allocatedPages = new Set<number>();
  private scrollPaintQueued = false;

  /** Fator de buffer: dpr, limitado para o canvas não passar de 4096px. */
  private bufferScaleFor(canvas: HTMLCanvasElement): number {
    const dpr = window.devicePixelRatio || 1;
    const cssW = parseFloat(canvas.style.width) || 794;
    const cssH = parseFloat(canvas.style.height) || 1123;
    // limites REAIS do Chromium: ~16384px por dimensão e área máx 16384².
    // O cap antigo de 4096 derrubava a resolução das visões CONTÍNUAS (Web/
    // Leitura usam UMA tela com a altura do doc inteiro) → upscale → embaçado.
    const MAX_DIM = 16384, MAX_AREA = 16384 * 16384;
    return Math.min(dpr, MAX_DIM / cssW, MAX_DIM / cssH, Math.sqrt(MAX_AREA / (cssW * cssH)));
  }

  /** Pinta a CAMADA de header/footer/notas — chamada ANTES do corpo, para que
   *  conteúdo behindDoc (capa full-bleed, barras) fique ATRÁS do texto e os
   *  campos do corpo por cima. O HF que não está em foco fica esmaecido. */
  private paintHfLayer(
    ctxs: (CanvasRenderingContext2D | null)[], scales: number[], dpr: number,
  ): void {
    const fullDoc = this.fullDoc;
    if (!(this.view === 'print' && fullDoc && !this.hfEdit)) return;
    for (let pg = 0; pg < ctxs.length; pg++) {
      const ctx = ctxs[pg];
      if (!ctx) continue;
      const scale = scales[pg]!;
      const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
      const section = this.sectionStarts[sIdx]?.section ?? fullDoc.sections[0];
      const sp = this.sectPrAt(sIdx);
      const grey = this.pageDark ? '#9aa0a6' : '#555';
      if (section) {
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        // Word esmaece o HF que NÃO está em foco. Na visão normal ambos ficam
        // esmaecidos; ao capturar o snapshot da edição, o HF ativo é suprimido
        // (pintado por cima em foco) e o resto sai CHEIO.
        // ao capturar o snapshot do corpo (edição HF), suprime AMBOS os HF.
        const header2 = (pg === 0 && sp.titlePg) ? section.headers.first : section.headers.default;
        if (header2?.length && !this.hfCapturing) {
          ctx.save(); ctx.globalAlpha = this.printRender ? 1 : HF_DIM_ALPHA;
          this.paintHf(ctx, scale, header2, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg, grey, sp);
          ctx.restore();
        }
        const footer2 = (pg === 0 && sp.titlePg) ? section.footers.first : section.footers.default;
        if (footer2?.length && !this.hfCapturing) {
          const fTop = sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720) - this.measureHfHeight(footer2, colW);
          ctx.save(); ctx.globalAlpha = this.printRender ? 1 : HF_DIM_ALPHA;
          this.paintHf(ctx, scale, footer2, sp.marginLeftTwips, fTop, colW, pg, grey, sp);
          ctx.restore();
        }
      }
      if (sp.cols?.sep && sp.cols.count > 1) {
        const cc = this.colContentOnPage(pg, sp);
        if (cc) {
          ctx.strokeStyle = this.pageDark ? '#5f6368' : '#bdbdbd';
          ctx.lineWidth = Math.max(1, dpr * 0.75);
          for (let i = 0; i < cc.n - 1; i++) {
            if (!cc.hasContent[i + 1]) continue;
            const xs = (cc.origin(i + 1) - cc.gap / 2) * scale;
            ctx.beginPath();
            ctx.moveTo(xs, sp.marginTopTwips * scale);
            ctx.lineTo(xs, cc.maxBottom * scale);
            ctx.stroke();
          }
        }
      }
      const hits = this.footnoteHits.filter((h) => h.page === pg);
      if (hits.length && fullDoc.footnotes.size) {
        let fy = sp.pageHeightTwips - sp.marginBottomTwips - hits.length * 260 - 120;
        ctx.strokeStyle = grey;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.beginPath();
        ctx.moveTo(sp.marginLeftTwips * scale, fy * scale);
        ctx.lineTo((sp.marginLeftTwips + 2880) * scale, fy * scale);
        ctx.stroke();
        fy += 220;
        ctx.font = `400 ${9 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
        ctx.fillStyle = this.pageDark ? '#c0c4c9' : '#333';
        for (const h of hits) {
          const paras = fullDoc.footnotes.get(h.id);
          const text = paras?.map((p) => p.runs.map((r) => r.text).join('')).join(' ').trim() ?? '';
          ctx.fillText(`${h.id}. ${text}`.slice(0, 160), sp.marginLeftTwips * scale, fy * scale);
          fy += 240;
        }
      }
    }
  }

  /** Garante buffer+pintura das páginas visíveis (e vizinhas); libera longe. */
  private ensureVisiblePainted(): void {
    if (this.canvases.length === 0) return;
    // fallback p/ contexto sem altura (preview/headless): trata como 1 tela
    const viewH = this.clientHeight || 900;
    const viewTop = this.scrollTop - viewH;        // 1 tela antes
    const viewBottom = this.scrollTop + viewH * 2; // 1 tela depois
    const need = new Set<number>();
    this.canvases.forEach((c, i) => {
      if (c.style.display === 'none') return; // páginas ocultas (fora do spread em Leitura)
      const top = c.offsetTop;
      const bottom = top + c.offsetHeight;
      if (bottom >= viewTop && top <= viewBottom) need.add(i);
    });
    let dirty = false;
    for (const i of need) {
      if (!this.allocatedPages.has(i)) {
        const c = this.canvases[i]!;
        const bs = this.bufferScaleFor(c);
        c.width = Math.round(parseFloat(c.style.width) * bs);
        c.height = Math.round(parseFloat(c.style.height) * bs);
        this.allocatedPages.add(i);
        dirty = true;
      }
    }
    // libera buffers de páginas muito longe (memória em zoom alto)
    for (const i of [...this.allocatedPages]) {
      if (!need.has(i)) {
        const c = this.canvases[i]!;
        const top = c.offsetTop;
        if (top > viewBottom + viewH * 3 || top + c.offsetHeight < viewTop - viewH * 3) {
          c.width = 1;
          c.height = 1;
          this.allocatedPages.delete(i);
        }
      }
    }
    if (dirty) this.paint(need);
  }

  private paint(filter?: Set<number>): void {
    if (!this.model || this.canvases.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const active = filter ?? this.allocatedPages;
    if (active.size === 0) return;
    if (this.eng) { this.paintEngine(active); return; }
    const sel = normalizeRange(this.range());
    const hasSel = this.hasSelection();

    const pageBg = this.pageDark ? '#1e1e1e' : '#ffffff';
    // escala por página: o buffer pode ter dpr limitado (virtualização)
    const scales: number[] = [];
    const ctxs: (CanvasRenderingContext2D | null)[] = this.canvases.map((c, i) => {
      if (!active.has(i) || c.width <= 1) { scales.push(0); return null; }
      const bs = c.width / (parseFloat(c.style.width) || c.width);
      scales.push(PX_PER_TWIP * this.zoom * bs);
      const ctx = c.getContext('2d')!;
      // reamostragem de alta qualidade — imagens raster reduzidas (ex.: logos
      // 1800px exibidos a ~380px) serrilham com o 'low' padrão do canvas.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, c.width, c.height);
      // durante a captura do snapshot da edição HF o fundo fica TRANSPARENTE
      // (só o corpo), p/ compor sobre a imagem behindDoc sem véu branco.
      if (!this.hfCapturing) {
        ctx.fillStyle = pageBg;
        ctx.fillRect(0, 0, c.width, c.height);
      }
      // edição de caixa de texto: TODO o render anterior (corpo ou HF) esmaecido
      // ao fundo; a caixa ativa é desenhada em foco por cima.
      if (this.tbEdit && (this.tbBgSnapshots[i]?.width ?? 0) > 1) {
        ctx.save();
        ctx.globalAlpha = HF_DIM_ALPHA;
        ctx.drawImage(this.tbBgSnapshots[i]!, 0, 0);
        ctx.restore();
      }
      // (o snapshot do corpo da edição HF é composto em paintHfEditCompose, DEPOIS
      //  do behindDoc — ver abaixo — para a ordem-z ficar correta como no Word.)
      return ctx;
    });
    const pgOf = (p: number) => Math.min(p, ctxs.length - 1);

    // edição de caixa de texto: repõe a REGIÃO da caixa em BRILHO TOTAL (o fundo
    // real, sem o texto antigo — suprimido no snapshot), para o texto ao vivo (na
    // COR REAL, ex.: branco na capa) ficar legível sobre o próprio fundo. O
    // texto/caret são pintados pelo laço de linhas normal (this.model = internos).
    if (this.tbEdit) {
      const tp = pgOf(this.tbEdit.pageIdx);
      const ctxT = ctxs[tp];
      const snap = this.tbBgSnapshots[tp];
      if (ctxT) {
        const scale = scales[tp]!;
        const r = this.tbEdit.rectTwips;
        const pad = 3 * dpr;
        const bx = r.x * scale - pad, by = r.y * scale - pad;
        const bw = r.w * scale + 2 * pad, bh = Math.max(r.h, 1) * scale + 2 * pad;
        ctxT.save();
        ctxT.beginPath(); ctxT.rect(bx, by, bw, bh); ctxT.clip();
        ctxT.fillStyle = pageBg; ctxT.fillRect(bx, by, bw, bh);
        if ((snap?.width ?? 0) > 1) ctxT.drawImage(snap!, 0, 0); // fundo real, cheio
        ctxT.restore();
        // a borda + alças são desenhadas pela seleção (activeFloat) mais abaixo.
      }
    }

    // edição de HF: composição com ordem-z correta (behindDoc atrás do corpo,
    // header E footer em foco). Substitui o realce de banda antigo.
    if (this.hfEdit && !this.tbEdit) this.paintHfEditCompose(ctxs, scales, dpr);

    // HF (capa/barras behindDoc) ANTES do corpo → o corpo/campos fica POR CIMA.
    // Em edição de HF/caixa a composição/snapshot já cuidam disso.
    if (!this.tbEdit && !this.hfEdit) this.paintHfLayer(ctxs, scales, dpr);

    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const pg = pgOf(line.page);
        const ctx = ctxs[pg];
        if (ctx) this.paintLine(ctx, pl, line, scales[pg]!, sel, hasSel);
      }
    }

    // tabelas
    const ink = this.pageDark ? '#e8eaed' : '#000';
    const gridColor = this.pageDark ? '#5f6368' : '#666';
    for (const tl of this.tableLayouts) {
      const tpg = pgOf(tl.page);
      const ctx = ctxs[tpg];
      if (!ctx) continue;
      const scale = scales[tpg]!;
      for (const sh of tl.cellShades) {
        ctx.fillStyle = this.inkColor(sh.hex);
        ctx.fillRect((tl.xTwips + sh.xTwips) * scale, (tl.yTwips + sh.yTwips) * scale, sh.wTwips * scale, sh.hTwips * scale);
      }
      // bordas reais por célula (tcBorders > tblBorders; sz em 1/8 pt; cor)
      const strokeEdge = (
        edge: { sizeEighthPt: number; color?: string; style: string } | undefined,
        ax: number, ay: number, bx: number, by: number,
      ) => {
        if (!edge) return;
        ctx.strokeStyle = edge.color ? this.inkColor(edge.color) : ink;
        ctx.lineWidth = Math.max(dpr * 0.75, (edge.sizeEighthPt / 8) * TWIPS_PER_PT * scale);
        if (edge.style === 'dashed') ctx.setLineDash([6 * dpr, 4 * dpr]);
        else if (edge.style === 'dotted') ctx.setLineDash([2 * dpr, 3 * dpr]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo((tl.xTwips + ax) * scale, (tl.yTwips + ay) * scale);
        ctx.lineTo((tl.xTwips + bx) * scale, (tl.yTwips + by) * scale);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      for (const cr of tl.cellRects) {
        strokeEdge(cr.edges.top, cr.x0, cr.y0, cr.x1, cr.y0);
        strokeEdge(cr.edges.bottom, cr.x0, cr.y1, cr.x1, cr.y1);
        strokeEdge(cr.edges.left, cr.x0, cr.y0, cr.x0, cr.y1);
        strokeEdge(cr.edges.right, cr.x1, cr.y0, cr.x1, cr.y1);
      }
      void gridColor;
      for (const cl of tl.cellLines) {
        const fontPx = deviceEmPt(cl.sizePt) * TWIPS_PER_PT * scale;
        ctx.font = `${cl.italic ? 'italic ' : ''}${cl.bold ? '700' : '400'} ${fontPx}px ${cl.family ?? DEFAULT_FONT}`;
        ctx.fillStyle = cl.color ? this.inkColor(cl.color) : ink;
        const bx = (tl.xTwips + cl.xTwips) * scale;
        const by = (tl.yTwips + cl.yTwips) * scale;
        ctx.fillText(cl.text, bx, by);
        if (cl.underline || cl.strike) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = Math.max(1, fontPx / 16);
          const w = ctx.measureText(cl.text).width;
          const yo = cl.underline ? fontPx * 0.12 : -fontPx * 0.28;
          ctx.beginPath(); ctx.moveTo(bx, by + yo); ctx.lineTo(bx + w, by + yo); ctx.stroke();
        }
      }
    }

    // letras capitulares (drop caps) — desenhadas como float
    for (const dc of this.dropCapFloats) {
      const dpg = pgOf(dc.page);
      const ctx = ctxs[dpg];
      if (!ctx) continue;
      const scale = scales[dpg]!;
      ctx.font = `${dc.italic ? 'italic ' : ''}${dc.bold ? '700' : '400'} ` +
        `${deviceEmPt(dc.sizePt) * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = this.inkColor(dc.color);
      // baseline: base da zona de K linhas (a letra "desce" pelas linhas)
      const baseline = dc.yTopTwips + dc.kPitch - dc.sizePt * 0.25 * TWIPS_PER_PT;
      ctx.fillText(dc.text, dc.xTwips * scale, baseline * scale);
    }

    // imagens flutuantes (ancoradas ao parágrafo)
    for (const f of this.floatImages) {
      const pl = this.layoutCache[f.para];
      const first = pl?.lines[0];
      if (!first || !f.run.image) continue;
      const fpg = pgOf(first.page);
      const ctx = ctxs[fpg];
      if (!ctx) continue;
      const scale = scales[fpg]!;
      const img = f.run.image;
      const bmp = this.bitmapFor(img);
      const x = (first.xTwips + (img.offsetXTwips ?? 0)) * scale;
      const yPx = (first.yTwips + (img.offsetYTwips ?? 0)) * scale;
      if (bmp) ctx.drawImage(bmp, x, yPx, img.widthTwips * scale, img.heightTwips * scale);
    }

    // caixas de texto flutuantes do CORPO (ex.: título/campos da CAPA). As
    // imagens já vão acima; aqui só as caixas de texto — senão a capa fica sem
    // conteúdo. Em edição de HF/caixa o corpo vem do snapshot, então não repete.
    if (!this.hfEdit && !this.tbEdit && this.model) {
      const inkTb = this.pageDark ? '#e3e3e3' : '#1f1f1f';
      this.model.paragraphs.forEach((p, pi) => {
        if (!p.runs.some((r) => r.textbox)) return;
        const first = this.layoutCache[pi]?.lines[0];
        if (!first) return;
        const fpg = pgOf(first.page);
        const ctx = ctxs[fpg];
        if (!ctx) return;
        const scale = scales[fpg]!;
        const sp = this.sectPrAt(this.pageSections[fpg] ?? 0);
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        for (const r of p.runs) {
          if (!r.textbox) continue;
          if (r === this.tbSnapshotSuppress) continue; // caixa em edição: fora do snapshot
          const { x, y } = r.textbox.floating
            ? this.anchoredPos(r.textbox, sp.marginLeftTwips, first.yTwips, sp)
            : { x: sp.marginLeftTwips, y: first.yTwips };
          { const iw = this.tbInner(r.textbox, x, y, r.textbox.widthTwips || colW);
            this.paintHf(ctx, scale, r.textbox.paras, iw.x, iw.y, iw.w, fpg, inkTb, sp); }
        }
      });
    }

    // (a camada de header/footer/notas é pintada por paintHfLayer ANTES do
    //  corpo — ver a chamada acima; behindDoc precisa ficar atrás do texto.)

    this.paintFloatAndCaret(ctxs, scales, dpr, hasSel);
  }

  /** Alças do objeto flutuante selecionado + caret (os dois layouts). */
  private paintFloatAndCaret(
    ctxs: (CanvasRenderingContext2D | null)[], scales: number[], dpr: number, hasSel: boolean,
  ): void {
    const pgOf = (p: number) => Math.min(p, ctxs.length - 1);
    // seleção de objeto flutuante: contorno + 8 alças. Aparece p/ a imagem
    // selecionada E p/ a caixa em EDIÇÃO (redimensionamento coexiste com edição).
    if (this.floatSel || this.tbEdit) {
      const h = this.activeFloat();
      if (h) {
        const pg = pgOf(h.page);
        const ctx = ctxs[pg];
        if (ctx) {
          const scale = scales[pg]!;
          const x = h.rect.x * scale, y = h.rect.y * scale;
          const w = h.rect.w * scale, hh = h.rect.h * scale;
          ctx.save();
          ctx.strokeStyle = '#2b579a';
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = Math.max(1, dpr);
          ctx.strokeRect(x, y, w, hh);
          ctx.setLineDash([]);
          const hs = 6 * dpr;
          const pts: [number, number][] = [
            [x, y], [x + w / 2, y], [x + w, y], [x + w, y + hh / 2],
            [x + w, y + hh], [x + w / 2, y + hh], [x, y + hh], [x, y + hh / 2],
          ];
          ctx.fillStyle = '#ffffff';
          for (const [px, py] of pts) {
            ctx.fillRect(px - hs / 2, py - hs / 2, hs, hs);
            ctx.strokeRect(px - hs / 2, py - hs / 2, hs, hs);
          }
          ctx.restore();
        }
      }
    }

    // caret
    if (this.caretVisible && !this.printRender && this.view !== 'read' && !hasSel) {
      const line = this.lineOf(this.selection.focus);
      if (line) {
        const cpg = pgOf(line.page);
        const ctx = ctxs[cpg];
        if (ctx) {
          const scale = scales[cpg]!;
          const x = this.caretX(this.selection.focus, line) * scale;
          ctx.fillStyle = this.pageDark ? '#e8eaed' : '#000';
          ctx.fillRect(x, line.yTwips * scale, Math.max(1, dpr), line.heightTwips * scale);
        }
      }
    }
  }

  private paintLine(
    ctx: CanvasRenderingContext2D,
    pl: ParaLayout,
    line: LaidLine,
    scale: number,
    sel: DocRange,
    hasSel: boolean,
  ): void {
    const para = this.model!.paragraphs[line.para]!;
    const st = this.styleOf(para);

    // sombreamento e borda do parágrafo (direto OU herdado do estilo —
    // dividers de títulos, barra da citação, caixa do código)
    const effBorders = para.props.borders ?? st?.borders;
    const effShading = para.props.shadingHex ?? st?.shadingHex;
    const effIndentL = para.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0;
    const effIndentR = para.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
    if (effShading || para.props.boxBorder || effBorders) {
      const s = this.sect();
      const marginL = (this.view === 'print' || this.view === 'read') ? s.marginLeftTwips : 600;
      const colX = marginL + effIndentL;
      const colW = this.contentWidthTwips() - effIndentL - effIndentR;
      if (effShading) {
        // o app de referência preenche o fundo ATÉ as bordas — inclui a zona w:space
        const bd = effBorders;
        const isFirstL = line.rich.start === 0;
        const isLastL = line.rich.end === pl.charAdvances.length;
        const exL = (bd?.left?.spacePt ?? 0) * TWIPS_PER_PT;
        const exR = (bd?.right?.spacePt ?? 0) * TWIPS_PER_PT;
        const exT = isFirstL ? (bd?.top?.spacePt ?? 0) * TWIPS_PER_PT : 0;
        const exB = isLastL ? (bd?.bottom?.spacePt ?? 0) * TWIPS_PER_PT : 0;
        ctx.fillStyle = this.inkColor(effShading);
        ctx.fillRect(
          (colX - exL) * scale,
          (line.yTwips - exT) * scale,
          (colW + exL + exR) * scale,
          (line.heightTwips + exT + exB) * scale,
        );
      }
      if (effBorders || para.props.boxBorder) {
        const isFirst = line.rich.start === 0;
        const isLast = line.rich.end === pl.charAdvances.length;
        const fallback = para.props.boxBorder && !effBorders
          ? { style: 'single', sizeEighthPt: 4, spacePt: 1 }
          : undefined;
        const b = effBorders ?? {
          top: fallback, bottom: fallback, left: fallback, right: fallback,
        };
        const stroke = (
          e: { sizeEighthPt: number; color?: string; style: string; spacePt: number } | undefined,
          ax: number, ay: number, bx: number, by: number,
        ) => {
          if (!e) return;
          ctx.strokeStyle = e.color ? `#${e.color}` : this.pageDark ? '#e8eaed' : '#000';
          ctx.lineWidth = Math.max(1, (e.sizeEighthPt / 8) * TWIPS_PER_PT * scale);
          if (e.style === 'dashed') ctx.setLineDash([8, 5]);
          else if (e.style === 'dotted') ctx.setLineDash([2, 4]);
          else ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.setLineDash([]);
        };
        // w:space afasta a borda do texto (em pontos)
        const spL = (b.left?.spacePt ?? 0) * TWIPS_PER_PT;
        const spR = (b.right?.spacePt ?? 0) * TWIPS_PER_PT;
        const spT = (b.top?.spacePt ?? 0) * TWIPS_PER_PT;
        const spB = (b.bottom?.spacePt ?? 0) * TWIPS_PER_PT;
        const x0 = (colX - spL) * scale;
        const x1 = (colX + colW + spR) * scale;
        const y0 = (line.yTwips - (isFirst ? spT : 0)) * scale;
        const y1 = (line.yTwips + line.heightTwips + (isLast ? spB : 0)) * scale;
        stroke(b.left, x0, y0, x0, y1);
        stroke(b.right, x1, y0, x1, y1);
        if (isFirst) stroke(b.top, x0, y0, x1, y0);
        if (isLast) stroke(b.bottom, x0, y1, x1, y1);
      }
    }

    // seleção (fundo azul)
    if (hasSel && line.para >= sel.start.para && line.para <= sel.end.para) {
      const from = Math.max(line.rich.start, line.para === sel.start.para ? sel.start.offset : 0);
      const to = Math.min(line.rich.end, line.para === sel.end.para ? sel.end.offset : line.rich.end);
      if (to > from) {
        const x1 = this.caretX({ para: line.para, offset: from }, line);
        const x2 = this.caretX({ para: line.para, offset: to }, line);
        ctx.fillStyle = 'rgba(58,114,196,0.35)';
        ctx.fillRect(x1 * scale, line.yTwips * scale, (x2 - x1) * scale, line.heightTwips * scale);
      }
    }

    // marcador de lista
    if (line.marker) {
      ctx.font = `${11 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = this.pageDark ? '#e8eaed' : '#000';
      ctx.fillText(line.marker.text, line.marker.xTwips * scale, line.baselineTwips * scale);
    }

    // texto, caractere a caractere (posições NOSSAS, não do canvas)
    let x = line.xTwips;
    for (const seg of line.rich.segments) {
      const span = pl.spans[seg.spanIndex]!;
      const run = para.runs[span.runIndex ?? seg.spanIndex];
      const props = run?.props;

      // inline customizado: ocupa um único U+FFFC no modelo/layout e delega
      // a pintura ao plugin. Sem plugin, desenha fallback textual legível.
      if (run?.custom) {
        const family = this.familyFor(span.family);
        const fontPx = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
        const variant = span.variant;
        ctx.font = `${variant === 'italic' || variant === 'boldItalic' ? 'italic ' : ''}` +
          `${variant === 'bold' || variant === 'boldItalic' ? '700' : '400'} ${fontPx}px ${family}`;
        const ink = this.inkColor(props?.color ?? st?.color);
        ctx.fillStyle = ink;
        const globalStart = pl.spanCharStart[seg.spanIndex]! + seg.start;
        let widthTwips = 0;
        for (let i = 0; i < seg.end - seg.start; i++) {
          widthTwips += pl.charAdvances[globalStart + i]!;
        }
        const renderer = this.inlineRenderers.get(run.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText;
        const font = this.fonts!.resolve(span.family, variant);
        const measureText = (text: string): number => {
          const chars = Array.from(text);
          let width = 0;
          for (let i = 0; i < chars.length; i++) {
            const cp = chars[i]!.codePointAt(0)!;
            width += font.advanceTwips(cp, span.sizePt);
            const next = chars[i + 1]?.codePointAt(0);
            if (next !== undefined) width += font.kernTwips(cp, next, span.sizePt);
          }
          return width;
        };
        if (renderer?.draw) {
          const drawContext: UniversalWriteInlineDrawContext = {
            data: run.custom.data,
            fallbackText,
            props: run.props,
            sizePt: span.sizePt,
            measureText,
            ctx,
            xTwips: x,
            yTwips: line.yTwips,
            baselineTwips: line.baselineTwips,
            widthTwips,
            heightTwips: line.heightTwips,
            scale,
            dark: this.pageDark,
            color: ink,
          };
          renderer.draw(drawContext);
        } else {
          ctx.fillText(fallbackText, x * scale, line.baselineTwips * scale);
        }
        x += widthTwips;
        continue;
      }

      // run de imagem inline
      if (run?.image) {
        const img = run.image;
        const bmp = this.bitmapFor(img);
        const wPx = img.widthTwips * scale;
        const hPx = img.heightTwips * scale;
        const yPx = (line.baselineTwips - img.heightTwips) * scale;
        if (bmp) ctx.drawImage(bmp, x * scale, yPx, wPx, hPx);
        else {
          ctx.strokeStyle = '#bbb';
          ctx.strokeRect(x * scale, yPx, wPx, hPx);
        }
        x += img.widthTwips;
        continue;
      }
      const family = this.familyFor(span.family);
      // desenha no MESMO em de dispositivo usado na medição (11 → 11.04pt)
      const fontPx = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
      const variant = span.variant;
      ctx.font = `${variant === 'italic' || variant === 'boldItalic' ? 'italic ' : ''}` +
        `${variant === 'bold' || variant === 'boldItalic' ? '700' : '400'} ${fontPx}px ${family}`;
      const color = props?.color ?? st?.color;
      ctx.fillStyle = this.inkColor(color);

      const baseShift =
        props?.vertAlign === 'superscript' ? -span.sizePt * 0.35 * TWIPS_PER_PT :
        props?.vertAlign === 'subscript' ? span.sizePt * 0.14 * TWIPS_PER_PT : 0;

      const globalStart = pl.spanCharStart[seg.spanIndex]! + seg.start;
      const segX0 = x;
      for (let i = 0; i < seg.end - seg.start; i++) {
        const gi = globalStart + i;
        const ch = span.text[seg.start + i]!;
        let a = pl.charAdvances[gi]!;
        if (line.justifyExtraPerSpace && ch === ' ') a += line.justifyExtraPerSpace;
        if (props?.highlight) {
          ctx.save();
          const hl = HIGHLIGHTS[props.highlight] ?? '#ffff00';
          ctx.fillStyle = this.inkColor(hl.slice(1));
          ctx.fillRect(x * scale, line.yTwips * scale, a * scale, line.heightTwips * scale);
          ctx.restore();
        }
        // sombreado cinza de CAMPO (como o app de referência mostra campos)
        if (run?.field && !this.printRender) {
          ctx.save();
          ctx.fillStyle = this.pageDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
          ctx.fillRect(x * scale, line.yTwips * scale, a * scale, line.heightTwips * scale);
          ctx.restore();
        }
        // anotação (comentário): destaque âmbar translúcido, como no app de referência
        if (props?.commentIds?.length && !this.printRender) {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 187, 0, 0.28)';
          ctx.fillRect(x * scale, line.yTwips * scale, a * scale, line.heightTwips * scale);
          ctx.restore();
        }
        // leader pontilhado do tab (sumário)
        if (ch === '\t' && pl.tabLeaders?.get(gi)) {
          ctx.save();
          ctx.fillStyle = this.pageDark ? '#9aa0a6' : '#666';
          const dotFont = `400 ${span.sizePt * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
          ctx.font = dotFont;
          const step = 90; // twips por ponto
          for (let dx = 60; dx < a - 40; dx += step) {
            ctx.fillText('.', (x + dx) * scale, (line.baselineTwips + baseShift) * scale);
          }
          ctx.restore();
        }
        if (ch !== ' ' || this.showMarks) {
          const shown = this.showMarks && ch === ' ' ? '·' : ch;
          // posição encaixada na grade de 1/600" relativa ao início da linha,
          // como o app de referência faz (cumulativo arredondado a unidades de 2.4 twips)
          const rel = x - line.xTwips;
          const xSnap = line.xTwips + Math.round(rel / 2.4) * 2.4;
          ctx.fillText(shown, xSnap * scale, (line.baselineTwips + baseShift) * scale);
        }
        x += a;
      }
      // sublinhado/tachado por segmento (estilos do app de referência).
      // underline/strike podem vir do ESTILO do parágrafo, não só do run direto.
      const effUnderline = props?.underline || st?.underline;
      const effStrike = props?.strike || st?.strike;
      if (effUnderline || effStrike || props?.doubleStrike) {
        ctx.strokeStyle = ctx.fillStyle as string;
        const w = x - segX0;
        const baseW = Math.max(1, fontPx / 16);
        const drawLine = (yOff: number, lw: number, dash: number[] = []) => {
          ctx.lineWidth = lw;
          ctx.setLineDash(dash);
          ctx.beginPath();
          ctx.moveTo(segX0 * scale, (line.baselineTwips + yOff) * scale);
          ctx.lineTo((segX0 + w) * scale, (line.baselineTwips + yOff) * scale);
          ctx.stroke();
          ctx.setLineDash([]);
        };
        const drawWave = (yOff: number, lw: number) => {
          ctx.lineWidth = lw;
          ctx.beginPath();
          const amp = 0.6 * baseW;
          const period = Math.max(4, fontPx / 6);
          for (let px = 0; px <= w * scale; px += 1) {
            const yy = (line.baselineTwips + yOff) * scale + Math.sin((px / period) * Math.PI * 2) * amp;
            if (px === 0) ctx.moveTo(segX0 * scale, yy);
            else ctx.lineTo(segX0 * scale + px, yy);
          }
          ctx.stroke();
        };
        if (effUnderline) {
          ctx.strokeStyle = props?.underlineColor ? this.inkColor(props.underlineColor) : (ctx.fillStyle as string);
          const yU = 40;
          switch (props?.underlineStyle) {
            case 'double': drawLine(yU, baseW); drawLine(yU + baseW * 2.4, baseW); break;
            case 'thick': drawLine(yU + baseW, baseW * 2.2); break;
            case 'dotted': drawLine(yU, baseW, [baseW, baseW * 1.6]); break;
            case 'dash': drawLine(yU, baseW, [baseW * 4, baseW * 2.5]); break;
            case 'wave': drawWave(yU, baseW); break;
            default: drawLine(yU, baseW);
          }
          ctx.strokeStyle = ctx.fillStyle as string;
        }
        if (effStrike) drawLine(-span.sizePt * 0.25 * TWIPS_PER_PT, baseW);
        if (props?.doubleStrike) {
          const yS = -span.sizePt * 0.25 * TWIPS_PER_PT;
          drawLine(yS - baseW * 1.3, baseW);
          drawLine(yS + baseW * 1.3, baseW);
        }
      }
    }

    // marca de parágrafo ¶
    if (this.showMarks && line.rich.end === pl.charAdvances.length) {
      ctx.font = `${11 * TWIPS_PER_PT * scale}px ${DEFAULT_FONT_CSS}`;
      ctx.fillStyle = '#888';
      ctx.fillText('¶', (x + 20) * scale, line.baselineTwips * scale);
    }
  }

  // ───────────────────────── exportação para PDF ─────────────────────────
  private pdfImgCache = new WeakMap<object, PdfImage | null>();

  private pdfColor(hex?: string): PdfColor {
    return hex ? hexColor(hex) : [0, 0, 0];
  }

  /**
   * Gera o PDF pelo motor de layout do Word (@universal-office/docx-layout —
   * o mesmo validado contra os PDFs do Word no corpus e no oráculo): o
   * documento ATUAL (com as edições) é serializado, diagramado e pintado.
   * Fontes: as que o editor já resolveu (arquivo da fonte; sem licença de
   * incorporação, a substituta métrico-compatível), embutidas no documento e as
   * que o motor pedir na 1ª passada (tema, padrão, substitutas do Word).
   * Se o motor falhar, cai no PDF do layout do canvas (exportPdfCanvas).
   */
  async exportPdf(): Promise<Uint8Array> {
    if (!this.model || !this.fonts) throw new Error('document not loaded');
    try {
      return await this.exportPdfEngine();
    } catch (e) {
      console.warn('[universal-write] motor de layout falhou no PDF; usando o layout do canvas', e);
      return this.exportPdfCanvas();
    }
  }

  private async exportPdfEngine(): Promise<Uint8Array> {
    await this.settleDocumentFonts();
    await this.preparePdfFonts();
    // sem edições: os bytes/documento ORIGINAIS (o .docx regravado pelo modelo
    // de edição ainda perde propriedades que o motor usa)
    // com edições: o estado VIVO (o mesmo que o canvas pinta) — o .docx
    // regravado pelo modelo de edição ainda perde propriedades que o motor usa
    const pristine = this.editsSinceLoad === 0 && !!this.loadedBytes;
    const pkg = pristine ? DocxPackage.load(this.loadedBytes!) : this.pkg;
    if (!pristine) this.syncRunRPr(this.model!.paragraphs);
    const full = pristine ? readFullDocument(pkg!) : this.liveEngineDoc().full;
    let embedded: ReturnType<typeof readEmbeddedFonts> = [];
    try { embedded = pkg ? readEmbeddedFonts(pkg) : []; } catch { /* fontes embutidas ilegíveis */ }
    try { await loadHyphenation(hyphenationLangs(full)); } catch { /* sem padrões: sem hifenização */ }
    const layout = (): ReturnType<typeof layoutDocument> => {
      const prov = withEmbeddedFonts(this.engineFontProvider(missing), embedded, (b) => new SfntFont(b));
      return layoutDocument(full, prov, ENGINE_LAYOUT_OPTS);
    };
    // 1ª passada registra as famílias/variantes que o motor pediu e o editor
    // ainda não tinha; resolve-as (rede/SO) e diagrama de novo
    const missing = new Map<string, Set<FontVariant>>();
    let res = layout();
    if (missing.size && await this.loadEngineFonts(missing)) {
      missing.clear();
      res = layout();
    }
    return renderPdf(res);
  }

  /** Provedor de faces do motor sobre o Registry do editor (só faces com ARQUIVO).
   *  Cada face guarda a família CSS (FontFace carregada) que o canvas usa. */
  private engineFontProvider(
    missing: Map<string, Set<FontVariant>>, cache = new Map<string, EngineFontFace | null>(),
  ): EngineFontProvider {
    const note = (family: string, v: FontVariant) => {
      let s = missing.get(family);
      if (!s) missing.set(family, (s = new Set()));
      s.add(v);
    };
    return {
      face: (family, bold, italic) => {
        const key = `${family}|${bold ? 1 : 0}${italic ? 1 : 0}`;
        if (cache.has(key)) return cache.get(key)!;
        const want: FontVariant = bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
        let out: EngineFontFace | null = null;
        const set = this.fonts!.get(family);
        if (!set) note(family, want);
        else {
          if (!set[want]) note(family, want);
          for (const v of [want, bold ? 'bold' : 'regular', italic ? 'italic' : 'regular', 'regular'] as FontVariant[]) {
            let font = set[v];
            if (!font) continue;
            let file = this.fontFiles.get(font);
            let fam = family;
            if (!file) {
              // licença não deixa embutir: a substituta métrico-compatível (mede e pinta igual)
              const sub = METRIC_SUBSTITUTES[family.toLowerCase()];
              const ss = sub ? this.fonts!.get(sub) : undefined;
              const f2 = ss?.[v] ?? ss?.regular;
              const file2 = f2 ? this.fontFiles.get(f2) : undefined;
              if (!f2 || !file2) { if (sub) note(family, v); continue; }
              font = f2; file = file2; fam = sub!;
            }
            const vb = v === 'bold' || v === 'boldItalic', vi = v === 'italic' || v === 'boldItalic';
            out = {
              key: `${fam}|${v}`, family: fam, font, bytes: file.bytes, bold, italic,
              ...(bold && !vb ? { synthBold: true } : {}),
              ...(italic && !vi ? { synthItalic: true } : {}),
            };
            const css = file.name === DEFAULT_FONT ? DEFAULT_FONT_CSS : `${cssFamily(file.name)}, ${DEFAULT_FONT_CSS}`;
            this.engFaceCss.set(out, { family: css, weight: vb ? 700 : 400, italic: vi });
            break;
          }
        }
        cache.set(key, out);
        return out;
      },
    };
  }

  /** Resolve (com arquivo) as famílias/variantes que o motor pediu; true se algo mudou. */
  private async loadEngineFonts(missing: Map<string, Set<FontVariant>>): Promise<boolean> {
    const families = [...missing.keys()].filter((f) => !this.loadedFamilyNames.has(f));
    if (!families.length) return false;
    await this.fontResolver.resolveWithFile(families);
    await Promise.all(families.flatMap((f) => {
      const r = this.fontResolver.getWithFile(f);
      return r ? [...missing.get(f)!].filter((v) => !r.faces[v]).map((v) => this.fontResolver.loadFace(r, v)) : [];
    }));
    let changed = false;
    for (const f of families) {
      this.appliedFonts.delete(f); // reaplica com as variantes que acabaram de chegar
      if (this.applyResolvedFont(f)) changed = true;
    }
    if (changed) await this.preparePdfFonts();
    return changed;
  }

  /**
   * PDF a partir do layout do CANVAS (layoutCache, tabelas, imagens) — o
   * caminho antigo, mantido como reserva do motor. Cada glifo é posicionado
   * onde o editor o desenha.
   */
  private async exportPdfCanvas(): Promise<Uint8Array> {
    if (!this.eng) return this.exportPdfCanvasLegacy();
    if (this.cellEdit) this.exitCell();
    this.forceLegacy++;
    try {
      this.layout();
      return await this.exportPdfCanvasLegacy();
    } finally {
      this.forceLegacy--;
      this.refresh();
    }
  }

  private async exportPdfCanvasLegacy(): Promise<Uint8Array> {
    if (!this.model || !this.fonts) throw new Error('document not loaded');
    // imagens em páginas nunca pintadas (virtualização) não estão decodificadas;
    // decodifica todas antes para não exportar placeholders.
    await this.ensureImagesDecoded();
    const T = TWIPS_PER_PT;
    const doc = new PdfDocument({ compress: true });
    this.pdfImgCache = new WeakMap();
    await this.settleDocumentFonts();
    await this.preparePdfFonts();
    const cache = new Map<LayoutFont, EmbeddedFont>();
    const emb = (family: string | undefined, variant: FontVariant): EmbeddedFont => {
      let sf = this.fonts!.resolve(family, variant);
      let file = this.fontFiles.get(sf);
      if (!file) {
        // sem arquivo embutível (licença que não permite embutir): a substituta métrico-compatível, senão o padrão — sempre
        // com as MÉTRICAS do arquivo embutido (glifos e advances coerentes)
        const sub = family ? METRIC_SUBSTITUTES[family.toLowerCase()] : undefined;
        sf = this.fonts!.resolve(sub && this.fonts!.get(sub) ? sub : DEFAULT_FONT, variant);
        file = this.fontFiles.get(sf);
      }
      let e = cache.get(sf);
      if (!e) {
        if (!file) throw new Error('font has no bytes to embed in the PDF');
        const { name, bytes } = file;
        e = doc.embedFont(`${name}-${variant}`, bytes, {
          unitsPerEm: sf.metrics.unitsPerEm,
          ascender: sf.metrics.ascender,
          descender: sf.metrics.descender,
          glyphId: (cp) => sf.glyphId(cp),
          advanceWidth: (g) => sf.advanceWidth(g),
        });
        cache.set(sf, e);
      }
      return e;
    };

    // páginas com a geometria de cada seção
    const pages: PdfPage[] = [];
    const total = Math.max(1, this.pageCount);
    for (let pg = 0; pg < total; pg++) {
      const sp = this.sectPrAt(this.pageSections[pg] ?? 0);
      pages.push(doc.addPage(sp.pageWidthTwips / T, sp.pageHeightTwips / T));
    }

    // cabeçalhos/rodapés (+ timbrado/capa behindDoc) ANTES do corpo → a imagem
    // full-bleed do header fica ATRÁS dos campos, como no canvas (paintHfLayer).
    if (this.view === 'print' && this.fullDoc) {
      for (let pg = 0; pg < pages.length; pg++) {
        const page = pages[pg]!;
        const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
        const section = this.sectionStarts[sIdx]?.section ?? this.fullDoc.sections[0];
        const sp = this.sectPrAt(sIdx);
        if (section) {
          const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
          const header = (pg === 0 && sp.titlePg) ? section.headers.first : section.headers.default;
          if (header?.length) this.pdfPaintHf(doc, page, emb, header, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg, sp);
          const footer = (pg === 0 && sp.titlePg) ? section.footers.first : section.footers.default;
          if (footer?.length) this.pdfPaintHf(doc, page, emb, footer, sp.marginLeftTwips, sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720), colW, pg, sp);
        }
        // separador entre colunas (w:sep) — só onde a coluna direita tem conteúdo
        if (sp.cols?.sep && sp.cols.count > 1) {
          const cc = this.colContentOnPage(pg, sp);
          if (cc) for (let i = 0; i < cc.n - 1; i++) {
            if (!cc.hasContent[i + 1]) continue;
            const xs = (cc.origin(i + 1) - cc.gap / 2) / T;
            page.line(xs, sp.marginTopTwips / T, xs, cc.maxBottom / T, [0.74, 0.74, 0.74], 0.6);
          }
        }
        const hits = this.footnoteHits.filter((h) => h.page === pg);
        if (hits.length && this.fullDoc.footnotes.size) {
          let fy = sp.pageHeightTwips - sp.marginBottomTwips - hits.length * 260 - 120;
          page.line(sp.marginLeftTwips / T, fy / T, (sp.marginLeftTwips + 2880) / T, fy / T, [0.33, 0.33, 0.33], 0.75);
          fy += 220;
          for (const h of hits) {
            const paras = this.fullDoc.footnotes.get(h.id);
            const text = paras?.map((p) => p.runs.map((r) => r.text).join('')).join(' ').trim() ?? '';
            this.pdfGlyphsAt(page, emb, DEFAULT_FONT, 'regular', 9, [0.2, 0.2, 0.2], `${h.id}. ${text}`.slice(0, 160), sp.marginLeftTwips, fy);
            fy += 240;
          }
        }
      }
    }
    // corpo: linha a linha (mesma matemática do paintLine)
    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const page = pages[line.page];
        if (page) this.pdfPaintLine(doc, page, emb, pl, line);
      }
    }
    // tabelas
    for (const tl of this.tableLayouts) {
      const page = pages[tl.page];
      if (page) this.pdfPaintTable(doc, page, emb, tl);
    }
    // letras capitulares
    for (const dc of this.dropCapFloats) {
      const page = pages[dc.page];
      if (!page) continue;
      const variant: FontVariant = dc.bold && dc.italic ? 'boldItalic' : dc.bold ? 'bold' : dc.italic ? 'italic' : 'regular';
      const baseline = dc.yTopTwips + dc.kPitch - dc.sizePt * 0.25 * T;
      this.pdfGlyphsAt(page, emb, DEFAULT_FONT, variant, dc.sizePt, this.pdfColor(dc.color), dc.text, dc.xTwips, baseline);
    }
    // imagens flutuantes do corpo
    for (const f of this.floatImages) {
      const pl = this.layoutCache[f.para];
      const first = pl?.lines[0];
      if (!first || !f.run.image) continue;
      const page = pages[first.page];
      if (!page) continue;
      const img = f.run.image;
      this.pdfImage(doc, page, img,
        (first.xTwips + (img.offsetXTwips ?? 0)) / T, (first.yTwips + (img.offsetYTwips ?? 0)) / T,
        img.widthTwips / T, img.heightTwips / T);
    }
    // caixas de texto flutuantes do CORPO (ex.: campos da capa) — POR CIMA da
    // imagem behindDoc, como no canvas. Sem isto a capa saía sem os campos.
    if (this.model) {
      this.model.paragraphs.forEach((p, pi) => {
        if (!p.runs.some((r) => r.textbox)) return;
        const first = this.layoutCache[pi]?.lines[0];
        if (!first) return;
        const page = pages[first.page];
        if (!page) return;
        const sp = this.sectPrAt(this.pageSections[first.page] ?? 0);
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        for (const r of p.runs) {
          if (!r.textbox) continue;
          const { x, y } = r.textbox.floating
            ? this.anchoredPos(r.textbox, sp.marginLeftTwips, first.yTwips, sp)
            : { x: sp.marginLeftTwips, y: first.yTwips };
          { const iw = this.tbInner(r.textbox, x, y, r.textbox.widthTwips || colW);
            this.pdfPaintHf(doc, page, emb, r.textbox.paras, iw.x, iw.y, iw.w, first.page, sp); }
        }
      });
    }
    return doc.build();
  }

  /**
   * Exporta XPS reaproveitando o layout. Texto vai como <Glyphs UnicodeString>
   * (o leitor shape via CMap da fonte). Bordas/sombreado de tabela e imagens
   * ficam para uma versão futura — o foco aqui é texto + paginação corretos.
   */
  exportXps(): Uint8Array {
    // o XPS sai do layout legado do canvas (glifos/spans dele)
    return this.withLegacyLayout(() => this.exportXpsLegacy());
  }

  private exportXpsLegacy(): Uint8Array {
    if (!this.model || !this.fonts) throw new Error('document not loaded');
    const T = TWIPS_PER_PT;
    const pages: XpsPage[] = [];
    const total = Math.max(1, this.pageCount);
    for (let pg = 0; pg < total; pg++) {
      const sp = this.sectPrAt(this.pageSections[pg] ?? 0);
      pages.push({
        widthPt: sp.pageWidthTwips / T,
        heightPt: sp.pageHeightTwips / T,
        fills: [], lines: [], glyphs: [],
      });
    }
    const famOf = (family: string | undefined): string => this.fileFamilyFor(family);
    const colorOf = (hex: string | undefined): [number, number, number] => {
      if (!hex) return [0.13, 0.13, 0.13];
      const n = parseInt(hex, 16);
      return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
    };
    const emitParaLine = (
      page: XpsPage, pl: ParaLayout, line: LaidLine, runs: Run[],
    ): void => {
      const baselinePt = line.baselineTwips / T;
      for (const seg of line.rich.segments) {
        const span = pl.spans[seg.spanIndex];
        const run = runs[span?.runIndex ?? seg.spanIndex];
        if (!span) continue;
        const renderer = run?.custom
          ? this.inlineRenderers.get(run.custom.type)?.renderer
          : undefined;
        const txt = run?.custom
          ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText
          : span.text.slice(seg.start, seg.end);
        if (!txt.trim()) continue;
        page.glyphs.push({
          text: txt,
          xPt: (line.xTwips + seg.xTwips) / T,
          baselinePt,
          fontFamily: famOf(span.family),
          variant: span.variant === 'boldItalic' ? 'boldItalic'
            : span.variant === 'bold' ? 'bold'
            : span.variant === 'italic' ? 'italic' : 'regular',
          sizePt: span.sizePt,
          colorRgb: colorOf(run?.props.color),
        });
        // sublinhado simples (best-effort)
        if (run?.props.underline) {
          const w = Math.max(0.3, span.sizePt * 0.07);
          page.lines.push({
            ax: (line.xTwips + seg.xTwips) / T,
            ay: baselinePt + span.sizePt * 0.13,
            bx: (line.xTwips + seg.xTwips + seg.widthTwips) / T,
            by: baselinePt + span.sizePt * 0.13,
            widthPt: w,
            colorRgb: colorOf(run.props.color),
          });
        }
      }
    };
    // corpo
    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const para = this.model.paragraphs[line.para];
        if (!para) continue;
        const page = pages[line.page];
        if (page) emitParaLine(page, pl, line, para.runs);
      }
    }
    // tabelas — sombreado + texto das células + bordas das células (best-effort)
    for (const tl of this.tableLayouts) {
      const page = pages[tl.page];
      if (!page) continue;
      for (const sh of tl.cellShades) {
        page.fills.push({
          xPt: (tl.xTwips + sh.xTwips) / T,
          yPt: (tl.yTwips + sh.yTwips) / T,
          wPt: sh.wTwips / T,
          hPt: sh.hTwips / T,
          colorRgb: colorOf(sh.hex),
        });
      }
      for (const cr of tl.cellRects) {
        const x0 = (tl.xTwips + cr.x0) / T;
        const y0 = (tl.yTwips + cr.y0) / T;
        const x1 = (tl.xTwips + cr.x1) / T;
        const y1 = (tl.yTwips + cr.y1) / T;
        const e = (edge: { sizeEighthPt: number; color?: string; style: string } | undefined,
                   ax: number, ay: number, bx: number, by: number): void => {
          if (!edge) return;
          page.lines.push({
            ax, ay, bx, by,
            widthPt: Math.max(0.25, edge.sizeEighthPt / 8),
            colorRgb: colorOf(edge.color),
          });
        };
        e(cr.edges.top, x0, y0, x1, y0);
        e(cr.edges.bottom, x0, y1, x1, y1);
        e(cr.edges.left, x0, y0, x0, y1);
        e(cr.edges.right, x1, y0, x1, y1);
      }
      for (const cl of tl.cellLines) {
        const variant: XpsGlyphRun['variant'] = cl.bold && cl.italic ? 'boldItalic'
          : cl.bold ? 'bold' : cl.italic ? 'italic' : 'regular';
        page.glyphs.push({
          text: cl.text,
          xPt: (tl.xTwips + cl.xTwips) / T,
          baselinePt: (tl.yTwips + cl.yTwips) / T,
          fontFamily: famOf(cl.family),
          variant,
          sizePt: cl.sizePt,
          colorRgb: colorOf(cl.color),
        });
        if (cl.underline) {
          const wEm = Math.max(0.3, cl.sizePt * 0.07);
          page.lines.push({
            ax: (tl.xTwips + cl.xTwips) / T,
            ay: (tl.yTwips + cl.yTwips) / T + cl.sizePt * 0.13,
            bx: (tl.xTwips + cl.xTwips + cl.text.length * cl.sizePt * 0.5) / T,
            by: (tl.yTwips + cl.yTwips) / T + cl.sizePt * 0.13,
            widthPt: wEm,
            colorRgb: colorOf(cl.color),
          });
        }
      }
    }
    // cabeçalhos/rodapés (modo print) — laia o texto com a mesma matemática do paintHf
    if (this.view === 'print' && this.fullDoc) {
      for (let pg = 0; pg < pages.length; pg++) {
        const page = pages[pg]!;
        const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
        const section = this.sectionStarts[sIdx]?.section ?? this.fullDoc.sections[0];
        const sp = this.sectPrAt(sIdx);
        if (!section) continue;
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        const header = (pg === 0 && sp.titlePg) ? section.headers.first : section.headers.default;
        if (header?.length) this.xpsPaintHf(page, header, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg);
        const footer = (pg === 0 && sp.titlePg) ? section.footers.first : section.footers.default;
        if (footer?.length) this.xpsPaintHf(page, footer, sp.marginLeftTwips, sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720), colW, pg);
      }
    }
    return buildXps({ pages, fontBytes: this.fontBytes });
  }

  private xpsPaintHf(
    page: XpsPage, paras: Paragraph[],
    originXTwips: number, topYTwips: number, widthTwips: number, pageIdx: number,
  ): void {
    if (!this.fonts) return;
    const T = TWIPS_PER_PT;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: 'center' as const },
      { posTwips: widthTwips, align: 'right' as const },
    ];
    const famOf = (family: string | undefined): string => this.fileFamilyFor(family);
    let y = topYTwips;
    for (const p of paras) {
      const runs: Run[] = p.runs.map((r) =>
        r.field
          ? { ...r, text: /NUMPAGES/i.test(r.field) ? String(this.numPagesFor())
              : /PAGE/i.test(r.field) ? String(this.pageNumberFor(pageIdx)) : r.text }
          : r);
      const spans = this.buildSpans({ runs, props: p.props });
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: (p.props.tabStops?.length ? p.props.tabStops : defaultTabs) as never,
      });
      const font = this.fonts.resolve(undefined, 'regular');
      for (const line of lines) {
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: 'auto' }) * T;
        let lx = originXTwips;
        const align = p.props.alignment;
        if (align === 'center') lx += (widthTwips - line.widthTwips) / 2;
        else if (align === 'right') lx += widthTwips - line.widthTwips;
        const baselinePt = (y + lh * 0.8) / T;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex];
          if (!span) continue;
          const run = runs[span.runIndex ?? seg.spanIndex];
          const renderer = run?.custom
            ? this.inlineRenderers.get(run.custom.type)?.renderer
            : undefined;
          const txt = run?.custom
            ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText
            : span.text.slice(seg.start, seg.end);
          if (!txt.trim()) continue;
          page.glyphs.push({
            text: txt,
            xPt: (lx + seg.xTwips) / T,
            baselinePt,
            fontFamily: famOf(span.family),
            variant: span.variant === 'boldItalic' ? 'boldItalic'
              : span.variant === 'bold' ? 'bold'
              : span.variant === 'italic' ? 'italic' : 'regular',
            sizePt: span.sizePt,
            colorRgb: [0.33, 0.33, 0.33],
          });
        }
        y += lh;
      }
    }
  }

  /** Coleta todas as imagens do documento (corpo, tabelas, cabeçalhos/rodapés). */
  private collectImages(): { data: Uint8Array; ext: string }[] {
    const out: { data: Uint8Array; ext: string }[] = [];
    const fromParas = (paras: Paragraph[]): void => {
      for (const p of paras) for (const r of p.runs) if (r.image) out.push(r.image);
    };
    const fromTable = (t: TableBlock): void => {
      for (const row of t.rows) for (const c of row.cells) {
        fromParas(c.paragraphs);
        for (const nt of c.tables) fromTable(nt);
      }
    };
    if (this.model) fromParas(this.model.paragraphs);
    for (const a of this.tableAnchors) fromTable(a.table);
    if (this.fullDoc) for (const sec of this.fullDoc.sections) {
      for (const set of [sec.headers, sec.footers]) {
        for (const paras of Object.values(set)) if (Array.isArray(paras)) fromParas(paras);
      }
    }
    return out;
  }

  /** Garante que todas as imagens estejam decodificadas (createImageBitmap é async). */
  private async ensureImagesDecoded(): Promise<void> {
    await Promise.all(this.collectImages().map(async (img) => {
      const cached = this.bitmaps.get(img);
      if (cached && cached !== 'loading') return;
      try {
        const copy = new Uint8Array(img.data);
        const bmp = await createImageBitmap(new Blob([copy.buffer], { type: `image/${img.ext === 'jpg' ? 'jpeg' : img.ext}` }));
        this.bitmaps.set(img, bmp);
        this.imagesVersion++;
      } catch { /* imagem inválida: vira placeholder no PDF */ }
    }));
  }

  /** Coloca os glifos de `text` em sequência usando NOSSOS advances (snap-free). */
  private pdfGlyphsAt(
    page: PdfPage, emb: (f: string | undefined, v: FontVariant) => EmbeddedFont,
    family: string | undefined, variant: FontVariant, sizePt: number, color: PdfColor,
    text: string, xTwips: number, baselineTwips: number,
  ): void {
    const T = TWIPS_PER_PT;
    const sf = this.fonts!.resolve(family, variant);
    const font = emb(family, variant);
    let x = xTwips;
    const placed: PlacedGlyph[] = [];
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      const a = sf.advanceTwips(cp, sizePt);
      if (ch !== ' ' && ch !== '\t') {
        const { gid } = font.encode(cp);
        placed.push({ gid, codePoint: cp, xPt: x / T, baselineFromTopPt: baselineTwips / T });
      }
      x += a;
    }
    page.glyphs(font, deviceEmPt(sizePt), color, placed);
  }

  /** Versão PDF do paintLine: texto + decorações de parágrafo/run. */
  private pdfPaintLine(
    doc: PdfDocument, page: PdfPage,
    emb: (f: string | undefined, v: FontVariant) => EmbeddedFont,
    pl: ParaLayout, line: LaidLine,
  ): void {
    const T = TWIPS_PER_PT;
    const para = this.model!.paragraphs[line.para]!;
    const st = this.styleOf(para);

    // sombreado e bordas do parágrafo
    const effBorders = para.props.borders ?? st?.borders;
    const effShading = para.props.shadingHex ?? st?.shadingHex;
    const effIndentL = para.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0;
    const effIndentR = para.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
    if (effShading || para.props.boxBorder || effBorders) {
      const s = this.sect();
      const colX = s.marginLeftTwips + effIndentL;
      const colW = this.contentWidthTwips() - effIndentL - effIndentR;
      const isFirst = line.rich.start === 0;
      const isLast = line.rich.end === pl.charAdvances.length;
      if (effShading) {
        const bd = effBorders;
        const exL = (bd?.left?.spacePt ?? 0) * T;
        const exR = (bd?.right?.spacePt ?? 0) * T;
        const exT = isFirst ? (bd?.top?.spacePt ?? 0) * T : 0;
        const exB = isLast ? (bd?.bottom?.spacePt ?? 0) * T : 0;
        page.fillRect((colX - exL) / T, (line.yTwips - exT) / T,
          (colW + exL + exR) / T, (line.heightTwips + exT + exB) / T, hexColor(effShading));
      }
      if (effBorders || para.props.boxBorder) {
        const fallback = para.props.boxBorder && !effBorders ? { style: 'single', sizeEighthPt: 4, spacePt: 1 } : undefined;
        const b = effBorders ?? { top: fallback, bottom: fallback, left: fallback, right: fallback };
        const spL = (b.left?.spacePt ?? 0) * T, spR = (b.right?.spacePt ?? 0) * T;
        const spT = (b.top?.spacePt ?? 0) * T, spB = (b.bottom?.spacePt ?? 0) * T;
        const x0 = colX - spL, x1 = colX + colW + spR;
        const y0 = line.yTwips - (isFirst ? spT : 0), y1 = line.yTwips + line.heightTwips + (isLast ? spB : 0);
        const edge = (
          e: { sizeEighthPt: number; color?: string; style: string } | undefined,
          ax: number, ay: number, bx: number, by: number,
        ): void => {
          if (!e) return;
          const dash = e.style === 'dashed' ? [6, 3.75] : e.style === 'dotted' ? [1.5, 3] : undefined;
          page.line(ax / T, ay / T, bx / T, by / T, this.pdfColor(e.color), Math.max(0.4, e.sizeEighthPt / 8), dash);
        };
        edge(b.left, x0, y0, x0, y1);
        edge(b.right, x1, y0, x1, y1);
        if (isFirst) edge(b.top, x0, y0, x1, y0);
        if (isLast) edge(b.bottom, x0, y1, x1, y1);
      }
    }

    // marcador de lista
    if (line.marker) {
      this.pdfGlyphsAt(page, emb, DEFAULT_FONT, 'regular', 11, [0, 0, 0], line.marker.text, line.marker.xTwips, line.baselineTwips);
    }

    // texto, caractere a caractere — posições idênticas ao canvas
    let x = line.xTwips;
    for (const seg of line.rich.segments) {
      const span = pl.spans[seg.spanIndex]!;
      const run = para.runs[span.runIndex ?? seg.spanIndex];
      const props = run?.props;
      if (run?.custom) {
        const globalStart = pl.spanCharStart[seg.spanIndex]! + seg.start;
        let widthTwips = 0;
        for (let i = 0; i < seg.end - seg.start; i++) {
          widthTwips += pl.charAdvances[globalStart + i]!;
        }
        const renderer = this.inlineRenderers.get(run.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText;
        this.pdfGlyphsAt(
          page,
          emb,
          span.family,
          span.variant,
          span.sizePt,
          this.pdfColor(props?.color ?? st?.color),
          fallbackText,
          x,
          line.baselineTwips,
        );
        x += widthTwips;
        continue;
      }
      if (run?.image) {
        const img = run.image;
        this.pdfImage(doc, page, img, x / T, (line.baselineTwips - img.heightTwips) / T, img.widthTwips / T, img.heightTwips / T);
        x += img.widthTwips;
        continue;
      }
      const sf = this.fonts!.resolve(span.family, span.variant);
      const font = emb(span.family, span.variant);
      const col = this.pdfColor(props?.color ?? st?.color);
      const baseShift =
        props?.vertAlign === 'superscript' ? -span.sizePt * 0.35 * T :
        props?.vertAlign === 'subscript' ? span.sizePt * 0.14 * T : 0;
      const globalStart = pl.spanCharStart[seg.spanIndex]! + seg.start;
      const segX0 = x;
      const placed: PlacedGlyph[] = [];
      for (let i = 0; i < seg.end - seg.start; i++) {
        const gi = globalStart + i;
        const ch = span.text[seg.start + i]!;
        let a = pl.charAdvances[gi]!;
        if (line.justifyExtraPerSpace && ch === ' ') a += line.justifyExtraPerSpace;
        // realces de fundo (como no app de referência)
        if (props?.highlight) {
          page.fillRect(x / T, line.yTwips / T, a / T, line.heightTwips / T, hexColor((HIGHLIGHTS[props.highlight] ?? '#ffff00').replace('#', '')));
        }
        if (run?.field) page.fillRect(x / T, line.yTwips / T, a / T, line.heightTwips / T, [0.9, 0.9, 0.9]);
        if (props?.commentIds?.length) page.fillRect(x / T, line.yTwips / T, a / T, line.heightTwips / T, [1, 0.925, 0.72]);
        // leader pontilhado do tab (sumário)
        if (ch === '\t' && pl.tabLeaders?.get(gi)) {
          for (let dx = 60; dx < a - 40; dx += 90) {
            const cp = '.'.codePointAt(0)!;
            const { gid } = font.encode(cp);
            placed.push({ gid, codePoint: cp, xPt: (x + dx) / T, baselineFromTopPt: (line.baselineTwips + baseShift) / T });
          }
        }
        if (ch !== ' ' && ch !== '\t' && ch !== '\n' && ch !== '\f') {
          const rel = x - line.xTwips;
          const xSnap = line.xTwips + Math.round(rel / 2.4) * 2.4;
          const cp = ch.codePointAt(0)!;
          const { gid } = font.encode(cp);
          placed.push({ gid, codePoint: cp, xPt: xSnap / T, baselineFromTopPt: (line.baselineTwips + baseShift) / T });
        }
        x += a;
      }
      page.glyphs(font, deviceEmPt(span.sizePt), col, placed);

      // sublinhado / tachado
      if (props?.underline || props?.strike || props?.doubleStrike) {
        const w = x - segX0;
        const baseW = Math.max(0.5, deviceEmPt(span.sizePt) / 16);
        const drawU = (yOffTwips: number, lwPt: number, c: PdfColor, dash?: number[]): void =>
          page.line(segX0 / T, (line.baselineTwips + yOffTwips) / T, (segX0 + w) / T, (line.baselineTwips + yOffTwips) / T, c, lwPt, dash);
        if (props.underline) {
          const uc = props.underlineColor ? hexColor(props.underlineColor) : col;
          const yU = 40;
          switch (props.underlineStyle) {
            case 'double': drawU(yU, baseW, uc); drawU(yU + 12, baseW, uc); break;
            case 'thick': drawU(yU + 12, baseW * 2.2, uc); break;
            case 'dotted': drawU(yU, baseW, uc, [baseW, baseW * 1.6]); break;
            case 'dash': drawU(yU, baseW, uc, [baseW * 4, baseW * 2.5]); break;
            default: drawU(yU, baseW, uc);
          }
        }
        if (props.strike) drawU(-span.sizePt * 0.25 * T, baseW, col);
        if (props.doubleStrike) {
          const yS = -span.sizePt * 0.25 * T;
          drawU(yS - 8, baseW, col);
          drawU(yS + 8, baseW, col);
        }
      }
    }
  }

  /** Versão PDF do desenho de tabela (sombreado + bordas + texto das células). */
  private pdfPaintTable(
    doc: PdfDocument, page: PdfPage,
    emb: (f: string | undefined, v: FontVariant) => EmbeddedFont,
    tl: TableLayout,
  ): void {
    const T = TWIPS_PER_PT;
    for (const sh of tl.cellShades) {
      page.fillRect((tl.xTwips + sh.xTwips) / T, (tl.yTwips + sh.yTwips) / T, sh.wTwips / T, sh.hTwips / T, hexColor(sh.hex));
    }
    const strokeEdge = (
      e: { sizeEighthPt: number; color?: string; style: string } | undefined,
      ax: number, ay: number, bx: number, by: number,
    ): void => {
      if (!e) return;
      const dash = e.style === 'dashed' ? [6, 3.75] : e.style === 'dotted' ? [1.5, 3] : undefined;
      page.line((tl.xTwips + ax) / T, (tl.yTwips + ay) / T, (tl.xTwips + bx) / T, (tl.yTwips + by) / T,
        this.pdfColor(e.color), Math.max(0.4, e.sizeEighthPt / 8), dash);
    };
    for (const cr of tl.cellRects) {
      strokeEdge(cr.edges.top, cr.x0, cr.y0, cr.x1, cr.y0);
      strokeEdge(cr.edges.bottom, cr.x0, cr.y1, cr.x1, cr.y1);
      strokeEdge(cr.edges.left, cr.x0, cr.y0, cr.x0, cr.y1);
      strokeEdge(cr.edges.right, cr.x1, cr.y0, cr.x1, cr.y1);
    }
    for (const cl of tl.cellLines) {
      const variant: FontVariant = cl.bold && cl.italic ? 'boldItalic' : cl.bold ? 'bold' : cl.italic ? 'italic' : 'regular';
      this.pdfGlyphsAt(page, emb, cl.family, variant, cl.sizePt, this.pdfColor(cl.color), cl.text, tl.xTwips + cl.xTwips, tl.yTwips + cl.yTwips);
    }
  }

  /** Versão PDF do paintHf (cabeçalho/rodapé) com glifos posicionados. */
  private pdfPaintHf(
    doc: PdfDocument, page: PdfPage,
    emb: (f: string | undefined, v: FontVariant) => EmbeddedFont,
    paras: Paragraph[], originXTwips: number, topYTwips: number, widthTwips: number, pageIdx: number, sp: SectPr,
  ): void {
    if (!this.fonts) return;
    const T = TWIPS_PER_PT;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: 'center' as const },
      { posTwips: widthTwips, align: 'right' as const },
    ];
    let y = topYTwips;
    for (const p of paras) {
      const stColor = this.styleOf(p)?.color; // cor herdada do estilo (ex.: Título branco)
      const runs: Run[] = p.runs.map((r) =>
        r.field
          ? { ...r, text: /NUMPAGES/i.test(r.field) ? String(this.numPagesFor())
              : /PAGE/i.test(r.field) ? String(this.pageNumberFor(pageIdx)) : r.text }
          : r);
      // FLUTUANTES do HF (timbrado/logo/nº de página em caixa): imagem via pdfImage,
      // caixa de texto recursivamente. Sem isto o PDF sai sem a capa/rodapé.
      for (const r of runs) {
        const obj = r.textbox ?? r.image;
        if (!obj) continue;
        const { x: fx, y: fy } = obj.floating
          ? this.anchoredPos(obj, originXTwips, y, sp)
          : { x: originXTwips, y };
        if (r.textbox) {
          { const iw = this.tbInner(r.textbox, fx, fy, r.textbox.widthTwips || widthTwips);
            this.pdfPaintHf(doc, page, emb, r.textbox.paras, iw.x, iw.y, iw.w, pageIdx, sp); }
        } else if (r.image) {
          this.pdfImage(doc, page, r.image, fx / T, fy / T, r.image.widthTwips / T, r.image.heightTwips / T);
        }
      }
      const spans = this.buildSpans({ runs, props: p.props }, { skipFloating: true });
      const { lines, charAdvances } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p.props.tabStops?.length ? p.props.tabStops : defaultTabs,
      });
      const spanStart: number[] = [];
      let acc = 0;
      for (const s of spans) { spanStart.push(acc); acc += s.text.length; }
      const font0 = this.fonts.resolve(undefined, 'regular');
      const fallback = p.props.boxBorder && !p.props.borders
        ? { style: 'single', sizeEighthPt: 4, spacePt: 1 }
        : undefined;
      const bd = p.props.borders ?? (fallback
        ? { top: fallback, bottom: fallback, left: fallback, right: fallback }
        : undefined);
      const strokeEdge = (
        e: { sizeEighthPt: number; color?: string; style: string } | undefined,
        ax: number, ay: number, bx: number, by: number,
      ): void => {
        if (!e) return;
        const dash = e.style === 'dashed' ? [6, 3.75] : e.style === 'dotted' ? [1.5, 3] : undefined;
        page.line(ax / T, ay / T, bx / T, by / T, this.pdfColor(e.color), Math.max(0.4, e.sizeEighthPt / 8), dash);
      };
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li]!;
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font0, lineSize, { line: 240, lineRule: 'auto' }) * T;
        if (p.props.shadingHex) {
          page.fillRect(originXTwips / T, y / T, widthTwips / T, lh / T, hexColor(p.props.shadingHex));
        }
        let lx = originXTwips;
        const align = p.props.alignment;
        if (align === 'center') lx += (widthTwips - line.widthTwips) / 2;
        else if (align === 'right') lx += widthTwips - line.widthTwips;
        const baseline = y + lh * 0.8;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex]!;
          const run = runs[span.runIndex ?? seg.spanIndex];
          const font = emb(span.family, span.variant);
          const cHex = run?.props.color ?? stColor;
          const col: PdfColor = cHex ? hexColor(cHex) : [0.33, 0.33, 0.33];
          const gs = spanStart[seg.spanIndex]! + seg.start;
          let cx = lx + seg.xTwips;
          const placed: PlacedGlyph[] = [];
          for (let i = 0; i < seg.end - seg.start; i++) {
            const ch = span.text[seg.start + i]!;
            const a = charAdvances[gs + i]!;
            if (ch !== ' ' && ch !== '\t') {
              const cp = ch.codePointAt(0)!;
              const { gid } = font.encode(cp);
              placed.push({ gid, codePoint: cp, xPt: cx / T, baselineFromTopPt: baseline / T });
            }
            cx += a;
          }
          page.glyphs(font, deviceEmPt(span.sizePt), col, placed);
        }
        if (bd) {
          const isFirst = li === 0;
          const isLast = li === lines.length - 1;
          const spL = (bd.left?.spacePt ?? 0) * T;
          const spR = (bd.right?.spacePt ?? 0) * T;
          const spT = (bd.top?.spacePt ?? 0) * T;
          const spB = (bd.bottom?.spacePt ?? 0) * T;
          const x0 = originXTwips - spL;
          const x1 = originXTwips + widthTwips + spR;
          const y0 = y - (isFirst ? spT : 0);
          const y1 = y + lh + (isLast ? spB : 0);
          strokeEdge(bd.left, x0, y0, x0, y1);
          strokeEdge(bd.right, x1, y0, x1, y1);
          if (isFirst) strokeEdge(bd.top, x0, y0, x1, y0);
          if (isLast) strokeEdge(bd.bottom, x0, y1, x1, y1);
        }
        y += lh;
      }
    }
  }

  /**
   * Embute (cacheado) e desenha uma imagem. Reencoda como JPEG e reamostra ao
   * tamanho EXIBIDO (~150 DPI), como o app de referência faz — evita PDFs gigantes (RGBA cru
   * de fotos em 4K explodia para dezenas de MB). Alpha é achatado em branco.
   */
  private pdfImage(
    doc: PdfDocument, page: PdfPage,
    img: { data: Uint8Array; ext: string }, xPt: number, yTopPt: number, wPt: number, hPt: number,
  ): void {
    const DPI = 150;
    let handle = this.pdfImgCache.get(img);
    if (handle === undefined) {
      const bmp = this.bitmapFor(img);
      if (!bmp) {
        handle = null;
      } else {
        // alvo = tamanho exibido em px na resolução-alvo, sem ampliar além do natural
        const sw = Math.max(1, Math.min(Math.round((wPt * DPI) / 72), bmp.width));
        const sh = Math.max(1, Math.min(Math.round((hPt * DPI) / 72), bmp.height));
        const c = document.createElement('canvas');
        c.width = sw; c.height = sh;
        const cx = c.getContext('2d')!;
        cx.drawImage(bmp, 0, 0, sw, sh); // SEM fundo branco: preserva o alpha
        const rgba = cx.getImageData(0, 0, sw, sh).data;
        let hasAlpha = false;
        for (let i = 3; i < rgba.length; i += 4) { if (rgba[i] !== 255) { hasAlpha = true; break; } }
        if (hasAlpha) {
          // transparência (ex.: logo/placeholder): RGBA + SMask preserva o recorte
          handle = doc.embedRgba(new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.length), sw, sh);
        } else {
          // opaco (foto): JPEG achata em branco e fica bem menor
          cx.globalCompositeOperation = 'destination-over';
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, sw, sh);
          handle = doc.embedJpeg(dataUrlToBytes(c.toDataURL('image/jpeg', 0.82)), sw, sh);
        }
      }
      this.pdfImgCache.set(img, handle);
    }
    if (handle) page.drawImage(handle, xPt, yTopPt, wPt, hPt);
    else page.fillRect(xPt, yTopPt, wPt, hPt, [0.93, 0.93, 0.93]);
  }
}

/** Converte um dataURL base64 (ex.: image/jpeg) em bytes. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

customElements.define('universal-write', UniversalWriteElement);
