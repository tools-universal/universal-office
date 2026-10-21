import type {
  Block, FullDocument, Paragraph, Section, SectPr, TableBlock, TableCell,
} from '@universal-office/docx-core';
import { cellAtGrid, cellBlocks, paragraphAtPath, type LaidOutLine } from '@universal-office/docx-layout';

// navegação pelas referências do motor: mora no docx-layout (o viewer usa também)
export { cellAtGrid, cellBlocks, paragraphAtPath };

/**
 * Ponte entre o estado de EDIÇÃO do <universal-write> e o motor de layout:
 *  - monta o FullDocument do motor a partir do estado VIVO (parágrafos do
 *    modelo + tabelas ancoradas + seções), sem serializar;
 *  - mapeia as referências das linhas do motor ("b12", "b3/r0/c1/b0"…) de
 *    volta para posições do editor;
 *  - cursor/clique por caractere a partir de LaidOutLine.chars.
 */

/** Origem de cada bloco do documento do motor no estado de edição. */
export type BlockOrigin = { kind: 'para'; para: number } | { kind: 'table'; anchor: number };

export interface EngineDocInput {
  fullDoc: FullDocument | null;
  paragraphs: Paragraph[];
  tableAnchors: readonly { beforePara: number; table: TableBlock }[];
  sectionStarts: readonly { startPara: number; section: Section }[];
  /** geometria do documento sem seções (documento novo) */
  sectPr: SectPr;
  /** indicadores → índice do parágrafo (acompanha as edições) */
  bookmarkParas?: ReadonlyMap<string, number>;
}

export interface EngineDoc {
  full: FullDocument;
  /** bloco do motor → origem no editor */
  origins: BlockOrigin[];
  /** parágrafo do modelo → índice do bloco no motor */
  paraBlock: number[];
  /** seção do motor → índice em sectionStarts (seções vazias são omitidas) */
  sectionMap: number[];
}

/** Documento do motor com os blocos refeitos do modelo vivo. */
export function buildEngineDoc(input: EngineDocInput): EngineDoc {
  const { fullDoc, paragraphs, tableAnchors } = input;
  const blocks: Block[] = [];
  const origins: BlockOrigin[] = [];
  const paraBlock: number[] = [];
  /** 1º bloco emitido para o parágrafo (tabela ancorada antes dele, se houver) */
  const firstBlockOf: number[] = [];
  // tabelas por parágrafo âncora (na ordem de tableAnchors)
  const before = new Map<number, number[]>();
  tableAnchors.forEach((a, i) => {
    const k = Math.min(a.beforePara, paragraphs.length);
    let l = before.get(k);
    if (!l) before.set(k, (l = []));
    l.push(i);
  });
  paragraphs.forEach((paragraph, pi) => {
    firstBlockOf[pi] = blocks.length;
    for (const ai of before.get(pi) ?? []) {
      blocks.push(reconcileTableCells(tableAnchors[ai]!.table));
      origins.push({ kind: 'table', anchor: ai });
    }
    paraBlock[pi] = blocks.length;
    blocks.push({ type: 'paragraph', paragraph });
    origins.push({ kind: 'para', para: pi });
  });
  for (const ai of before.get(paragraphs.length) ?? []) {
    blocks.push(reconcileTableCells(tableAnchors[ai]!.table));
    origins.push({ kind: 'table', anchor: ai });
  }

  // seções: os intervalos seguem os parágrafos ATUAIS (startPara é deslocado
  // nas edições); seção que ficou sem blocos sai (o Word funde a quebra)
  const secs: Section[] = [];
  const sectionMap: number[] = [];
  const starts = input.sectionStarts.length
    ? input.sectionStarts
    : (fullDoc?.sections.length ? [{ startPara: 0, section: fullDoc.sections[0]! }] : []);
  if (!starts.length) {
    secs.push({
      sectPr: input.sectPr, blockStart: 0, blockEnd: blocks.length - 1,
      headers: {}, footers: {}, headerRefs: [], footerRefs: [],
    });
    sectionMap.push(0);
  } else {
    const startBlock = (i: number): number => {
      if (i === 0) return 0;
      const sp = starts[i]!.startPara;
      return sp >= paragraphs.length ? blocks.length : firstBlockOf[sp]!;
    };
    for (let i = 0; i < starts.length; i++) {
      const a = startBlock(i);
      const b = i + 1 < starts.length ? startBlock(i + 1) - 1 : blocks.length - 1;
      if (b < a && secs.length) continue; // vazia
      const s = starts[i]!.section;
      secs.push({
        ...s,
        ...withPgBorders(s),
        blockStart: a,
        blockEnd: Math.max(a - 1, b),
        headerBlocks: reconcileSet(s.headerBlocks, s.headers),
        footerBlocks: reconcileSet(s.footerBlocks, s.footers),
      });
      sectionMap.push(i);
    }
    // a última seção sempre fecha no fim do documento
    secs[secs.length - 1]!.blockEnd = blocks.length - 1;
  }

  // indicadores: nome → bloco ATUAL do parágrafo
  let bookmarks = fullDoc?.bookmarks ?? new Map<string, number>();
  if (input.bookmarkParas) {
    bookmarks = new Map();
    for (const [name, pi] of input.bookmarkParas) {
      const b = paraBlock[Math.min(Math.max(0, pi), paragraphs.length - 1)];
      if (b !== undefined) bookmarks.set(name, b);
    }
  }

  const full: FullDocument = {
    ...(fullDoc ?? { footnotes: new Map(), endnotes: new Map(), comments: [], styles: new Map() }),
    blocks,
    sections: secs,
    bookmarks,
  } as FullDocument;
  return { full, origins, paraBlock, sectionMap };
}

