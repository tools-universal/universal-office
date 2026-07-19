// Exporta o modelo Write para Markdown (GitHub Flavored): títulos, ênfase,
// listas aninhadas, links, imagens (data URI), tabelas GFM, notas e comentários
// como footnotes ([^...]).
import type { Paragraph, Run, TableBlock, TableCell, CommentInfo } from '@universal-office/docx-core';
import {
  type ExportDoc,
  orderedBlocks,
  headingLevel,
  resolveImageUri,
} from './model.js';

export interface MarkdownOptions {
  title?: string;
  /** 'data' (default) embute imagens em data URI; 'omit' substitui por "[imagem]". */
  images?: 'data' | 'omit';
}

interface Ctx {
  comments: Map<number, CommentInfo>;
  footnotes: Map<number, Paragraph[]>;
  endnotes: Map<number, Paragraph[]>;
  noteDefs: string[];          // definições [^fnN]: ...
  noteSeq: number;
  usedComments: Set<number>;
  imagesMode: 'data' | 'omit';
  imageDataUris?: WeakMap<{ data: Uint8Array; ext: string }, string>;
}

function escapeMd(s: string): string {
  // escapa só o essencial p/ não virar marcação acidental
  return s.replace(/([\\`*_{}\[\]<>|])/g, '\\$1');
}

function emphasize(t: string, p: Run['props']): string {
  const lead = (t.match(/^\s*/) ?? [''])[0];
  const trail = (t.match(/\s*$/) ?? [''])[0];
  let core = t.slice(lead.length, t.length - trail.length);
  if (!core) return t; // só espaços: não aplica ênfase
  if (p.bold && p.italic) core = `***${core}***`;
  else if (p.bold) core = `**${core}**`;
  else if (p.italic) core = `*${core}*`;
  if (p.strike || p.doubleStrike) core = `~~${core}~~`;
  if (p.underline) core = `<u>${core}</u>`;
  if (p.vertAlign === 'superscript') core = `<sup>${core}</sup>`;
  else if (p.vertAlign === 'subscript') core = `<sub>${core}</sub>`;
  return lead + core + trail;
}

function runMd(run: Run, ctx: Ctx): string {
  if (run.image) return ctx.imagesMode === 'omit' ? '[imagem]' : `![](${resolveImageUri(run.image, ctx.imageDataUris)})`;
  if (run.noteRef) {
    const seq = ++ctx.noteSeq;
    const paras = (run.noteRef.kind === 'footnote' ? ctx.footnotes : ctx.endnotes).get(run.noteRef.id);
    const txt = paras?.map((np) => np.runs.map((r) => r.text).join('')).join(' ').trim() ?? '';
    ctx.noteDefs.push(`[^n${seq}]: ${txt}`);
    return `[^n${seq}]`;
  }
  let t = emphasize(escapeMd(run.text), run.props);
  if (run.props.link) t = `[${t}](${run.props.link})`;
  return t;
}

function inlineRuns(runs: Run[], ctx: Ctx): string {
  let s = '';
  const ids = new Set<number>();
  for (const r of runs) {
    s += runMd(r, ctx);
    for (const id of r.props.commentIds ?? []) ids.add(id);
  }
  for (const id of ids) {
    if (ctx.comments.has(id)) { ctx.usedComments.add(id); s += `[^c${id}]`; }
  }
  return s;
}

function cellText(cell: TableCell, ctx: Ctx): string {
  const inner = cell.paragraphs.map((p) => inlineRuns(p.runs, ctx)).join('<br>');
  return inner.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function tableMd(t: TableBlock, ctx: Ctx): string {
  const rows = t.rows.map((r) => r.cells.map((c) => cellText(c, ctx)));
  if (!rows.length) return '';
  const cols = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]): string[] => { while (r.length < cols) r.push(''); return r; };
  const header = pad(rows[0]!.slice());
  let md = `| ${header.join(' | ')} |\n`;
  md += `| ${header.map(() => '---').join(' | ')} |\n`;
  for (const r of rows.slice(1)) md += `| ${pad(r.slice()).join(' | ')} |\n`;
  return md;
}

export function toMarkdown(doc: ExportDoc, opts: MarkdownOptions = {}): string {
  const ctx: Ctx = {
    comments: new Map((doc.comments ?? []).map((c) => [c.id, c])),
    footnotes: doc.footnotes ?? new Map(),
    endnotes: doc.endnotes ?? new Map(),
    noteDefs: [],
    noteSeq: 0,
    usedComments: new Set(),
    imagesMode: opts.images ?? 'data',
    imageDataUris: doc.imageDataUris,
  };
  const out: string[] = [];
  const title = opts.title ?? doc.title;
  if (title) out.push(`# ${title}\n`);

  let inList = false;
  for (const b of orderedBlocks(doc)) {
    const isList = b.kind === 'para' && !!b.p.props.numbering;
    if (inList && !isList) out.push(''); // separa a lista do bloco seguinte (GFM)
    inList = isList;
    if (b.kind === 'table') { out.push(tableMd(b.t, ctx)); continue; }
    const p = b.p;
    const inner = inlineRuns(p.runs, ctx);
    if (p.props.numbering) {
      const indent = '  '.repeat(p.props.numbering.ilvl);
      const marker = p.props.numbering.kind === 'decimal' ? '1.' : '-';
      out.push(`${indent}${marker} ${inner}`);
      continue;
    }
    const lvl = headingLevel(p);
    if (lvl) out.push(`${'#'.repeat(lvl)} ${inner}\n`);
    else if (inner.trim()) out.push(`${inner}\n`);
    else out.push('');
  }

  // definições de notas
  if (ctx.noteDefs.length) out.push('', ...ctx.noteDefs);

  // comentários como footnotes
  const used = [...ctx.usedComments].filter((id) => ctx.comments.has(id));
  if (used.length) {
    out.push('');
    for (const id of used) {
      const c = ctx.comments.get(id)!;
      out.push(`[^c${id}]: **${c.author ?? 'Anônimo'}**: ${c.text}`);
    }
  }

  // colapsa linhas em branco múltiplas
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
