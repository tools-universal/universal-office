import {
  parseXml,
  childElements,
  firstChild,
  DEFAULT_RUN_PROPS,
  type XmlElement,
  type FullDocument,
  type Block,
  type Paragraph,
  type Run,
  type RunProps,
  type ParaProps,
  type Section,
  type SectPr,
  type TableBlock,
  type TableRow,
  type TableCell,
  type TableBorders,
  type CommentInfo,
  type InlineImage,
  type ParagraphBorders,
  type BorderEdge,
  type StylesMap,
  type ResolvedStyle as DocxResolvedStyle,
} from '@wordnext/docx-core';
import { OdfPackage } from './zip.js';
import { lengthToTwips } from './units.js';
import {
  buildStyleIndex,
  resolveStyle,
  type OdfStyleIndex,
  type ResolvedStyle,
  type ListKind,
} from './styles.js';

export { OdfPackage, writeZip } from './zip.js';
export { lengthToTwips, lengthToHalfPt, lengthToTwipsOr } from './units.js';
export { writeOdt, type WriteOdtOptions } from './write-odt.js';

const ODT_MIMETYPE = 'application/vnd.oasis.opendocument.text';

/** Largura útil padrão de conteúdo (twips) p/ distribuir colunas sem largura. */
const DEFAULT_CONTENT_WIDTH_TWIPS = 9026;

/** Geometria A4 padrão quando styles.xml não traz page-layout. */
const DEFAULT_SECTPR: SectPr = {
  pageWidthTwips: 11906,
  pageHeightTwips: 16838,
  marginLeftTwips: 1417,
  marginRightTwips: 1417,
  marginTopTwips: 1417,
  marginBottomTwips: 1417,
};

/**
 * Formatação "embutida" de títulos. Como o editor resolve estilos pela própria
 * tabela (Heading1..3) ou por fullDoc.styles, assamos também a aparência no run
 * para que o título renderize negrito/maior mesmo sem entrada de estilo casando.
 */
interface HeadingLook { szHalfPt: number; bold: boolean; color?: string }
const HEADING_LOOKS: Record<number, HeadingLook> = {
  1: { szHalfPt: 40, bold: true, color: '0F4761' },
  2: { szHalfPt: 32, bold: true, color: '0F4761' },
  3: { szHalfPt: 28, bold: true, color: '0F4761' },
  4: { szHalfPt: 26, bold: true, color: '0F4761' },
  5: { szHalfPt: 24, bold: true, color: '0F4761' },
  6: { szHalfPt: 22, bold: true, color: '0F4761' },
};

/** Sniff: o pacote é um .odt? (mimetype == application/vnd.oasis.opendocument.text). */
export function isOdt(bytes: Uint8Array): boolean {
  // assinatura ZIP "PK\x03\x04"
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  let pkg: OdfPackage;
  try {
    pkg = OdfPackage.load(bytes);
  } catch {
    return false;
  }
  const mime = pkg.getPartText('mimetype');
  return mime?.trim() === ODT_MIMETYPE;
}

/** Lê um .odt (bytes do ZIP) para o modelo FullDocument do WordNext. */
export function readOdt(bytes: Uint8Array): FullDocument {
  const pkg = OdfPackage.load(bytes);
  const contentXml = pkg.getPartText('content.xml');
  if (contentXml === undefined) {
    throw new Error('Pacote ODF sem content.xml — não é um documento OpenDocument');
  }
  const contentRoot = parseXml(contentXml);
  const stylesXml = pkg.getPartText('styles.xml');
  const stylesRoot = stylesXml !== undefined ? parseXml(stylesXml) : undefined;

  const styleIndex = buildStyleIndex(contentRoot, stylesRoot);

  const body = firstChild(contentRoot, 'office:body');
  const officeText = body && firstChild(body, 'office:text');
  if (!officeText) {
    throw new Error('content.xml sem office:body/office:text');
  }

  const ctx: ReadCtx = { pkg, styleIndex, comments: [], nextCommentId: 0 };
  const blocks: Block[] = [];
  for (const child of childElements(officeText)) {
    readBodyChild(child, blocks, ctx, 0);
  }
  if (blocks.length === 0) blocks.push({ type: 'paragraph', paragraph: { runs: [], props: {} } });

  const sectPr = readPageGeometry(stylesRoot, contentRoot);
  const sections: Section[] = [{
    sectPr,
    blockStart: 0,
    blockEnd: blocks.length,
    headers: {},
    footers: {},
    headerRefs: [],
    footerRefs: [],
  }];

  return {
    blocks,
    sections,
    footnotes: new Map(),
    endnotes: new Map(),
    comments: ctx.comments,
    styles: buildStylesMap(styleIndex),
    bookmarks: new Map(),
  };
}