/** Bordas de página editadas (SectPr.pgBorders) valem sobre as lidas do arquivo (sect.pgBorders, que o motor pinta). */
function withPgBorders(s: Section): Partial<Section> {
  const pb = s.sectPr.pgBorders;
  if (pb === undefined) return {};
  const sect = { ...(s.sect ?? {}) } as NonNullable<Section['sect']>;
  if (pb) sect.pgBorders = pb; else delete sect.pgBorders;
  return { sect };
}

function reconcileSet(
  blocks: { default?: Block[]; first?: Block[]; even?: Block[] } | undefined,
  paras: { default?: Paragraph[]; first?: Paragraph[]; even?: Paragraph[] },
): { default?: Block[]; first?: Block[]; even?: Block[] } {
  const out: { default?: Block[]; first?: Block[]; even?: Block[] } = {};
  for (const k of ['default', 'first', 'even'] as const) {
    const r = reconcileBlocks(blocks?.[k], paras[k], true);
    if (r) out[k] = r;
  }
  return out;
}

/** Tabela com os blocos de cada célula alinhados aos parágrafos editados. */
function reconcileTableCells(t: TableBlock): TableBlock {
  let changed = false;
  const rows = t.rows.map((row) => {
    let rowChanged = false;
    const cells = row.cells.map((cell) => {
      const c = reconcileCell(cell);
      if (c !== cell) rowChanged = true;
      return c;
    });
    if (!rowChanged) return row;
    changed = true;
    return { ...row, cells };
  });
  return changed ? { ...t, rows } : t;
}

function reconcileCell(cell: TableCell): TableCell {
  if (!cell.blocks) return cell;
  let blocks = reconcileBlocks(cell.blocks, cell.paragraphs, false)!;
  let nestedChanged = false;
  const mapped = blocks.map((b) => {
    if (b.type !== 'table') return b;
    const t = reconcileTableCells(b);
    if (t !== b) nestedChanged = true;
    return t;
  });
  if (nestedChanged) blocks = mapped;
  return blocks === cell.blocks ? cell : { ...cell, blocks };
}

/**
 * Alinha uma lista de blocos (parágrafos + tabelas) à lista de parágrafos do
 * modelo de edição, que pode ter ganho/perdido parágrafos. `deep`: a lista
 * plana inclui os parágrafos das células (cabeçalho/rodapé, caixa de texto);
 * senão as tabelas são opacas (célula). Sem mudança estrutural devolve o
 * MESMO array.
 */
