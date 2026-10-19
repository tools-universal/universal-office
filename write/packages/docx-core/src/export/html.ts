// Exporta o modelo Write para HTML semântico e fluido (NÃO paginado) —
// pensado para ler na web: títulos h1-6, listas aninhadas, tabelas, imagens
// embutidas (data URI), notas de rodapé/fim e ANOTAÇÕES inline (realce + lista).
import type { Paragraph, Run, TableBlock, CommentInfo, BorderEdge } from '../core.js';
import {
  type ExportDoc,
  orderedBlocks,
  headingLevel,
  escapeHtml,
  escapeAttr,
  resolveImageUri,
  twipsToPx,
  twipsToPt,
  halfPtToPt,
} from './model.js';

export interface HtmlOptions {
  /** Documento completo com <head>/<style> (true) ou só o fragmento do corpo. */
  fullDocument?: boolean;
  title?: string;
  /** Como embutir as imagens. 'data' = base64 inline (default; arquivo único e
   *  enorme); 'omit' = não emite a imagem (vira marcador "[imagem]"). */
  images?: 'data' | 'omit';
}

interface Ctx {
  comments: Map<number, CommentInfo>;
  usedComments: Set<number>;
  notes: { kind: 'footnote' | 'endnote'; id: number; html: string }[];
  footnotes: Map<number, Paragraph[]>;
  endnotes: Map<number, Paragraph[]>;
  imagesMode: 'data' | 'omit';
  imageDataUris?: WeakMap<{ data: Uint8Array; ext: string }, string>;
}

const HIGHLIGHTS: Record<string, string> = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff',
  blue: '#0000ff', red: '#ff0000', darkBlue: '#000080', darkCyan: '#008080',
  darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000',
  darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0',
  black: '#000000', white: '#ffffff',
};

function cssBorderStyle(s: string): string {
  if (s === 'dashed' || s === 'dotted' || s === 'double') return s;
  if (s === 'none' || s === 'nil') return 'none';
  return 'solid';
}

function edgeCss(e: BorderEdge): string {
  const w = Math.max(0.5, e.sizeEighthPt / 8);
  return `${w}pt ${cssBorderStyle(e.style)} ${e.color ? '#' + e.color : '#000'}`;
}

function runHtml(run: Run, ctx: Ctx): string {
  if (run.image) {
    if (ctx.imagesMode === 'omit') {
      // style inline = funciona mesmo em fragmento (fullDocument:false), sem
      // depender da CSS embutida. A classe fica para quem quer sobrescrever.
      return `<span class="uw-img-placeholder" aria-label="imagem" ` +
        `style="display:inline-block;padding:0 .35em;margin:0 .15em;` +
        `background:rgba(0,0,0,.06);border-radius:4px;font-size:.9em;color:#777">📷</span>`;
    }
    const w = twipsToPx(run.image.widthTwips);
    const h = twipsToPx(run.image.heightTwips);
    return `<img src="${resolveImageUri(run.image, ctx.imageDataUris)}" width="${w}" height="${h}" alt="" loading="lazy">`;
  }
  const p = run.props;
  if (run.noteRef) {
    const seq = ctx.notes.length + 1;
    const paras = (run.noteRef.kind === 'footnote' ? ctx.footnotes : ctx.endnotes).get(run.noteRef.id);
    const noteHtml = paras?.map((np) => np.runs.map((r) => escapeHtml(r.text)).join('')).join(' ').trim() ?? '';
    ctx.notes.push({ kind: run.noteRef.kind, id: run.noteRef.id, html: escapeHtml(noteHtml) });
    return `<sup class="uw-note"><a id="noteref-${seq}" href="#note-${seq}">${seq}</a></sup>`;
  }
  let text = escapeHtml(run.text);
  if (!text) return '';

  const styles: string[] = [];
  if (p.color) styles.push(`color:#${p.color}`);
  if (p.szHalfPt) styles.push(`font-size:${halfPtToPt(p.szHalfPt)}pt`);
  if (p.highlight) styles.push(`background-color:${HIGHLIGHTS[p.highlight] ?? p.highlight}`);
  if (p.fontAscii) styles.push(`font-family:'${p.fontAscii}',serif`);
  if (p.allCaps) styles.push('text-transform:uppercase');
  if (p.smallCaps) styles.push('font-variant:small-caps');
  if (p.charSpacingTwips) styles.push(`letter-spacing:${twipsToPt(p.charSpacingTwips)}pt`);

  let inner = text;
  if (p.bold) inner = `<strong>${inner}</strong>`;
  if (p.italic) inner = `<em>${inner}</em>`;
  if (p.strike || p.doubleStrike) inner = `<s>${inner}</s>`;
  if (p.underline) inner = `<u>${inner}</u>`;
  if (p.vertAlign === 'superscript') inner = `<sup>${inner}</sup>`;
  else if (p.vertAlign === 'subscript') inner = `<sub>${inner}</sub>`;
  if (styles.length) inner = `<span style="${styles.join(';')}">${inner}</span>`;
  if (p.link) inner = `<a href="${escapeAttr(p.link)}">${inner}</a>`;
  if (p.commentIds?.length) {
    for (const id of p.commentIds) ctx.usedComments.add(id);
    const tips = p.commentIds.map((id) => {
      const c = ctx.comments.get(id);
      return c ? `${c.author ?? 'Anônimo'}: ${c.text}` : '';
    }).filter(Boolean).join(' | ');
    inner = `<span class="uw-comment" data-comment="${p.commentIds.join(',')}" title="${escapeAttr(tips)}">${inner}</span>`;
  }
  return inner;
}

