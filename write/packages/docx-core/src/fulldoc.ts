import { DocxPackage } from './package.js';
import { parseXml, childElements, firstChild, type XmlElement } from './xml.js';
import {
  readParagraph,
  readSectPr,
  buildReadContext,
  readBorderEdge,
  type Paragraph,
  type SectPr,
  type ReadContext,
  type BorderEdge,
} from './document.js';
import { readStyles, type StylesMap } from './styles.js';
import { readTblPr, readTrPr, readTcPr, readBorder, type TblPr, type TrPr, type TcPr, type BorderSpec } from './ooxml/props.js';
import { readDocFormatting, type DocFormatting } from './ooxml/parts.js';
import { SourceStore, type StoryGroup, type StorySource } from './source.js';

/**
 * Modelo completo do documento: blocos (parágrafos E tabelas), seções
 * múltiplas com headers/footers, notas de rodapé/fim e comentários.
 * É o modelo usado pelo renderer; readDocument (plano) permanece para
 * o caminho de edição simples.
 */

export interface TableBorders {
  top?: BorderEdge;
  left?: BorderEdge;
  bottom?: BorderEdge;
  right?: BorderEdge;
  insideH?: BorderEdge;
  insideV?: BorderEdge;
}

export interface TableCell {
  paragraphs: Paragraph[];
  /** Tabelas aninhadas dentro da célula (preservadas no modelo). */
  tables: TableBlock[];
  widthTwips?: number;
  shadingHex?: string;
  gridSpan: number;
  /** w:tcBorders — sobrepõe as bordas da tabela nesta célula. */
  borders?: TableBorders;
  /** w:tcPr completo (tri-estado) — motor de layout. */
  tcPr?: TcPr;
  /** Conteúdo da célula NA ORDEM (parágrafos e tabelas aninhadas intercalados). */
  blocks?: Block[];
  /** Id da fonte XML original da célula (source.ts) — salvamento sem perdas. */
  src?: number;
}

export interface TableRow {
  cells: TableCell[];
  /** w:trPr completo — motor de layout. */
  trPr?: TrPr;
  /** w:tblPrEx — exceções de propriedades da tabela nesta linha. */
  tblPrEx?: TblPr;
  /** Id da fonte XML original da linha (source.ts) — salvamento sem perdas. */
  src?: number;
}

export interface TableBlock {
  type: 'table';
  rows: TableRow[];
  gridColsTwips: number[];
  /** w:tblBorders (incl. insideH/insideV). */
  borders?: TableBorders;
  /** w:tblPr completo (tri-estado) — motor de layout. */
  tblPr?: TblPr;
  /** Id da fonte XML original (source.ts) — salvamento sem perdas. */
  src?: number;
}

export interface ParagraphBlock {
  type: 'paragraph';
  paragraph: Paragraph;
}

export type Block = ParagraphBlock | TableBlock;

export interface HeaderFooterSet {
  default?: Paragraph[];
  first?: Paragraph[];
  even?: Paragraph[];
}

export interface HfRef {
  type: 'default' | 'first' | 'even';
  rid: string;
  /** caminho da parte no pacote (word/header1.xml...). */
  path: string;
}

export interface Section {
  sectPr: SectPr;
  /** w:sectPr completo (tipo de quebra, grade, bordas de página…) — motor de layout. */
  sect?: SectionProps;
  /** Cabeçalhos/rodapés como BLOCOS (tabelas preservadas) — motor de layout. */
  headerBlocks?: { default?: Block[]; first?: Block[]; even?: Block[] };
  footerBlocks?: { default?: Block[]; first?: Block[]; even?: Block[] };
  /** Intervalo [blockStart, blockEnd] de blocos cobertos pela seção. */
  blockStart: number;
  blockEnd: number;
  headers: HeaderFooterSet;
  footers: HeaderFooterSet;
  headerRefs: HfRef[];
  footerRefs: HfRef[];
}

export interface CommentInfo {
  id: number;
  author?: string;
  text: string;
}