export function reconcileBlocks(blocks: Block[] | undefined, flat: Paragraph[] | undefined, deep: boolean): Block[] | undefined {
  if (!flat) return blocks;
  if (!blocks) return flat.map((paragraph) => ({ type: 'paragraph', paragraph }));
  // ordem atual dos parágrafos na árvore
  const order: Paragraph[] = [];
  const walk = (bs: Block[]): void => {
    for (const b of bs) {
      if (b.type === 'paragraph') order.push(b.paragraph);
      else if (deep) for (const r of b.rows) for (const c of r.cells) walk(c.blocks ?? c.paragraphs.map((p) => ({ type: 'paragraph' as const, paragraph: p })));
    }
  };
  walk(blocks);
  if (order.length === flat.length && order.every((p, i) => p === flat[i])) return blocks;
  const live = new Set(flat);
  const present = new Set(order);
  // parágrafos novos entram logo após o anterior (na lista plana) que já existe
  const after = new Map<Paragraph, Paragraph[]>();
  const atStart: Paragraph[] = [];
  let prev: Paragraph | null = null;
  for (const p of flat) {
    if (present.has(p)) { prev = p; continue; }
    if (prev) {
      let l = after.get(prev);
      if (!l) after.set(prev, (l = []));
      l.push(p);
    } else atStart.push(p);
  }
  const rebuild = (bs: Block[]): Block[] => {
    const out: Block[] = [];
    for (const b of bs) {
      if (b.type === 'paragraph') {
        if (live.has(b.paragraph)) out.push(b);
        for (const q of after.get(b.paragraph) ?? []) out.push({ type: 'paragraph', paragraph: q });
      } else if (deep) {
        out.push({
          ...b,
          rows: b.rows.map((r) => ({
            ...r,
            cells: r.cells.map((c) => {
              const inner = rebuild(c.blocks ?? c.paragraphs.map((p) => ({ type: 'paragraph' as const, paragraph: p })));
              if (!inner.some((x) => x.type === 'paragraph')) inner.push({ type: 'paragraph', paragraph: { runs: [], props: {} } });
              return {
                ...c, blocks: inner,
                paragraphs: inner.filter((x): x is Extract<Block, { type: 'paragraph' }> => x.type === 'paragraph').map((x) => x.paragraph),
              };
            }),
          })),
        });
      } else out.push(b);
    }
    return out;
  };
  const out = rebuild(blocks);
  out.unshift(...atStart.map((paragraph) => ({ type: 'paragraph' as const, paragraph })));
  return out;
}

// ───────────────────────── referências das linhas ─────────────────────────

/** Um passo dentro de tabela: linha, COLUNA DA GRADE (como o motor) e, se o
 *  passo seguinte entra numa tabela aninhada, o índice do bloco dela na célula. */
export interface CellHop { r: number; c: number; b?: number }

/** Onde uma linha do motor está no estado de edição. */
export type LineLoc =
  | { kind: 'body'; para: number }
  | { kind: 'cell'; anchor: number; hops: CellHop[]; block: number }
  /** cabeçalho/rodapé: parte usada na página e caminho nos blocos dela */
  | { kind: 'hf'; which: 'hdr' | 'ftr'; part: HfKind; path: string[] }
  | { kind: 'other'; root: string };

export type HfKind = 'first' | 'even' | 'default';

