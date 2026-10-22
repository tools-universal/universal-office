/**
 * Notas de rodapé e de fim no editor: estilos de nota (os do Word pt-BR, se o
 * documento não tiver os seus), conteúdo de nota (achatar, clonar), posições das
 * referências no corpo e as opções de numeração/local por seção ou documento.
 * Fatos medidos no Word: memória word-notes-oracle-facts, write/tools/notes-lab.
 */
import {
  NOTE_REF_TEXT, NOTE_STYLES, putStyle, readStyleIndex, noteMarkField,
  type Block, type FullDocument, type NoteKind, type NoteProps, type Paragraph, type Run, type TableBlock,
} from '@universal-office/docx-core';
import type { DocStyles } from './styles.js';

export type { NoteKind };

/** Opções de nota que o diálogo mostra/aplica (as de rodapé têm local
 *  pageBottom|beneathText e colunas; as de fim, sectEnd|docEnd). */
export interface NoteOptions {
  /** rodapé: 'pageBottom' | 'beneathText'; fim: 'docEnd' | 'sectEnd' */
  position: string;
  /** decimal | lowerLetter | upperLetter | lowerRoman | upperRoman | chicago */
  numberFormat: string;
  startAt: number;
  /** continuous | eachSect | eachPage (eachPage só no rodapé) */
  restart: 'continuous' | 'eachSect' | 'eachPage';
  /** só rodapé: colunas da área de notas (0 = as da seção) */
  columns?: number;
}

export const NOTE_DEFAULTS: Record<NoteKind, NoteOptions> = {
  footnote: { position: 'pageBottom', numberFormat: 'decimal', startAt: 1, restart: 'continuous', columns: 0 },
  endnote: { position: 'docEnd', numberFormat: 'lowerRoman', startAt: 1, restart: 'continuous' },
};

/** Opções efetivas: as da seção sobre as do documento (settings), com os padrões do Word. */
export function effectiveNoteOptions(kind: NoteKind, doc: NoteProps | undefined, sect: NoteProps | undefined, cols?: number): NoteOptions {
  const d = NOTE_DEFAULTS[kind];
  const p = { ...doc, ...sect };
  return {
    // o local da nota de fim só vale o do documento (o Word não grava na seção)
    position: (kind === 'endnote' ? doc?.pos : p.pos) ?? d.position,
    numberFormat: p.numFmt ?? d.numberFormat,
    startAt: p.numStart ?? d.startAt,
    restart: p.numRestart ?? d.restart,
    ...(kind === 'footnote' ? { columns: cols ?? 0 } : {}),
  };
}

/** NoteProps que o Word grava para as opções (o padrão não é gravado; a posição
 *  da nota de fim fica fora — só no settings). */
export function notePropsOf(kind: NoteKind, o: NoteOptions, withPos: boolean): NoteProps | undefined {
  const d = NOTE_DEFAULTS[kind];
  const p: NoteProps = {};
  if (withPos && o.position !== d.position) p.pos = o.position;
  if (o.numberFormat !== d.numberFormat) p.numFmt = o.numberFormat;
  if (o.startAt !== d.startAt) p.numStart = o.startAt;
  if (o.restart !== d.restart) p.numRestart = o.restart;
  return Object.keys(p).length ? p : undefined;
}

/**
 * Estilos de nota (texto, caractere vinculado e referência): os que o documento já
 * tem pelo nome ("footnote text"…) ou os do Word pt-BR, acrescentados como o Word
 * grava ao inserir a 1ª nota (oráculo notes-lab, fn-wb). Devolve o styles.xml novo
 * (o mesmo, se nada faltava) e os ids.
 */
export function ensureNoteStyles(ds: DocStyles, kind: NoteKind): { xml: string; text: string; ref: string } {
  const st = NOTE_STYLES[kind];
  let xml = ds.base();
  const named = (name: string): string | undefined => readStyleIndex(xml).styles.find((s) => s.name.toLowerCase() === name.toLowerCase())?.id;
  // o Normal e a Fonte Parágrafo Padrão do documento (inglês × pt-BR)
  const map = (x: string): string => x
    .replace('<w:basedOn w:val="Normal"/>', () => `<w:basedOn w:val="${ds.defaultParagraph()}"/>`)
    .replace('<w:basedOn w:val="Fontepargpadro"/>', () => `<w:basedOn w:val="${ds.defaultCharacter()}"/>`);
  let text = named(st.text.name);
  if (!text) {
    text = st.text.id;
    xml = putStyle(xml, st.text.id, map(st.text.xml));
    if (!named(st.char.name)) xml = putStyle(xml, st.char.id, map(st.char.xml));
  }
  let ref = named(st.ref.name);
  if (!ref) {
    ref = st.ref.id;
    xml = putStyle(xml, st.ref.id, map(st.ref.xml));
  }
  return { xml, text, ref };
}