export interface FullDocument {
  blocks: Block[];
  sections: Section[];
  footnotes: Map<number, Paragraph[]>;
  endnotes: Map<number, Paragraph[]>;
  comments: CommentInfo[];
  /** Estilos resolvidos de styles.xml (basedOn + docDefaults). */
  styles: StylesMap;
  /** Bookmarks: nome → índice do bloco onde começa. */
  bookmarks: Map<string, number>;
  /** Posição de cada bookmark no texto do parágrafo onde começa (run.text concatenado). */
  bookmarkOffsets?: Map<string, number>;
  /** Estilos/numeração/tema/configurações/fontes CRUS — motor de layout. */
  formatting?: DocFormatting;
  /** Notas como blocos (tabelas preservadas). */
  footnoteBlocks?: Map<number, Block[]>;
  endnoteBlocks?: Map<number, Block[]>;
  /** docProps/core.xml (W3CDTF) — campos CREATEDATE/SAVEDATE/PRINTDATE. */
  coreProps?: { created?: string; modified?: string; lastPrinted?: string };
  /** w:background (cor da página): hex e/ou cor do tema com tom/sombra. */
  background?: { color?: string; themeColor?: string; themeTint?: string; themeShade?: string };
  /** XML original (salvamento sem perdas) — ver source.ts. */
  sources?: SourceStore;
}

/** w:sectPr além da geometria básica do SectPr. */
export interface SectionProps {
  /** nextPage | continuous | evenPage | oddPage | nextColumn */
  type: string;
  /** w:pgSz w:orient */
  orient?: 'portrait' | 'landscape';
  /** w:pgMar w:gutter */
  gutter?: number;
  /** colunas de largura desigual (w:col). */
  colDefs?: { w: number; space: number }[];
  equalWidth?: boolean;
  /** w:vAlign — alinhamento vertical do texto na página. */
  vAlign?: string;
  /** w:docGrid */
  docGrid?: { type?: string; linePitch?: number; charSpace?: number };
  /** w:pgBorders */
  pgBorders?: {
    offsetFrom?: string; display?: string; zOrder?: string;
    top?: BorderSpec; left?: BorderSpec; bottom?: BorderSpec; right?: BorderSpec;
  };
  /** w:pgNumType w:fmt */
  pgNumFmt?: string;
  /** w:lnNumType */
  lnNumType?: { countBy?: number; start?: number; restart?: string; distance?: number };
  bidi?: boolean;
  rtlGutter?: boolean;
  formProt?: boolean;
  noEndnote?: boolean;
}