interface ReadCtx {
  pkg: OdfPackage;
  styleIndex: OdfStyleIndex;
  comments: CommentInfo[];
  nextCommentId: number;
}

/** Despacha um filho de office:text (ou de uma lista) para blocks. */
function readBodyChild(el: XmlElement, blocks: Block[], ctx: ReadCtx, listDepth: number): void {
  switch (el.name) {
    case 'text:p':
      blocks.push({ type: 'paragraph', paragraph: readParagraph(el, ctx, undefined) });
      break;
    case 'text:h':
      blocks.push({ type: 'paragraph', paragraph: readHeading(el, ctx) });
      break;
    case 'text:list':
      readList(el, blocks, ctx, listDepth);
      break;
    case 'table:table':
      blocks.push(readTable(el, ctx));
      break;
    case 'text:section':
      // seção textual ODF: achata seu conteúdo no corpo
      for (const c of childElements(el)) readBodyChild(c, blocks, ctx, listDepth);
      break;
    case 'text:soft-page-break':
    case 'text:sequence-decls':
      break;
    default:
      break;
  }
}

// ───────────────────────── parágrafos / runs ─────────────────────────

interface ListContext {
  kind: ListKind;
  ilvl: number;
}

function readParagraph(pEl: XmlElement, ctx: ReadCtx, list: ListContext | undefined): Paragraph {
  const styleName = pEl.attrs['text:style-name'];
  const resolved = resolveStyle(ctx.styleIndex, styleName);
  const props = paraPropsFromStyle(resolved, styleName);
  if (list) props.numbering = { kind: list.kind, ilvl: list.ilvl };
  applyParaBorders(ctx.styleIndex, styleName, props);

  const runs: Run[] = [];
  collectRuns(pEl, runs, ctx, baseRunPropsFor(resolved), undefined);
  return { runs, props };
}

function readHeading(hEl: XmlElement, ctx: ReadCtx): Paragraph {
  const level = clampLevel(parseInt(hEl.attrs['text:outline-level'] ?? '1', 10));
  const styleName = hEl.attrs['text:style-name'];
  const resolved = resolveStyle(ctx.styleIndex, styleName);
  const props = paraPropsFromStyle(resolved, styleName);
  props.styleId = `Heading${level}`;
  applyParaBorders(ctx.styleIndex, styleName, props);

  const look = HEADING_LOOKS[level]!;
  // base do run = estilo resolvido, depois assamos a aparência do título
  const base: RunProps = { ...baseRunPropsFor(resolved) };
  base.bold = base.bold || look.bold;
  base.szHalfPt = base.szHalfPt ?? look.szHalfPt;
  base.color = base.color ?? look.color;

  const runs: Run[] = [];
  collectRuns(hEl, runs, ctx, base, undefined);
  return { runs, props };
}

function clampLevel(n: number): number {
  if (Number.isNaN(n) || n < 1) return 1;
  return n > 6 ? 6 : n;
}