/** "b12" | "b3/r0/c1/b0" | "b3/r0/c1/b2/r1/c0/b0" | "hdr:first/b0" … → localização. */
export function locateRef(ref: string, origins: readonly BlockOrigin[]): LineLoc {
  const parts = ref.split('/');
  const hf = /^(hdr|ftr):(first|even|default)$/.exec(parts[0]!);
  if (hf) return { kind: 'hf', which: hf[1] as 'hdr' | 'ftr', part: hf[2] as HfKind, path: parts.slice(1) };
  const m = /^b(\d+)$/.exec(parts[0]!);
  if (!m) return { kind: 'other', root: parts[0]! };
  const o = origins[+m[1]!];
  if (!o) return { kind: 'other', root: parts[0]! };
  if (o.kind === 'para') return parts.length === 1 ? { kind: 'body', para: o.para } : { kind: 'other', root: 'b' };
  const hops: CellHop[] = [];
  let block = -1;
  for (let i = 1; i + 2 < parts.length; i += 3) {
    const r = /^r(\d+)$/.exec(parts[i] ?? '');
    const c = /^c(\d+)$/.exec(parts[i + 1] ?? '');
    const b = /^b(\d+)$/.exec(parts[i + 2] ?? '');
    if (!r || !c || !b) return { kind: 'other', root: 'b' };
    if (hops.length) hops[hops.length - 1]!.b = block;
    hops.push({ r: +r[1]!, c: +c[1]! });
    block = +b[1]!;
  }
  if (!hops.length) return { kind: 'other', root: 'b' };
  return { kind: 'cell', anchor: o.anchor, hops, block };
}

/** Resolve o caminho de células a partir da tabela âncora. */
export function resolveCell(t: TableBlock, hops: readonly CellHop[]): TableCell | null {
  let table: TableBlock = t;
  for (let i = 0; i < hops.length; i++) {
    const h = hops[i]!;
    const cell = cellAtGrid(table, h.r, h.c);
    if (!cell) return null;
    if (i === hops.length - 1) return cell;
    const blk = cellBlocks(cell)[h.b ?? -1];
    if (!blk || blk.type !== 'table') return null;
    table = blk;
  }
  return null;
}

/**
 * Blocos do cabeçalho/rodapé `part` que a seção `section` (índice do motor)
 * usa — como o motor: cada variante não definida na seção vem da anterior.
 * `definer` = seção (do motor) que define a parte.
 */
export function hfBlocksFor(
  full: FullDocument, section: number, which: 'hdr' | 'ftr', part: HfKind,
): { blocks: Block[]; definer: number } | null {
  for (let i = Math.min(section, full.sections.length - 1); i >= 0; i--) {
    const s = full.sections[i]!;
    const set = which === 'hdr' ? s.headerBlocks : s.footerBlocks;
    const own = set?.[part];
    if (own) return { blocks: own, definer: i };
  }
  return null;
}

/** Mesmo caminho de célula? */
export function sameHops(a: readonly CellHop[], b: readonly CellHop[]): boolean {
  return a.length === b.length && a.every((h, i) => h.r === b[i]!.r && h.c === b[i]!.c && (i === a.length - 1 || h.b === b[i]!.b));
}

// ───────────────────────── cursor por caractere ─────────────────────────

/** x (twips) do cursor antes do caractere de offset `offset` na linha. */
export function caretXIn(line: LaidOutLine, offset: number): number {
  const cs = line.chars;
  if (!cs || !cs.length) return line.x;
  let prev: { o: number; x: number; w: number } | null = null;
  for (const c of cs) {
    if (c.o === offset) return c.x;
    if (c.o < offset && (!prev || c.o > prev.o || (c.o === prev.o && c.x > prev.x))) prev = c;
  }
  if (prev) return prev.x + prev.w;
  let first = cs[0]!;
  for (const c of cs) if (c.x < first.x) first = c;
  return first.x;
}

/** Offset do caractere mais próximo de x (twips) na linha (clique, ↑/↓). */
export function offsetAtX(line: LaidOutLine, x: number, end = line.end): number {
  const cs = line.chars;
  if (!cs || !cs.length) return line.start;
  const sorted = isSortedByX(cs) ? cs : [...cs].sort((a, b) => a.x - b.x);
  for (const c of sorted) {
    if (c.o < 0) continue;
    if (x < c.x + c.w / 2) return c.o;
  }
  return end;
}

function isSortedByX(cs: readonly { x: number }[]): boolean {
  for (let i = 1; i < cs.length; i++) if (cs[i]!.x < cs[i - 1]!.x) return false;
  return true;
}

// ───────────────────────── layout incremental ─────────────────────────

type Item = import('@universal-office/docx-layout').PageItem;