function readBorderSet(el: XmlElement | undefined, inside: boolean): TableBorders | undefined {
  if (!el) return undefined;
  const out: TableBorders = {};
  const sides = inside
    ? (['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const)
    : (['top', 'left', 'bottom', 'right'] as const);
  let any = false;
  for (const side of sides) {
    const edge = readBorderEdge(firstChild(el, `w:${side}`));
    if (edge) { out[side] = edge; any = true; }
  }
  return any ? out : undefined;
}

/** Linhas/células podem vir dentro de w:sdt ou w:customXml (controles de conteúdo). */
function unwrap(el: XmlElement, name: string): XmlElement[] {
  const out: XmlElement[] = [];
  for (const c of childElements(el)) {
    if (c.name === name) out.push(c);
    else if (c.name === 'w:sdt') {
      const content = firstChild(c, 'w:sdtContent');
      if (content) out.push(...unwrap(content, name));
    } else if (c.name === 'w:customXml') out.push(...unwrap(c, name));
  }
  return out;
}

/** Blocos (w:p / w:tbl) de um container, na ordem, atravessando sdt/customXml. */
export function readBlocksOf(container: XmlElement, ctx: ReadContext): Block[] {
  const out: Block[] = [];
  for (const c of childElements(container)) {
    if (c.name === 'w:p') out.push({ type: 'paragraph', paragraph: readParagraph(c, ctx) });
    else if (c.name === 'w:tbl') out.push(readTable(c, ctx));
    else if (c.name === 'w:sdt') {
      const content = firstChild(c, 'w:sdtContent');
      if (content) out.push(...readBlocksOf(content, ctx));
    } else if (c.name === 'w:customXml') out.push(...readBlocksOf(c, ctx));
  }
  return out;
}

function readTable(tblEl: XmlElement, ctx: ReadContext): TableBlock {
  const xml = ctx.sources && tblEl.s !== undefined ? ctx.sourceXml : undefined;
  const slice = (el: XmlElement | undefined): string | undefined => (el && xml !== undefined ? xml.slice(el.s, el.e) : undefined);
  const openOf = (el: XmlElement): string => xml!.slice(el.s, el.cs === el.e ? el.e : el.cs).replace(/\s*\/>$/, '>');
  const grid = firstChild(tblEl, 'w:tblGrid');
  const gridColsTwips = grid
    ? childElements(grid, 'w:gridCol').map((c) => parseInt(c.attrs['w:w'] ?? '0', 10) || 0)
    : [];
  const tblPrEl = firstChild(tblEl, 'w:tblPr');
  const tblBorders = readBorderSet(tblPrEl && firstChild(tblPrEl, 'w:tblBorders'), true);
  const rows: TableRow[] = [];
  for (const trEl of unwrap(tblEl, 'w:tr')) {
    const cells: TableCell[] = [];
    for (const tcEl of unwrap(trEl, 'w:tc')) {
      const tcPrEl = firstChild(tcEl, 'w:tcPr');
      const tcPr = readTcPr(tcPrEl);
      const shd = tcPrEl && firstChild(tcPrEl, 'w:shd')?.attrs['w:fill'];
      const tcW = tcPrEl && firstChild(tcPrEl, 'w:tcW');
      const cellBorders = readBorderSet(tcPrEl && firstChild(tcPrEl, 'w:tcBorders'), true);
      const blocks = readBlocksOf(tcEl, ctx);
      if (!blocks.some((bl) => bl.type === 'paragraph')) blocks.push({ type: 'paragraph', paragraph: { runs: [], props: {} } });
      const paragraphs = blocks.filter((bl): bl is ParagraphBlock => bl.type === 'paragraph').map((bl) => bl.paragraph);
      const tables = blocks.filter((bl): bl is TableBlock => bl.type === 'table');
      const cell: TableCell = {
        paragraphs,
        tables,
        gridSpan: tcPr?.gridSpan ?? 1,
        widthTwips: tcW && tcW.attrs['w:type'] === 'dxa'
          ? parseInt(tcW.attrs['w:w'] ?? '0', 10) : undefined,
        shadingHex: shd && shd !== 'auto' ? shd : undefined,
        borders: cellBorders,
        blocks,
      };
      if (tcPr) cell.tcPr = tcPr;
      if (xml !== undefined) {
        const tcPrRaw = slice(tcPrEl);
        ctx.sources!.addCell(cell, { open: openOf(tcEl), ...(tcPrRaw ? { tcPr: tcPrRaw } : {}) });
      }
      cells.push(cell);
    }
    if (cells.length > 0) {
      const row: TableRow = { cells };
      const trPr = readTrPr(firstChild(trEl, 'w:trPr'));
      if (trPr) row.trPr = trPr;
      const ex = readTblPr(firstChild(trEl, 'w:tblPrEx'));
      if (ex) row.tblPrEx = ex;
      if (xml !== undefined) {
        const trPrRaw = slice(firstChild(trEl, 'w:trPr'));
        const exRaw = slice(firstChild(trEl, 'w:tblPrEx'));
        ctx.sources!.addRow(row, { open: openOf(trEl), ...(trPrRaw ? { trPr: trPrRaw } : {}), ...(exRaw ? { tblPrEx: exRaw } : {}) });
      }
      rows.push(row);
    }
  }
  const table: TableBlock = { type: 'table', rows, gridColsTwips, borders: tblBorders };
  const tblPr = readTblPr(tblPrEl);
  if (tblPr) table.tblPr = tblPr;
  if (xml !== undefined) {
    const tblPrRaw = slice(tblPrEl);
    const gridRaw = slice(grid);
    ctx.sources!.addTable(table, {
      raw: xml.slice(tblEl.s, tblEl.e),
      at: tblEl.s,
      open: openOf(tblEl),
      ...(tblPrRaw ? { tblPr: tblPrRaw } : {}),
      ...(gridRaw ? { tblGrid: gridRaw } : {}),
    });
  }
  return table;
}

/**
 * Marca o ÚLTIMO parágrafo de cada seção (menos a final) com `props.sectionBreak`
 * — é por ele que o salvar grava as quebras de seção (geometria, orientação,
 * refs de cabeçalho/rodapé). Seção que termina numa tabela: o último parágrafo
 * antes dela.
 */
export function markSectionBreaks(full: FullDocument): void {
  for (let si = 0; si < full.sections.length - 1; si++) {
    const s = full.sections[si]!;
    let b = Math.min(s.blockEnd, full.blocks.length - 1);
    while (b >= 0 && full.blocks[b]!.type !== 'paragraph') b--;
    const block = full.blocks[b];
    if (block?.type !== 'paragraph') continue;
    block.paragraph.props.sectionBreak = {
      sectPr: s.sectPr,
      headerRefs: s.headerRefs.map((r) => ({ kind: 'header' as const, type: r.type, rid: r.rid })),
      footerRefs: s.footerRefs.map((r) => ({ kind: 'footer' as const, type: r.type, rid: r.rid })),
    };
  }
}

/** id de origem de um bloco (parágrafo: props.src; tabela: src). */
export function blockSrc(b: Block): number | undefined {
  return b.type === 'paragraph' ? b.paragraph.props.src : b.src;
}

/** Abre a captura de uma parte: container cujos filhos de topo viram grupos. */
function storyOf(xml: string, container: XmlElement): StorySource {
  return { open: xml.slice(0, container.cs), close: xml.slice(container.ce), groups: [] };
}

/** Grupo de um filho de topo: os blocos que ele produziu (e o envoltório sdt/customXml). */
function groupOf(xml: string, child: XmlElement, produced: Block[], store: SourceStore): StoryGroup {
  const ids = produced.map((b) => blockSrc(b) ?? 0);
  const g: StoryGroup = { raw: xml.slice(child.s, child.e), blocks: ids };
  const content = child.name === 'w:sdt' ? firstChild(child, 'w:sdtContent') : child.name === 'w:customXml' ? child : undefined;
  if (content && content.cs !== undefined && content.cs !== content.e) {
    // o envoltório vai até o conteúdo (w:customXmlPr fica nele)
    let start = content.cs;
    if (content === child) for (const k of childElements(child)) { if (k.name.endsWith('Pr')) start = k.e!; else break; }
    g.wrapOpen = xml.slice(child.s, start);
    g.wrapClose = xml.slice(content.ce, child.e);
    // filhos do conteúdo: cada um com os blocos que estão dentro dele
    g.inner = childElements(content).filter((k) => !k.name.endsWith('Pr')).map((k) => {
      const inside = produced.filter((b, i) => { const at = store.atOf(ids[i]!); return at !== undefined && at >= k.s! && at < k.e!; });
      return groupOf(xml, k, inside, store);
    });
  }
  return g;
}

function readHeaderFooterPart(pkg: DocxPackage, path: string, store?: SourceStore): { paras: Paragraph[]; blocks: Block[] } | undefined {
  const xml = pkg.getPartText(path);
  if (!xml) return undefined;
  const root = parseXml(xml, { positions: !!store });
  const partName = path.split('/').pop()!;
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  ctx.readBlocks = readBlocksOf;
  let blocks: Block[];
  if (!store) blocks = readBlocksOf(root, ctx);
  else {
    ctx.sources = store;
    ctx.sourceXml = xml;
    const story = storyOf(xml, root);
    blocks = [];
    for (const c of childElements(root)) {
      const produced = readBlocksOf({ name: root.name, attrs: {}, children: [c] }, ctx);
      story.groups.push(groupOf(xml, c, produced, store));
      blocks.push(...produced);
    }
    store.stories.set(path, story);
  }
  // modelo de edição (achatado): parágrafos do topo + os das células
  const paras: Paragraph[] = [];
  const walk = (bs: Block[]) => {
    for (const bl of bs) {
      if (bl.type === 'paragraph') paras.push(bl.paragraph);
      else for (const r of bl.rows) for (const c of r.cells) walk(c.blocks ?? []);
    }
  };
  walk(blocks);
  return { paras, blocks };
}

function readNotesPart(
  pkg: DocxPackage,
  path: string,
  elementName: string,
  blocksOut?: Map<number, Block[]>,
): Map<number, Paragraph[]> {
  const out = new Map<number, Paragraph[]>();
  const xml = pkg.getPartText(path);
  if (!xml) return out;
  const root = parseXml(xml);
  const partName = path.split('/').pop()!;
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  ctx.readBlocks = readBlocksOf;
  for (const note of childElements(root, elementName)) {
    const id = parseInt(note.attrs['w:id'] ?? '0', 10);
    const type = note.attrs['w:type'];
    if (type === 'separator' || type === 'continuationSeparator' || type === 'continuationNotice') continue;
    const blocks = readBlocksOf(note, ctx);
    out.set(id, blocks.filter((bl): bl is ParagraphBlock => bl.type === 'paragraph').map((bl) => bl.paragraph));
    blocksOut?.set(id, blocks);
  }
  return out;
}

function readComments(pkg: DocxPackage): CommentInfo[] {
  const xml = pkg.getPartText('word/comments.xml');
  if (!xml) return [];
  const root = parseXml(xml);
  const ctx = buildReadContext(pkg, 'word/_rels/comments.xml.rels');
  return childElements(root, 'w:comment').map((c) => ({
    id: parseInt(c.attrs['w:id'] ?? '0', 10),
    author: c.attrs['w:author'],
    text: childElements(c, 'w:p')
      .map((p) => readParagraph(p, ctx).runs.map((r) => r.text).join(''))
      .join('\n'),
  }));
}

export function readFullDocument(pkg: DocxPackage, opts: { sources?: boolean } = {}): FullDocument {
  const docXml = pkg.documentXml();
  const store = opts.sources ? new SourceStore() : undefined;
  const root = parseXml(docXml, { positions: !!store });
  const body = firstChild(root, 'w:body');
  if (!body) throw new Error('w:document sem w:body');
  const ctx = buildReadContext(pkg, 'word/_rels/document.xml.rels');
  ctx.readBlocks = readBlocksOf;
  const story = store ? storyOf(docXml, body) : undefined;
  if (store) {
    ctx.sources = store;
    ctx.sourceXml = docXml;
    store.stories.set('word/document.xml', story!);
  }

  // rels do documento p/ resolver headers/footers por r:id
  const relsXml = pkg.getPartText('word/_rels/document.xml.rels');
  const relTargets = new Map<string, string>();
  if (relsXml) {
    for (const rel of childElements(parseXml(relsXml), 'Relationship')) {
      if (rel.attrs['Id'] && rel.attrs['Target']) {
        relTargets.set(rel.attrs['Id'], `word/${rel.attrs['Target'].replace(/^\.\//, '')}`);
      }
    }
  }

  const hfCache = new Map<string, { paras: Paragraph[]; blocks: Block[] } | undefined>();
  type HfBlocks = { default?: Block[]; first?: Block[]; even?: Block[] };
  const readHfSet = (
    sectEl: XmlElement,
    kind: 'headerReference' | 'footerReference',
  ): { set: HeaderFooterSet; refs: HfRef[]; blocks: HfBlocks } => {
    const set: HeaderFooterSet = {};
    const refs: HfRef[] = [];
    const blocks: HfBlocks = {};
    for (const ref of childElements(sectEl, `w:${kind}`)) {
      const rid = ref.attrs['r:id'];
      const type = (ref.attrs['w:type'] ?? 'default') as keyof HeaderFooterSet;
      const target = rid && relTargets.get(rid);
      if (target && rid) {
        if (!hfCache.has(target)) hfCache.set(target, readHeaderFooterPart(pkg, target, store));
        const part = hfCache.get(target);
        if (part) {
          set[type] = part.paras;
          blocks[type] = part.blocks;
          refs.push({ type, rid, path: target });
        }
      }
    }
    return { set, refs, blocks };
  };

  const blocks: Block[] = [];
  const sections: Section[] = [];
  const bookmarks = new Map<string, number>();
  const bookmarkOffsets = new Map<string, number>();
  ctx.onBookmark = (name, offset) => {
    if (!bookmarks.has(name)) { bookmarks.set(name, blocks.length); bookmarkOffsets.set(name, offset); }
  };
  let sectionStart = 0;

  const closeSection = (sectEl: XmlElement, endBlock: number) => {
    const h = readHfSet(sectEl, 'headerReference');
    const f = readHfSet(sectEl, 'footerReference');
    sections.push({
      sectPr: readSectPr(sectEl),
      sect: readSectionProps(sectEl),
      blockStart: sectionStart,
      blockEnd: endBlock,
      headers: h.set,
      footers: f.set,
      headerRefs: h.refs,
      footerRefs: f.refs,
      headerBlocks: h.blocks,
      footerBlocks: f.blocks,
    });
    sectionStart = endBlock + 1;
  };

  const readBlocksWithSections = (container: XmlElement): { block: Block; sectEl?: XmlElement }[] => {
    const out: { block: Block; sectEl?: XmlElement }[] = [];
    for (const c of childElements(container)) {
      if (c.name === 'w:p') {
        const pPr = firstChild(c, 'w:pPr');
        const sectEl = pPr && firstChild(pPr, 'w:sectPr');
        out.push({ block: { type: 'paragraph', paragraph: readParagraph(c, ctx) }, ...(sectEl ? { sectEl } : {}) });
      } else if (c.name === 'w:tbl') out.push({ block: readTable(c, ctx) });
      else if (c.name === 'w:sdt') {
        const content = firstChild(c, 'w:sdtContent');
        if (content) out.push(...readBlocksWithSections(content));
      } else if (c.name === 'w:customXml') out.push(...readBlocksWithSections(c));
    }
    return out;
  };

  const bodyKids = childElements(body);
  for (const child of bodyKids) {
    const before = blocks.length;
    if (child.name === 'w:p') {
      const para = readParagraph(child, ctx);
      blocks.push({ type: 'paragraph', paragraph: para });
      const pPr = firstChild(child, 'w:pPr');
      const sectEl = pPr && firstChild(pPr, 'w:sectPr');
      if (sectEl) closeSection(sectEl, blocks.length - 1);
    } else if (child.name === 'w:tbl') {
      blocks.push(readTable(child, ctx));
    } else if (child.name === 'w:sectPr') {
      closeSection(child, blocks.length - 1);
    } else if (child.name === 'w:sdt' || child.name === 'w:customXml') {
      // sumário etc.: conteúdo de sdt no nível do body (pode conter sectPr em pPr)
      const content = child.name === 'w:sdt' ? firstChild(child, 'w:sdtContent') : child;
      if (content) {
        for (const inner of readBlocksWithSections(content)) {
          blocks.push(inner.block);
          if (inner.sectEl) closeSection(inner.sectEl, blocks.length - 1);
        }
      }
    }
    if (story) {
      if (child.name === 'w:sectPr' && child === bodyKids[bodyKids.length - 1]) story.sectPr = docXml.slice(child.s, child.e);
      else story.groups.push(groupOf(docXml, child, blocks.slice(before), store!));
    }
  }
  if (sections.length === 0) {
    closeSection(firstChild(body, 'w:sectPr') ?? { name: 'w:sectPr', attrs: {}, children: [] }, blocks.length - 1);
  }
  if (blocks.length === 0) blocks.push({ type: 'paragraph', paragraph: { runs: [], props: {} } });

  const comments = readComments(pkg);
  if (store) {
    for (const c of comments) store.commentIds.add(c.id);
    store.commentsSig = JSON.stringify(comments);
  }
  const footnoteBlocks = new Map<number, Block[]>();
  const endnoteBlocks = new Map<number, Block[]>();
  return {
    blocks,
    sections,
    footnotes: readNotesPart(pkg, 'word/footnotes.xml', 'w:footnote', footnoteBlocks),
    endnotes: readNotesPart(pkg, 'word/endnotes.xml', 'w:endnote', endnoteBlocks),
    comments,
    styles: readStyles(pkg),
    bookmarks,
    bookmarkOffsets,
    formatting: readDocFormatting(pkg),
    footnoteBlocks,
    endnoteBlocks,
    ...readCoreProps(pkg),
    ...readBackground(root),
    ...(store ? { sources: store } : {}),
  };
}

/** Cor de fundo da página (w:document/w:background). */
function readBackground(root: ReturnType<typeof parseXml>): { background?: FullDocument['background'] } {
  const bg = firstChild(root, 'w:background');
  if (!bg) return {};
  const out: NonNullable<FullDocument['background']> = {};
  for (const k of ['color', 'themeColor', 'themeTint', 'themeShade'] as const) {
    const v = bg.attrs[`w:${k}`];
    if (v) out[k] = v;
  }
  return Object.keys(out).length ? { background: out } : {};
}

/** Datas do docProps/core.xml (criação, última gravação, última impressão). */
function readCoreProps(pkg: DocxPackage): { coreProps?: FullDocument['coreProps'] } {
  const xml = pkg.getPartText('docProps/core.xml');
  if (!xml) return {};
  const get = (tag: string) => { const m = new RegExp('<' + tag + '[^>]*>([^<]*)<').exec(xml); return m ? m[1]!.trim() : undefined; };
  const created = get('dcterms:created'), modified = get('dcterms:modified'), lastPrinted = get('cp:lastPrinted');
  return { coreProps: { ...(created ? { created } : {}), ...(modified ? { modified } : {}), ...(lastPrinted ? { lastPrinted } : {}) } };
}

/** w:sectPr → SectionProps (o que o SectPr básico não cobre). */
export function readSectionProps(sectEl: XmlElement): SectionProps {
  const v = (n: string, a = 'w:val') => firstChild(sectEl, n)?.attrs[a];
  const out: SectionProps = { type: v('w:type') ?? 'nextPage' };
  const pgSz = firstChild(sectEl, 'w:pgSz');
  const orient = pgSz?.attrs['w:orient'];
  if (orient === 'landscape' || orient === 'portrait') out.orient = orient;
  const gutter = firstChild(sectEl, 'w:pgMar')?.attrs['w:gutter'];
  if (gutter) out.gutter = parseInt(gutter, 10) || 0;
  const cols = firstChild(sectEl, 'w:cols');
  if (cols) {
    const eq = cols.attrs['w:equalWidth'];
    if (eq !== undefined) out.equalWidth = !(eq === '0' || eq === 'false');
    const defs = childElements(cols, 'w:col').map((c) => ({ w: parseInt(c.attrs['w:w'] ?? '0', 10) || 0, space: parseInt(c.attrs['w:space'] ?? '0', 10) || 0 }));
    if (defs.length) out.colDefs = defs;
  }
  const va = v('w:vAlign');
  if (va) out.vAlign = va;
  const dg = firstChild(sectEl, 'w:docGrid');
  if (dg) {
    out.docGrid = {};
    if (dg.attrs['w:type']) out.docGrid.type = dg.attrs['w:type'];
    if (dg.attrs['w:linePitch']) out.docGrid.linePitch = parseInt(dg.attrs['w:linePitch'], 10);
    if (dg.attrs['w:charSpace']) out.docGrid.charSpace = parseInt(dg.attrs['w:charSpace'], 10);
  }
  const pb = firstChild(sectEl, 'w:pgBorders');
  if (pb) {
    out.pgBorders = {};
    if (pb.attrs['w:offsetFrom']) out.pgBorders.offsetFrom = pb.attrs['w:offsetFrom'];
    if (pb.attrs['w:display']) out.pgBorders.display = pb.attrs['w:display'];
    if (pb.attrs['w:zOrder']) out.pgBorders.zOrder = pb.attrs['w:zOrder'];
    for (const side of ['top', 'left', 'bottom', 'right'] as const) {
      const bd = readBorder(firstChild(pb, `w:${side}`));
      if (bd) out.pgBorders[side] = bd;
    }
  }
  const fmt = firstChild(sectEl, 'w:pgNumType')?.attrs['w:fmt'];
  if (fmt) out.pgNumFmt = fmt;
  const ln = firstChild(sectEl, 'w:lnNumType');
  if (ln) {
    out.lnNumType = {};
    if (ln.attrs['w:countBy']) out.lnNumType.countBy = parseInt(ln.attrs['w:countBy'], 10);
    if (ln.attrs['w:start']) out.lnNumType.start = parseInt(ln.attrs['w:start'], 10);
    if (ln.attrs['w:restart']) out.lnNumType.restart = ln.attrs['w:restart'];
    if (ln.attrs['w:distance']) out.lnNumType.distance = parseInt(ln.attrs['w:distance'], 10);
  }
  if (firstChild(sectEl, 'w:bidi')) out.bidi = true;
  if (firstChild(sectEl, 'w:rtlGutter')) out.rtlGutter = true;
  if (firstChild(sectEl, 'w:formProt')) out.formProt = true;
  if (firstChild(sectEl, 'w:noEndnote')) out.noEndnote = true;
  return out;
}