/** ParaProps a partir do estilo resolvido (sem run). */
function paraPropsFromStyle(resolved: ResolvedStyle, styleId: string | undefined): ParaProps {
  const p: ParaProps = {};
  const s = resolved.para;
  if (s.alignment !== undefined) p.alignment = s.alignment;
  if (s.indentLeftTwips !== undefined) p.indentLeftTwips = s.indentLeftTwips;
  if (s.indentRightTwips !== undefined) p.indentRightTwips = s.indentRightTwips;
  if (s.indentFirstLineTwips !== undefined) p.indentFirstLineTwips = s.indentFirstLineTwips;
  if (s.spaceBeforeTwips !== undefined) p.spaceBeforeTwips = s.spaceBeforeTwips;
  if (s.spaceAfterTwips !== undefined) p.spaceAfterTwips = s.spaceAfterTwips;
  if (s.shadingHex !== undefined) p.shadingHex = s.shadingHex;
  if (s.pageBreakBefore) p.pageBreakBefore = true;
  if (styleId) p.styleId = styleId;
  return p;
}

/** RunProps base (defaults + propriedades de run do estilo do parágrafo). */
function baseRunPropsFor(resolved: ResolvedStyle): RunProps {
  return mergeRunProps({ ...DEFAULT_RUN_PROPS }, resolved.run);
}

function mergeRunProps(base: RunProps, over: Partial<RunProps>): RunProps {
  const out: RunProps = { ...base };
  for (const k of Object.keys(over) as (keyof RunProps)[]) {
    if (over[k] !== undefined) {
      Object.assign(out, { [k]: over[k] });
    }
  }
  return out;
}

/**
 * Percorre o conteúdo de um parágrafo/heading/span emitindo runs.
 * `base` são as props herdadas; `text:span` empilha por cima.
 */
function collectRuns(
  container: XmlElement,
  runs: Run[],
  ctx: ReadCtx,
  base: RunProps,
  pendingLink: string | undefined,
): void {
  let buffer = '';
  const flush = (): void => {
    if (buffer.length === 0) return;
    const props = { ...base };
    if (pendingLink) {
      props.link = pendingLink;
      props.underline = true;
      props.color ??= '0563C1';
    }
    runs.push({ text: buffer, props });
    buffer = '';
  };

  for (const child of container.children) {
    if (typeof child === 'string') {
      buffer += child;
      continue;
    }
    switch (child.name) {
      case 'text:span': {
        flush();
        const spanStyle = resolveStyle(ctx.styleIndex, child.attrs['text:style-name']);
        const spanBase = mergeRunProps(base, spanStyle.run);
        collectRuns(child, runs, ctx, spanBase, pendingLink);
        break;
      }
      case 'text:a': {
        flush();
        const href = child.attrs['xlink:href'];
        collectRuns(child, runs, ctx, base, href ?? pendingLink);
        break;
      }
      case 'text:s': {
        const count = parseInt(child.attrs['text:c'] ?? '1', 10);
        buffer += ' '.repeat(Number.isNaN(count) || count < 1 ? 1 : count);
        break;
      }
      case 'text:tab':
        buffer += '\t';
        break;
      case 'text:line-break':
        buffer += '\n';
        break;
      case 'draw:frame': {
        flush();
        const img = readImage(child, ctx);
        if (img) {
          runs.push({ text: '￼', props: { ...base }, image: img });
        } else {
          // frame sem imagem: tenta extrair texto interno (text-box)
          collectRuns(child, runs, ctx, base, pendingLink);
        }
        break;
      }
      case 'office:annotation': {
        flush();
        readAnnotation(child, ctx);
        break;
      }
      case 'text:note': {
        flush();
        // nota de rodapé/fim: mantém o texto do corpo da nota inline (best-effort)
        const body = firstChild(child, 'text:note-body');
        if (body) collectRuns(flattenNoteBody(body), runs, ctx, base, pendingLink);
        break;
      }
      case 'text:bookmark':
      case 'text:bookmark-start':
      case 'text:bookmark-end':
      case 'text:annotation-end':
      case 'text:soft-page-break':
      case 'office:annotation-end':
        break;
      default:
        // elementos desconhecidos: recursão p/ não perder texto aninhado
        collectRuns(child, runs, ctx, base, pendingLink);
        break;
    }
  }
  flush();
}

/** Concatena os text:p do corpo de uma nota num pseudo-container de texto. */
function flattenNoteBody(noteBody: XmlElement): XmlElement {
  const children: (XmlElement | string)[] = [];
  for (const p of childElements(noteBody)) {
    for (const c of p.children) children.push(c);
    children.push(' ');
  }
  return { name: 'span', attrs: {}, children };
}

