/**
 * Export HTML estático: um `<section class="slide">` por slide com
 * aspect-ratio do sldSz, shapes absolutamente posicionadas (EMU→%),
 * fills/bordas/texto com estilos inline, imagens como data URI e tabelas HTML.
 * Fundo do slide (bg/bgImage) no próprio section. Sem animações/transições.
 *
 * Aproximações documentadas: geometrias preset viram retângulos (ellipse →
 * border-radius:50%, roundRect → raio aproximado); charts viram um placeholder
 * `[gráfico]`; sombras/outerShdw não são emitidas.
 */
import {
  EMU_PER_PX, formatAutoNum,
  type Slide, type Shape, type TextBody, type Table, type Fill, type Run, type Presentation,
} from '@universal-office/slides-processing';
import { loadDeck, dataUri, paragraphText } from './model.js';

export interface HtmlOptions {
  /** 'data' (default) = imagens embutidas como data URI; 'omit' = sem imagens. */
  images?: 'data' | 'omit';
  /** true = documento HTML5 completo (`<!DOCTYPE html>` + `<meta charset>`). */
  fullDocument?: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Percentual relativo ao slide (4 casas — estável p/ snapshot). */
function pct(v: number, total: number): string {
  return `${(v / total * 100).toFixed(4).replace(/\.?0+$/, '')}%`;
}

/** CSS de background de um Fill (sólido ou gradiente linear DrawingML→CSS). */
function fillCss(fill: Fill | undefined, fillAlpha: number | undefined): string | undefined {
  if (!fill || fill.type === 'none') return undefined;
  if (fill.type === 'gradient' && fill.stops && fill.stops.length >= 2) {
    // DrawingML: 0° = esquerda→direita (horário). CSS: 0deg = baixo→cima; a
    // conversão é css = 90 + ang.
    const ang = 90 + (fill.angleDeg ?? 0);
    const stops = fill.stops.map((s) => `${s.color} ${Math.round(s.pos * 100)}%`).join(', ');
    return `background:linear-gradient(${ang}deg, ${stops})`;
  }
  if (fill.type === 'solid' && fill.color) {
    if (fillAlpha !== undefined && fillAlpha < 1) {
      const h = fill.color.replace('#', '');
      const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      return `background-color:rgba(${r},${g},${b},${Math.round(fillAlpha * 1000) / 1000})`;
    }
    return `background-color:${fill.color}`;
  }
  return undefined;
}

/** border-radius aproximado por geometria preset. */
function radiusCss(geom: string | undefined): string | undefined {
  if (geom === 'ellipse') return 'border-radius:50%';
  if (geom === 'roundRect') return 'border-radius:8px';
  return undefined;
}

/** CSS transform para rot/flip do xfrm. */
function transformCss(sh: Shape): string | undefined {
  const x = sh.xfrm;
  if (!x || (!x.rot && !x.flipH && !x.flipV)) return undefined;
  const parts: string[] = [];
  if (x.rot) parts.push(`rotate(${Math.round(x.rot / 60000 * 100) / 100}deg)`);
  if (x.flipH) parts.push('scaleX(-1)');
  if (x.flipV) parts.push('scaleY(-1)');
  return `transform:${parts.join(' ')}`;
}

/** Spans inline de um run (bold/italic/underline/cor/fonte/tamanho/hyperlink). */
function runHtml(r: Run, defaultSzPt: number): string {
  const css: string[] = [];
  css.push(`font-size:${r.sz ?? defaultSzPt}pt`);
  if (r.bold) css.push('font-weight:700');
  if (r.italic) css.push('font-style:italic');
  if (r.underline) css.push('text-decoration:underline');
  if (r.color) css.push(`color:${r.color}`);
  if (r.font) css.push(`font-family:'${r.font}'`);
  const inner = escapeHtml(r.text).replace(/\n/g, '<br>');
  const span = `<span style="${css.join(';')}">${inner}</span>`;
  return r.hyperlink ? `<a href="${escapeHtml(r.hyperlink)}">${span}</a>` : span;
}

/** Parágrafos de um txBody → html (bullets como prefixo, indent por nível). */
function bodyHtml(tb: TextBody, isTitle: boolean): string {
  const defaultSzPt = isTitle ? 40 : 18;
  const out: string[] = [];
  const counters: number[] = Array.from({ length: 9 }, () => 0);
  for (const p of tb.paragraphs) {
    const level = Math.min(p.level ?? 0, 8);
    const align = p.align === 'ctr' ? 'center' : p.align === 'r' ? 'right' : p.align === 'just' ? 'justify' : 'left';
    const css = [`margin:0`, `text-align:${align}`];
    if (level > 0) css.push(`padding-left:${level * 24}px`);
    let bullet = '';
    if (p.bullet) {
      for (let l = level + 1; l < 9; l++) counters[l] = 0;
      if (p.bulletAutoNum !== undefined) {
        counters[level] = (counters[level] ?? 0) + 1;
        bullet = `${formatAutoNum(p.bulletAutoNum, counters[level]!)} `;
      } else {
        bullet = `${p.bulletChar ?? '•'} `;
      }
    }
    const runs = p.runs.map((r) => runHtml(r, defaultSzPt)).join('');
    const bulletSpan = bullet
      ? `<span style="font-size:${p.runs[0]?.sz ?? defaultSzPt}pt${p.runs[0]?.color ? `;color:${p.runs[0].color}` : ''}">${escapeHtml(bullet)}</span>`
      : '';
    out.push(`<p style="${css.join(';')}">${bulletSpan}${runs || '&nbsp;'}</p>`);
  }
  return out.join('');
}

/** Tabela `<a:tbl>` → `<table>` HTML com merges e estilos inline. */
function tableHtml(t: Table, posCss: string): string {
  const totalW = t.colWidthsEmu.reduce((a, b) => a + b, 0) || 1;
  const cols = t.colWidthsEmu
    .map((w) => `<col style="width:${(w / totalW * 100).toFixed(2)}%">`)
    .join('');
  const rows: string[] = [];
  for (const row of t.rows) {
    const cells: string[] = [];
    for (const cell of row.cells) {
      if (cell.hMerge || cell.vMerge) continue;
      const attrs: string[] = [];
      if (cell.gridSpan && cell.gridSpan > 1) attrs.push(`colspan="${cell.gridSpan}"`);
      if (cell.rowSpan && cell.rowSpan > 1) attrs.push(`rowspan="${cell.rowSpan}"`);
      const css: string[] = ['padding:2px 6px', `border:1px solid ${cell.borderColor ?? '#CBD5E1'}`];
      if (cell.fill) css.push(`background-color:${cell.fill}`);
      if (cell.anchor === 'ctr') css.push('vertical-align:middle');
      else if (cell.anchor === 'b') css.push('vertical-align:bottom');
      const body = cell.txBody ? bodyHtml(cell.txBody, false) : '';
      cells.push(`<td ${attrs.join(' ')} style="${css.join(';')}">${body}</td>`);
    }
    rows.push(`<tr>${cells.join('')}</tr>`);
  }
  return `<table style="${posCss};border-collapse:collapse;table-layout:fixed">${cols}${rows.join('')}</table>`;
}

function shapeHtml(sh: Shape, pres: Presentation, opts: HtmlOptions): string | undefined {
  if (!sh.xfrm) {
    // shape sem geometria própria nem herdada: sem posição confiável → pula
    return undefined;
  }
  const pos =
    `position:absolute;left:${pct(sh.xfrm.x, pres.slideW)};top:${pct(sh.xfrm.y, pres.slideH)};` +
    `width:${pct(sh.xfrm.cx, pres.slideW)};height:${pct(sh.xfrm.cy, pres.slideH)};box-sizing:border-box`;
  const xform = transformCss(sh);

  if (sh.table) return tableHtml(sh.table, pos + (xform ? `;${xform}` : ''));
  if (sh.chartXml) {
    return `<div style="${pos};border:1px dashed #94A3B8;color:#64748B;display:flex;align-items:center;justify-content:center;font-size:12px">[gráfico]</div>`;
  }
  if (sh.image) {
    if (opts.images === 'omit') return undefined;
    const css: string[] = [pos, 'object-fit:fill'];
    if (xform) css.push(xform);
    if (sh.alpha !== undefined && sh.alpha < 1) css.push(`opacity:${sh.alpha}`);
    return `<img src="${dataUri(sh.image)}" alt="${escapeHtml(sh.name)}" style="${css.join(';')}">`;
  }

  const css: string[] = [pos];
  if (xform) css.push(xform);
  const bg = fillCss(sh.fill, sh.fillAlpha);
  if (bg) css.push(bg);
  if (sh.fillImage && opts.images !== 'omit') {
    css.push(`background-image:url(${dataUri(sh.fillImage)})`, 'background-size:100% 100%');
  }
  if (sh.lineColor) {
    const wpx = Math.max(1, Math.round((sh.lineWidth ?? 9525) / EMU_PER_PX));
    const style = sh.lineDash ? (sh.lineDash.includes('ot') ? 'dotted' : 'dashed') : 'solid';
    css.push(`border:${wpx}px ${style} ${sh.lineColor}`);
  }
  const radius = radiusCss(sh.geom);
  if (radius) css.push(radius);

  let inner = '';
  if (sh.txBody) {
    const anchor = sh.txBody.anchor ?? ((sh.phType === 'title' || sh.phType === 'ctrTitle') ? 'ctr' : 't');
    const justify = anchor === 'ctr' ? 'center' : anchor === 'b' ? 'flex-end' : 'flex-start';
    css.push('display:flex', 'flex-direction:column', `justify-content:${justify}`, 'overflow:hidden', 'padding:4.8px 9.6px');
    inner = bodyHtml(sh.txBody, sh.phType === 'title' || sh.phType === 'ctrTitle');
  }
  if (!inner && !bg && !sh.lineColor && !sh.fillImage) return undefined; // nada visível
  return `<div style="${css.join(';')}">${inner}</div>`;
}

function slideHtml(slide: Slide, pres: Presentation, opts: HtmlOptions): string {
  const wPx = Math.round(pres.slideW / EMU_PER_PX);
  const css: string[] = [
    'position:relative', `width:${wPx}px`, `aspect-ratio:${pres.slideW}/${pres.slideH}`,
    'overflow:hidden', `background-color:${slide.bg?.color ?? '#ffffff'}`,
    "font-family:'Aptos',Calibri,Arial,sans-serif",
  ];
  if (slide.bgImage && opts.images !== 'omit') {
    css.push(`background-image:url(${dataUri(slide.bgImage)})`, 'background-size:100% 100%');
  }
  const shapes = slide.shapes
    .map((sh) => shapeHtml(sh, pres, opts))
    .filter((s): s is string => s !== undefined);
  return `<section class="slide" style="${css.join(';')}">\n${shapes.join('\n')}\n</section>`;
}

/** Exporta o .pptx inteiro para HTML estático (um `<section>` por slide). */
export function pptxToHtml(bytes: Uint8Array, opts: HtmlOptions = {}): string {
  const deck = loadDeck(bytes);
  const body = deck.slides.map((ds) => slideHtml(ds.slide, deck.pres, opts)).join('\n');
  if (!opts.fullDocument) return body;
  return `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>Apresentação</title>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}