function paraStyles(p: Paragraph): string {
  const s: string[] = [];
  const a = p.props.alignment;
  if (a === 'center') s.push('text-align:center');
  else if (a === 'right') s.push('text-align:right');
  else if (a === 'both') s.push('text-align:justify');
  if (p.props.indentLeftTwips) s.push(`margin-left:${twipsToPt(p.props.indentLeftTwips)}pt`);
  if (p.props.indentRightTwips) s.push(`margin-right:${twipsToPt(p.props.indentRightTwips)}pt`);
  if (p.props.indentFirstLineTwips) s.push(`text-indent:${twipsToPt(p.props.indentFirstLineTwips)}pt`);
  if (p.props.shadingHex) s.push(`background-color:#${p.props.shadingHex}`);
  const b = p.props.borders;
  if (b) {
    if (b.top) s.push(`border-top:${edgeCss(b.top)}`);
    if (b.bottom) s.push(`border-bottom:${edgeCss(b.bottom)}`);
    if (b.left) s.push(`border-left:${edgeCss(b.left)}`);
    if (b.right) s.push(`border-right:${edgeCss(b.right)}`);
  }
  return s.join(';');
}

function paraInner(p: Paragraph, ctx: Ctx): string {
  const html = p.runs.map((r) => runHtml(r, ctx)).join('');
  return html || '<br>';
}

function paraHtml(p: Paragraph, ctx: Ctx): string {
  const inner = paraInner(p, ctx);
  const st = paraStyles(p);
  const attr = st ? ` style="${st}"` : '';
  const lvl = headingLevel(p);
  if (lvl) return `<h${lvl}${attr}>${inner}</h${lvl}>`;
  return `<p${attr}>${inner}</p>`;
}

function tableHtml(t: TableBlock, ctx: Ctx): string {
  let html = '<table>';
  for (const row of t.rows) {
    html += '<tr>';
    for (const cell of row.cells) {
      const span = cell.gridSpan > 1 ? ` colspan="${cell.gridSpan}"` : '';
      const style = cell.shadingHex ? ` style="background-color:#${cell.shadingHex}"` : '';
      let inner = cell.paragraphs.map((p) => paraHtml(p, ctx)).join('');
      for (const nt of cell.tables) inner += tableHtml(nt, ctx);
      html += `<td${span}${style}>${inner}</td>`;
    }
    html += '</tr>';
  }
  return html + '</table>';
}

