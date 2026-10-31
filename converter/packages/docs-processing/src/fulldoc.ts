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
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableBlock {
  type: 'table';
  rows: TableRow[];
  gridColsTwips: number[];
  /** w:tblBorders (incl. insideH/insideV). */
  borders?: TableBorders;
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

function readTable(tblEl: XmlElement, ctx: ReadContext): TableBlock {
  const grid = firstChild(tblEl, 'w:tblGrid');
  const gridColsTwips = grid
    ? childElements(grid, 'w:gridCol').map((c) => parseInt(c.attrs['w:w'] ?? '0', 10))
    : [];
  const tblPr = firstChild(tblEl, 'w:tblPr');
  const tblBorders = readBorderSet(tblPr && firstChild(tblPr, 'w:tblBorders'), true);
  const rows: TableRow[] = [];
  for (const trEl of childElements(tblEl, 'w:tr')) {
    const cells: TableCell[] = [];
    for (const tcEl of childElements(trEl, 'w:tc')) {
      const tcPr = firstChild(tcEl, 'w:tcPr');
      const shd = tcPr && firstChild(tcPr, 'w:shd')?.attrs['w:fill'];
      const tcW = tcPr && firstChild(tcPr, 'w:tcW');
      const cellBorders = readBorderSet(tcPr && firstChild(tcPr, 'w:tcBorders'), true);
      const gridSpan = tcPr
        ? parseInt(firstChild(tcPr, 'w:gridSpan')?.attrs['w:val'] ?? '1', 10)
        : 1;
      const paragraphs = childElements(tcEl, 'w:p').map((p) => readParagraph(p, ctx));
      const tables = childElements(tcEl, 'w:tbl').map((t) => readTable(t, ctx));
      if (paragraphs.length === 0 && tables.length === 0) paragraphs.push({ runs: [], props: {} });
      cells.push({
        paragraphs,
        tables,
        gridSpan,
        widthTwips: tcW && tcW.attrs['w:type'] === 'dxa'
          ? parseInt(tcW.attrs['w:w'] ?? '0', 10) : undefined,
        shadingHex: shd && shd !== 'auto' ? shd : undefined,
        borders: cellBorders,
      });
    }
    if (cells.length > 0) rows.push({ cells });
  }
  return { type: 'table', rows, gridColsTwips, borders: tblBorders };
}

function readHeaderFooterPart(pkg: DocxPackage, path: string): Paragraph[] | undefined {
  const xml = pkg.getPartText(path);
  if (!xml) return undefined;
  const root = parseXml(xml);
  const partName = path.split('/').pop()!;
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  const paras: Paragraph[] = [];
  for (const child of childElements(root)) {
    if (child.name === 'w:p') paras.push(readParagraph(child, ctx));
    else if (child.name === 'w:tbl') {
      const t = readTable(child, ctx);
      for (const r of t.rows) for (const c of r.cells) paras.push(...c.paragraphs);
    }
  }
  return paras;
}

function readNotesPart(
  pkg: DocxPackage,
  path: string,
  elementName: string,
): Map<number, Paragraph[]> {
  const out = new Map<number, Paragraph[]>();
  const xml = pkg.getPartText(path);
  if (!xml) return out;
  const root = parseXml(xml);
  const partName = path.split('/').pop()!;
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  for (const note of childElements(root, elementName)) {
    const id = parseInt(note.attrs['w:id'] ?? '0', 10);
    const type = note.attrs['w:type'];
    if (type === 'separator' || type === 'continuationSeparator') continue;
    out.set(id, childElements(note, 'w:p').map((p) => readParagraph(p, ctx)));
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

export function readFullDocument(pkg: DocxPackage): FullDocument {
  const root = parseXml(pkg.documentXml());
  const body = firstChild(root, 'w:body');
  if (!body) throw new Error('w:document sem w:body');
  const ctx = buildReadContext(pkg, 'word/_rels/document.xml.rels');

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

  const readHfSet = (
    sectEl: XmlElement,
    kind: 'headerReference' | 'footerReference',
  ): { set: HeaderFooterSet; refs: HfRef[] } => {
    const set: HeaderFooterSet = {};
    const refs: HfRef[] = [];
    for (const ref of childElements(sectEl, `w:${kind}`)) {
      const rid = ref.attrs['r:id'];
      const type = (ref.attrs['w:type'] ?? 'default') as keyof HeaderFooterSet;
      const target = rid && relTargets.get(rid);
      if (target && rid) {
        const paras = readHeaderFooterPart(pkg, target);
        if (paras) {
          set[type] = paras;
          refs.push({ type, rid, path: target });
        }
      }
    }
    return { set, refs };
  };

  const blocks: Block[] = [];
  const sections: Section[] = [];
  const bookmarks = new Map<string, number>();
  ctx.onBookmark = (name) => {
    if (!bookmarks.has(name)) bookmarks.set(name, blocks.length);
  };
  let sectionStart = 0;

  const closeSection = (sectEl: XmlElement, endBlock: number) => {
    const h = readHfSet(sectEl, 'headerReference');
    const f = readHfSet(sectEl, 'footerReference');
    sections.push({
      sectPr: readSectPr(sectEl),
      blockStart: sectionStart,
      blockEnd: endBlock,
      headers: h.set,
      footers: f.set,
      headerRefs: h.refs,
      footerRefs: f.refs,
    });
    sectionStart = endBlock + 1;
  };

  for (const child of childElements(body)) {
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
    } else if (child.name === 'w:sdt') {
      // sumário etc.: conteúdo de sdt no nível do body
      const content = firstChild(child, 'w:sdtContent');
      if (content) {
        for (const inner of childElements(content)) {
          if (inner.name === 'w:p') blocks.push({ type: 'paragraph', paragraph: readParagraph(inner, ctx) });
          else if (inner.name === 'w:tbl') blocks.push(readTable(inner, ctx));
        }
      }
    }
  }
  if (sections.length === 0) {
    closeSection(firstChild(body, 'w:sectPr') ?? { name: 'w:sectPr', attrs: {}, children: [] }, blocks.length - 1);
  }
  if (blocks.length === 0) blocks.push({ type: 'paragraph', paragraph: { runs: [], props: {} } });

  return {
    blocks,
    sections,
    footnotes: readNotesPart(pkg, 'word/footnotes.xml', 'w:footnote'),
    endnotes: readNotesPart(pkg, 'word/endnotes.xml', 'w:endnote'),
    comments: readComments(pkg),
    styles: readStyles(pkg),
    bookmarks,
  };
}