function readAnnotation(el: XmlElement, ctx: ReadCtx): void {
  const author = firstChild(el, 'dc:creator');
  const paras = childElements(el, 'text:p');
  const text = paras
    .map((p) => {
      const r: Run[] = [];
      collectRuns(p, r, ctx, { ...DEFAULT_RUN_PROPS }, undefined);
      return r.map((x) => x.text).join('');
    })
    .join('\n');
  const info: CommentInfo = { id: ctx.nextCommentId++, text };
  if (author) info.author = textOf(author);
  ctx.comments.push(info);
}

function textOf(el: XmlElement): string {
  let out = '';
  for (const c of el.children) out += typeof c === 'string' ? c : textOf(c);
  return out;
}

// ───────────────────────── listas ─────────────────────────

function readList(listEl: XmlElement, blocks: Block[], ctx: ReadCtx, depth: number): void {
  const ilvl = depth; // 0-based para o modelo
  const kind = resolveListKind(ctx, listEl, depth);
  for (const item of childElements(listEl, 'text:list-item')) {
    readListItem(item, blocks, ctx, depth, ilvl, kind);
  }
  // text:list-header (sem marcador) — trata os parágrafos como nível atual sem numbering
  for (const header of childElements(listEl, 'text:list-header')) {
    for (const c of childElements(header)) {
      if (c.name === 'text:p' || c.name === 'text:h') {
        blocks.push({ type: 'paragraph', paragraph: readParagraph(c, ctx, undefined) });
      }
    }
  }
}

function readListItem(
  item: XmlElement,
  blocks: Block[],
  ctx: ReadCtx,
  depth: number,
  ilvl: number,
  kind: ListKind,
): void {
  for (const c of childElements(item)) {
    if (c.name === 'text:p' || c.name === 'text:h') {
      blocks.push({ type: 'paragraph', paragraph: readParagraph(c, ctx, { kind, ilvl }) });
    } else if (c.name === 'text:list') {
      readList(c, blocks, ctx, depth + 1);
    }
  }
}

/**
 * Decide bullet vs. decimal para um nível. Tenta, em ordem:
 *  1. o text:style-name do próprio text:list;
 *  2. o style:list-style-name herdado do estilo do primeiro parágrafo;
 * cai para 'bullet' se nada casar.
 */
function resolveListKind(ctx: ReadCtx, listEl: XmlElement, depth: number): ListKind {
  const level = depth + 1; // text:level é 1-based
  const direct = listEl.attrs['text:style-name'];
  const fromDirect = lookupListKind(ctx, direct, level);
  if (fromDirect) return fromDirect;

  // herdado via estilo de um parágrafo filho
  for (const item of childElements(listEl, 'text:list-item')) {
    for (const c of childElements(item, 'text:p')) {
      const resolved = resolveStyle(ctx.styleIndex, c.attrs['text:style-name']);
      const fromStyle = lookupListKind(ctx, resolved.listStyleName, level);
      if (fromStyle) return fromStyle;
    }
  }
  return 'bullet';
}

function lookupListKind(ctx: ReadCtx, listStyleName: string | undefined, level: number): ListKind | undefined {
  if (!listStyleName) return undefined;
  const levels = ctx.styleIndex.listStyles.get(listStyleName);
  if (!levels) return undefined;
  return levels.get(level) ?? levels.get(1);
}

// ───────────────────────── tabelas ─────────────────────────

function readTable(tblEl: XmlElement, ctx: ReadCtx): TableBlock {
  const colWidths = readColumns(tblEl, ctx);
  const rows: TableRow[] = [];
  for (const rowEl of collectRows(tblEl)) {
    const cells: TableCell[] = [];
    for (const cellEl of childElements(rowEl)) {
      if (cellEl.name === 'table:table-cell') {
        cells.push(readCell(cellEl, ctx));
      } else if (cellEl.name === 'table:covered-table-cell') {
        // célula coberta por um span horizontal: ignorada (o gridSpan da
        // célula anterior já a representa).
      }
    }
    if (cells.length > 0) rows.push({ cells });
  }

  // largura das colunas: usa style:column-width quando há; senão distribui.
  const totalCols = rows.reduce(
    (max, r) => Math.max(max, r.cells.reduce((s, c) => s + c.gridSpan, 0)),
    colWidths.length,
  );
  const gridColsTwips = buildGridCols(colWidths, totalCols);

  return { type: 'table', rows, gridColsTwips };
}