/** Blocos de uma nota (os lidos, ou os parágrafos dela). */
export function noteBlocks(full: FullDocument, kind: NoteKind, id: number): Block[] | undefined {
  const blocks = kind === 'footnote' ? full.footnoteBlocks : full.endnoteBlocks;
  const paras = kind === 'footnote' ? full.footnotes : full.endnotes;
  return blocks?.get(id) ?? paras.get(id)?.map((paragraph) => ({ type: 'paragraph' as const, paragraph }));
}

/** Parágrafos de uma lista de blocos, células inclusive (o modelo de edição da nota). */
export function flattenBlocks(blocks: readonly Block[]): Paragraph[] {
  const out: Paragraph[] = [];
  const walk = (bs: readonly Block[]): void => {
    for (const b of bs) {
      if (b.type === 'paragraph') out.push(b.paragraph);
      else for (const r of b.rows) for (const c of r.cells) walk(c.blocks ?? c.paragraphs.map((p) => ({ type: 'paragraph' as const, paragraph: p })));
    }
  };
  walk(blocks);
  return out;
}

/** Guarda o conteúdo de uma nota nos mapas do documento (blocos e parágrafos de topo). */
export function setNoteBlocks(full: FullDocument, kind: NoteKind, id: number, blocks: Block[]): void {
  const bm = kind === 'footnote' ? (full.footnoteBlocks ??= new Map()) : (full.endnoteBlocks ??= new Map());
  bm.set(id, blocks);
  (kind === 'footnote' ? full.footnotes : full.endnotes).set(id, blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph));
}

/** Cópia profunda do conteúdo de uma nota (colar uma referência cria nota nova). */
export function cloneBlocks(blocks: readonly Block[]): Block[] {
  return structuredClone(blocks as Block[]);
}

/** Próximo id livre de um tipo de nota (ids ≥ 1; -1 e 0 são os separadores). */
export function nextNoteId(full: FullDocument, kind: NoteKind): number {
  let max = 0;
  for (const id of (kind === 'footnote' ? full.footnotes : full.endnotes).keys()) max = Math.max(max, id);
  for (const id of (kind === 'footnote' ? full.footnoteBlocks : full.endnoteBlocks)?.keys() ?? []) max = Math.max(max, id);
  // (separador, continuação e aviso de continuação também têm id — corpus: aviso com id 1)
  for (const id of full.noteSpecialIds?.[kind] ?? []) max = Math.max(max, id);
  return max + 1;
}

/** Runs do editor: o run da referência e o da marca da própria nota ocupam UM
 *  caractere (o número é do motor) — cursor e seleção passam por eles inteiros. */
export function markNoteRuns(paras: readonly Paragraph[]): void {
  for (const p of paras) {
    for (const r of p.runs) {
      if (r.noteRef && r.text !== NOTE_REF_TEXT && !r.noteRef.custom) r.text = NOTE_REF_TEXT;
      else if (r.noteRef?.custom && r.text === '') r.text = NOTE_REF_TEXT;
      else if (r.field && r.text === '' && /^\s*(FOOTNOTE|ENDNOTE)REF_MARK\s*$/.test(r.field)) r.text = NOTE_REF_TEXT;
      if (r.textbox) markNoteRuns(r.textbox.paras);
    }
  }
}

export function markNoteRunsInTable(t: TableBlock): void {
  for (const row of t.rows) for (const c of row.cells) { markNoteRuns(c.paragraphs); c.tables.forEach(markNoteRunsInTable); }
}

/** O run é a marca da própria nota (w:footnoteRef / w:endnoteRef)? */
export const isNoteMark = (r: Run): boolean => !!r.field && /^\s*(FOOTNOTE|ENDNOTE)REF_MARK\s*$/.test(r.field);

/** Troca o tipo de uma nota no conteúdo dela: a marca e os estilos de nota do tipo
 *  antigo viram os do novo (converter rodapé↔fim — oráculo notes-lab, cv-*). */
export function convertNoteContent(blocks: readonly Block[], to: NoteKind, styles: { from: { text?: string; ref?: string }; to: { text: string; ref: string } }): void {
  for (const p of flattenBlocks(blocks)) {
    if (styles.from.text && p.props.styleId === styles.from.text) p.props = { ...p.props, styleId: styles.to.text };
    for (const r of p.runs) {
      if (isNoteMark(r)) r.field = noteMarkField(to);
      if (styles.from.ref && r.props.charStyle === styles.from.ref) r.props = { ...r.props, charStyle: styles.to.ref };
    }
  }
}