/** Lista aninhada a partir de uma sequência de parágrafos com numbering. */
function listHtml(items: { ilvl: number; kind: 'bullet' | 'decimal'; inner: string }[]): string {
  let i = 0;
  function build(level: number): string {
    const tag = items[i]!.kind === 'decimal' ? 'ol' : 'ul';
    let html = `<${tag}>`;
    while (i < items.length && items[i]!.ilvl >= level) {
      if (items[i]!.ilvl > level) break;
      let li = `<li>${items[i]!.inner}`;
      i++;
      if (i < items.length && items[i]!.ilvl > level) li += build(items[i]!.ilvl);
      html += li + '</li>';
    }
    return html + `</${tag}>`;
  }
  return items.length ? build(items[0]!.ilvl) : '';
}

function bodyHtml(doc: ExportDoc, ctx: Ctx): string {
  const blocks = orderedBlocks(doc);
  const parts: string[] = [];
  let listBuf: { ilvl: number; kind: 'bullet' | 'decimal'; inner: string }[] = [];
  const flushList = (): void => {
    if (listBuf.length) { parts.push(listHtml(listBuf)); listBuf = []; }
  };
  for (const b of blocks) {
    if (b.kind === 'para' && b.p.props.numbering) {
      listBuf.push({
        ilvl: b.p.props.numbering.ilvl,
        kind: b.p.props.numbering.kind,
        inner: paraInner(b.p, ctx),
      });
      continue;
    }
    flushList();
    if (b.kind === 'para') parts.push(paraHtml(b.p, ctx));
    else parts.push(tableHtml(b.t, ctx));
  }
  flushList();

  // notas de rodapé/fim
  if (ctx.notes.length) {
    parts.push('<hr><section class="uw-notes"><ol>');
    ctx.notes.forEach((n, idx) => {
      parts.push(`<li id="note-${idx + 1}">${n.html} <a href="#noteref-${idx + 1}">↩</a></li>`);
    });
    parts.push('</ol></section>');
  }

  // comentários referenciados (anotações)
  const used = [...ctx.usedComments].filter((id) => ctx.comments.has(id));
  if (used.length) {
    parts.push('<section class="uw-comments"><h2>Comentários</h2><ol>');
    for (const id of used) {
      const c = ctx.comments.get(id)!;
      parts.push(`<li id="cmt-${id}"><span class="uw-author">${escapeHtml(c.author ?? 'Anônimo')}</span>: ${escapeHtml(c.text)}</li>`);
    }
    parts.push('</ol></section>');
  }
  return parts.join('\n');
}

const STYLE = `
:root { color-scheme: light; }
body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.55;
  max-width: 46rem; margin: 2.5rem auto; padding: 0 1.25rem; color: #1a1a1a;
  background: #ffffff; }
h1,h2,h3,h4,h5,h6 { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.25; margin: 1.6em 0 .5em; }
h1 { font-size: 2rem; } h2 { font-size: 1.6rem; } h3 { font-size: 1.3rem; }
p { margin: 0 0 .75em; }
a { color: #1a73e8; }
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; margin: 1em 0; width: 100%; }
td, th { border: 1px solid #bbb; padding: .4em .6em; vertical-align: top; }
ul, ol { margin: 0 0 .75em; padding-left: 1.6em; }
sup.uw-note a { text-decoration: none; }
.uw-comment { background: rgba(255,187,0,.28); border-bottom: 1px dotted #c79100; cursor: help; }
.uw-img-placeholder { display: inline-block; padding: 0 .35em; margin: 0 .15em; background: rgba(0,0,0,.06); border-radius: 4px; font-size: .9em; color: #777; }
.uw-comments { margin-top: 2.5rem; border-top: 1px solid #ccc; padding-top: 1rem; font-size: .9rem; color: #555; }
.uw-comments .uw-author { font-weight: 600; }
.uw-notes { font-size: .85rem; color: #555; }
hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0 .5rem; }
`;

export function toHtml(doc: ExportDoc, opts: HtmlOptions = {}): string {
  const ctx: Ctx = {
    comments: new Map((doc.comments ?? []).map((c) => [c.id, c])),
    usedComments: new Set(),
    notes: [],
    footnotes: doc.footnotes ?? new Map(),
    endnotes: doc.endnotes ?? new Map(),
    imagesMode: opts.images ?? 'data',
    imageDataUris: doc.imageDataUris,
  };
  const body = bodyHtml(doc, ctx);
  if (opts.fullDocument === false) return body;
  const title = escapeHtml(opts.title ?? doc.title ?? 'Documento');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}