/** Achata table:table-header-rows e table:table-rows em uma lista de linhas. */
function collectRows(tblEl: XmlElement): XmlElement[] {
  const out: XmlElement[] = [];
  for (const c of childElements(tblEl)) {
    if (c.name === 'table:table-row') out.push(c);
    else if (c.name === 'table:table-header-rows' || c.name === 'table:table-row-group') {
      out.push(...childElements(c, 'table:table-row'));
    }
  }
  return out;
}

/** Lê as larguras declaradas pelas table:table-column (com repetição). */
function readColumns(tblEl: XmlElement, ctx: ReadCtx): (number | undefined)[] {
  const widths: (number | undefined)[] = [];
  const visit = (el: XmlElement): void => {
    for (const c of childElements(el)) {
      if (c.name === 'table:table-column') {
        const repeat = parseInt(c.attrs['table:number-columns-repeated'] ?? '1', 10);
        const w = columnWidth(c, ctx.styleIndex);
        for (let i = 0; i < (Number.isNaN(repeat) || repeat < 1 ? 1 : repeat); i++) widths.push(w);
      } else if (c.name === 'table:table-columns' || c.name === 'table:table-header-columns') {
        visit(c);
      }
    }
  };
  visit(tblEl);
  return widths;
}

/** Largura de uma coluna: style:table-column-properties/style:column-width. */
function columnWidth(colEl: XmlElement, index: OdfStyleIndex): number | undefined {
  const styleName = colEl.attrs['table:style-name'];
  if (!styleName) return undefined;
  const raw = index.styles.get(styleName);
  const colProps = raw?.column;
  if (!colProps) return undefined;
  return lengthToTwips(colProps.attrs['style:column-width']);
}

function buildGridCols(colWidths: (number | undefined)[], totalCols: number): number[] {
  const n = Math.max(totalCols, colWidths.length, 1);
  const known = colWidths.filter((w): w is number => w !== undefined);
  if (known.length === n) return [...known];
  // distribui igualmente a largura padrão entre as colunas sem largura.
  const each = Math.round(DEFAULT_CONTENT_WIDTH_TWIPS / n);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(colWidths[i] ?? each);
  return out;
}

function readCell(cellEl: XmlElement, ctx: ReadCtx): TableCell {
  const gridSpan = parseInt(cellEl.attrs['table:number-columns-spanned'] ?? '1', 10);
  const paragraphs: Paragraph[] = [];
  const tables: TableBlock[] = [];
  const innerBlocks: Block[] = [];
  for (const c of childElements(cellEl)) {
    readBodyChild(c, innerBlocks, ctx, 0);
  }
  for (const b of innerBlocks) {
    if (b.type === 'paragraph') paragraphs.push(b.paragraph);
    else tables.push(b);
  }
  if (paragraphs.length === 0 && tables.length === 0) paragraphs.push({ runs: [], props: {} });

  const cell: TableCell = {
    paragraphs,
    tables,
    gridSpan: Number.isNaN(gridSpan) || gridSpan < 1 ? 1 : gridSpan,
  };
  const cellStyle = cellEl.attrs['table:style-name'];
  const shading = cellShading(ctx.styleIndex, cellStyle);
  if (shading) cell.shadingHex = shading;
  const borders = cellBorders(ctx.styleIndex, cellStyle);
  if (borders) cell.borders = borders;
  return cell;
}

// ───────────────────────── imagens ─────────────────────────