/** Desloca um item (twips) — mesma semântica do shiftItem do motor. */
export function shiftPageItem(it: Item, dx: number, dy: number): Item {
  if (!dx && !dy) return it;
  switch (it.t) {
    case 'glyphs': return { ...it, y: it.y + dy, glyphs: dx ? it.glyphs.map((g) => ({ ...g, x: g.x + dx })) : it.glyphs };
    case 'rect': case 'image': case 'shape': return { ...it, x: it.x + dx, y: it.y + dy };
    case 'line': return { ...it, x1: it.x1 + dx, x2: it.x2 + dx, y1: it.y1 + dy, y2: it.y2 + dy };
    case 'clip': return it.y === undefined ? it : { ...it, x: (it.x ?? 0) + dx, y: it.y + dy };
    default: {
      const x = it as { t: string; m?: number[]; cmds?: { op: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }[] };
      if (x.t === 'xform') {
        if (!x.m) return it;
        const [a, b, c, d, e, f] = x.m as [number, number, number, number, number, number];
        return { ...it, m: [a, b, c, d, e + dx - (a * dx + c * dy), f + dy - (b * dx + d * dy)] } as Item;
      }
      if (x.t === 'path' && x.cmds) {
        return {
          ...it,
          cmds: x.cmds.map((c) => c.op === 'Z' ? c : c.op === 'C'
            ? { ...c, x1: c.x1! + dx, y1: c.y1! + dy, x2: c.x2! + dx, y2: c.y2! + dy, x: c.x! + dx, y: c.y! + dy }
            : { ...c, x: c.x! + dx, y: c.y! + dy }),
        } as Item;
      }
      return it;
    }
  }
}

const near = (a: number | undefined, b: number | undefined): boolean => a === b || (a !== undefined && b !== undefined && Math.abs(a - b) < 0.01);

/** Mesmo item desenhado (posições com tolerância; faces/imagens por identidade). */
export function sameItem(a: Item, b: Item): boolean {
  if (a.t !== b.t) return false;
  switch (a.t) {
    case 'glyphs': {
      const o = b as typeof a;
      if (a.face !== o.face || a.sizePt !== o.sizePt || a.color !== o.color || !near(a.y, o.y) || a.glyphs.length !== o.glyphs.length
        || a.scaleX !== o.scaleX || !!a.synthBold !== !!o.synthBold || !!a.synthItalic !== !!o.synthItalic) return false;
      for (let i = 0; i < a.glyphs.length; i++) if (a.glyphs[i]!.cp !== o.glyphs[i]!.cp || !near(a.glyphs[i]!.x, o.glyphs[i]!.x)) return false;
      return true;
    }
    case 'rect': { const o = b as typeof a; return a.fill === o.fill && a.alpha === o.alpha && near(a.x, o.x) && near(a.y, o.y) && near(a.w, o.w) && near(a.h, o.h); }
    case 'line': { const o = b as typeof a; return a.color === o.color && a.widthPt === o.widthPt && a.dash === o.dash && near(a.x1, o.x1) && near(a.y1, o.y1) && near(a.x2, o.x2) && near(a.y2, o.y2); }
    case 'image': { const o = b as typeof a; return a.image === o.image && near(a.x, o.x) && near(a.y, o.y) && near(a.w, o.w) && near(a.h, o.h); }
    case 'shape': { const o = b as typeof a; return a.style === o.style && near(a.x, o.x) && near(a.y, o.y) && near(a.w, o.w) && near(a.h, o.h); }
    case 'clip': { const o = b as typeof a; return a.op === o.op && near(a.x, o.x) && near(a.y, o.y) && near(a.w, o.w) && near(a.h, o.h); }
    default: return JSON.stringify(a) === JSON.stringify(b);
  }
}

/** Início da subsequência `want` em `items` (a partir de `from`), ou -1. */
export function findItems(items: readonly Item[], want: readonly Item[], from = 0): number {
  if (!want.length) return -1;
  outer: for (let k = from; k + want.length <= items.length; k++) {
    if (!sameItem(items[k]!, want[0]!)) continue;
    for (let i = 1; i < want.length; i++) if (!sameItem(items[k + i]!, want[i]!)) continue outer;
    return k;
  }
  return -1;
}