function readImage(frame: XmlElement, ctx: ReadCtx): InlineImage | undefined {
  const imageEl = firstChild(frame, 'draw:image');
  if (!imageEl) return undefined;

  let data: Uint8Array | undefined;
  let ext = 'png';
  const href = imageEl.attrs['xlink:href'];
  if (href) {
    const path = href.replace(/^\.\//, '');
    data = ctx.pkg.getPart(path);
    const e = path.split('.').pop();
    if (e) ext = e.toLowerCase();
  }
  if (!data) {
    // imagem embutida em base64 (office:binary-data)
    const binary = firstChild(imageEl, 'office:binary-data');
    if (binary) {
      const b64 = textOf(binary).replace(/\s+/g, '');
      data = decodeBase64(b64);
    }
  }
  if (!data) return undefined;

  const widthTwips = lengthToTwips(frame.attrs['svg:width']) ?? 0;
  const heightTwips = lengthToTwips(frame.attrs['svg:height']) ?? 0;
  return { data, ext, widthTwips, heightTwips };
}

function decodeBase64(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

// ───────────────────────── bordas / sombreamento ─────────────────────────

function applyParaBorders(index: OdfStyleIndex, styleName: string | undefined, props: ParaProps): void {
  const borders = bordersFromStyle(index, styleName);
  if (borders) props.borders = borders;
}

/** Lê fo:border / fo:border-{side} do style:paragraph-properties resolvido. */
function bordersFromStyle(index: OdfStyleIndex, styleName: string | undefined): ParagraphBorders | undefined {
  if (!styleName) return undefined;
  const raw = index.styles.get(styleName);
  const paraEl = raw?.para;
  if (!paraEl) {
    // tenta no pai
    const parent = raw?.parent;
    return parent ? bordersFromStyle(index, parent) : undefined;
  }
  const a = paraEl.attrs;
  const all = parseBorder(a['fo:border']);
  const out: ParagraphBorders = {};
  let any = false;
  for (const [side, attr] of [
    ['top', 'fo:border-top'],
    ['left', 'fo:border-left'],
    ['bottom', 'fo:border-bottom'],
    ['right', 'fo:border-right'],
  ] as const) {
    const edge = parseBorder(a[attr]) ?? all;
    if (edge) { out[side] = edge; any = true; }
  }
  if (any) return out;
  // herda do pai se este estilo não define nada
  return raw?.parent ? bordersFromStyle(index, raw.parent) : undefined;
}

/** Converte "0.5pt solid #000000" em BorderEdge (sizeEighthPt = pt*8). */
function parseBorder(spec: string | undefined): BorderEdge | undefined {
  if (!spec || spec === 'none') return undefined;
  const parts = spec.trim().split(/\s+/);
  let widthTwips: number | undefined;
  let style = 'single';
  let color: string | undefined;
  for (const part of parts) {
    const w = lengthToTwips(part);
    if (w !== undefined) { widthTwips = w; continue; }
    if (/^#?[0-9a-fA-F]{6}$/.test(part)) { color = part.replace(/^#/, '').toUpperCase(); continue; }
    switch (part) {
      case 'solid': style = 'single'; break;
      case 'double': style = 'double'; break;
      case 'dashed': style = 'dashed'; break;
      case 'dotted': style = 'dotted'; break;
      case 'none': case 'hidden': return undefined;
      default: break;
    }
  }
  const pt = widthTwips !== undefined ? widthTwips / 20 : 0.5;
  return {
    style,
    sizeEighthPt: Math.max(2, Math.round(pt * 8)),
    color,
    spacePt: 0,
  };
}

/** Resolve o style:table-cell-properties de um estilo, subindo a cadeia de pais. */
function cellPropsEl(index: OdfStyleIndex, styleName: string | undefined, seen = new Set<string>()): XmlElement | undefined {
  if (!styleName || seen.has(styleName)) return undefined;
  seen.add(styleName);
  const raw = index.styles.get(styleName);
  if (!raw) return undefined;
  return raw.cell ?? cellPropsEl(index, raw.parent, seen);
}

function cellShading(index: OdfStyleIndex, styleName: string | undefined): string | undefined {
  const el = cellPropsEl(index, styleName);
  const bg = el?.attrs['fo:background-color'];
  if (bg && bg !== 'transparent') return bg.replace(/^#/, '').toUpperCase();
  return undefined;
}

/** Bordas de célula a partir de style:table-cell-properties (fo:border*). */
function cellBorders(index: OdfStyleIndex, styleName: string | undefined): TableBorders | undefined {
  const el = cellPropsEl(index, styleName);
  if (!el) return undefined;
  const a = el.attrs;
  const all = parseBorder(a['fo:border']);
  const out: TableBorders = {};
  let any = false;
  for (const [side, attr] of [
    ['top', 'fo:border-top'],
    ['left', 'fo:border-left'],
    ['bottom', 'fo:border-bottom'],
    ['right', 'fo:border-right'],
  ] as const) {
    const edge = parseBorder(a[attr]) ?? all;
    if (edge) { out[side] = edge; any = true; }
  }
  return any ? out : undefined;
}

// ───────────────────────── geometria de página ─────────────────────────

function readPageGeometry(stylesRoot: XmlElement | undefined, contentRoot: XmlElement): SectPr {
  const layout = findPageLayout(stylesRoot) ?? findPageLayout(contentRoot);
  if (!layout) return { ...DEFAULT_SECTPR };
  const propsEl = firstChild(layout, 'style:page-layout-properties');
  if (!propsEl) return { ...DEFAULT_SECTPR };
  const a = propsEl.attrs;
  return {
    pageWidthTwips: lengthToTwips(a['fo:page-width']) ?? DEFAULT_SECTPR.pageWidthTwips,
    pageHeightTwips: lengthToTwips(a['fo:page-height']) ?? DEFAULT_SECTPR.pageHeightTwips,
    marginLeftTwips: lengthToTwips(a['fo:margin-left']) ?? DEFAULT_SECTPR.marginLeftTwips,
    marginRightTwips: lengthToTwips(a['fo:margin-right']) ?? DEFAULT_SECTPR.marginRightTwips,
    marginTopTwips: lengthToTwips(a['fo:margin-top']) ?? DEFAULT_SECTPR.marginTopTwips,
    marginBottomTwips: lengthToTwips(a['fo:margin-bottom']) ?? DEFAULT_SECTPR.marginBottomTwips,
  };
}

function findPageLayout(root: XmlElement | undefined): XmlElement | undefined {
  if (!root) return undefined;
  const auto = firstChild(root, 'office:automatic-styles');
  const found = auto && firstChild(auto, 'style:page-layout');
  if (found) return found;
  // fallback: percorre office:styles também (raro)
  const styles = firstChild(root, 'office:styles');
  return styles ? firstChild(styles, 'style:page-layout') : undefined;
}

// ───────────────────────── StylesMap p/ o editor ─────────────────────────

/**
 * Constrói uma StylesMap (formato docx-core) a partir dos estilos ODF
 * resolvidos. Mapeia os nomes ODF de título ("Heading 1") para o id do editor
 * (Heading1) e garante entradas Heading1..6 com aparência razoável, para que o
 * editor resolva títulos mesmo sem styles.xml correspondente.
 */
function buildStylesMap(index: OdfStyleIndex): StylesMap {
  const out: StylesMap = new Map();
  for (const [name, _raw] of index.styles) {
    const resolved = resolveStyle(index, name);
    const id = normalizeStyleId(name);
    const entry: DocxResolvedStyle = {
      run: { ...resolved.run },
      para: { ...resolved.para },
    };
    out.set(id, entry);
    if (id !== name) out.set(name, entry);
  }
  // garante Heading1..6 com a aparência embutida
  for (let lvl = 1; lvl <= 6; lvl++) {
    const id = `Heading${lvl}`;
    if (!out.has(id)) {
      const look = HEADING_LOOKS[lvl]!;
      out.set(id, {
        run: { bold: look.bold, szHalfPt: look.szHalfPt, color: look.color },
        para: {},
      });
    }
  }
  return out;
}

/** "Heading 1" → "Heading1"; "Text body" → "Textbody"; remove espaços. */
function normalizeStyleId(name: string): string {
  return name.replace(/\s+/g, '');
}
