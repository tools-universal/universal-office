// Desenho do texto de UMA célula como o Excel: caixa útil (margem medida),
// alinhamento horizontal (geral/esquerda/centro/direita/preencher/justificar/
// distribuído/centralizar na seleção, recuo), vertical (topo/centro/base/
// justificar/distribuído), quebra de linha com as larguras do Excel,
// transbordo para vizinhas vazias, rotação (1..180 e 255 = empilhado),
// sublinhados (simples/duplo/contábil), tachado — glifo a glifo nas posições
// inteiras (drawCellText).
import type { UnderlineStyle } from '@universal-office/sheet-core';
import { cellMarginPx, textWidth, type CellKind, type CellText } from './cell-text.js';
import { drawCellText, type CellFont } from './text-metrics.js';

export interface PaintTextArgs {
  ctx: CanvasRenderingContext2D;
  f: CellFont;
  ct: CellText;
  kind: CellKind;
  /** Retângulo da célula (ou da mescla), px de tela; `left`/`top` = linha de grade. */
  left: number; top: number; w: number; h: number;
  /** Alinhamentos do xf (undefined = geral / base). */
  halign?: string; valign?: string;
  wrap: boolean;
  /** Níveis de recuo e px por nível. */
  indent: number; indentPx: number;
  /** Graus do xf (0..180, 255). */
  rotation: number;
  color: string;
  underline?: UnderlineStyle;
  strike: boolean;
  /** Altura de uma linha de texto da fonte no Excel (px) — entrelinha da quebra. */
  lineH: number;
  merged: boolean;
  /** Folga das vizinhas vazias para o transbordo (dir +1 → direita), até `need` px. */
  overflow(dir: 1 | -1, need: number): number;
  /** Deslocamento da linha de base (px, + = para baixo): sobrescrito/subscrito da célula. */
  baselineShift?: number;
  /** Maior descent da linha (base compartilhada no alinhamento à base). */
  rowDesc?: number;
}

/**
 * Indicador de erro do Excel (verificação em segundo plano: "número armazenado
 * como texto"): triângulo #008000 no canto superior esquerdo, catetos de 6 px a
 * 100%, a 1 px da linha de grade (medido na imagem do Excel, lab e18).
 */
export function paintErrorMark(ctx: CanvasRenderingContext2D, left: number, top: number, zoom: number): void {
  const n = Math.max(2, Math.round(6 * zoom));
  const x = Math.round(left) + 1, y = Math.round(top) + 1;
  ctx.fillStyle = '#008000';
  for (let k = 0; k < n; k++) ctx.fillRect(x, y + k, n - k, 1);
}

/** x do texto centralizado de largura W numa célula [left, left + w] (medido, e4: 1 + ⌊(w − W)/2⌋). */
export function centerX(left: number, w: number, W: number): number {
  return left + 1 + Math.floor((w - W) / 2);
}

/** Alinhamento efetivo: geral → número à direita, texto à esquerda, booleano/erro ao centro. */
export function effectiveHAlign(halign: string | undefined, kind: CellKind): string {
  if (!halign || halign === 'general') return kind === 'number' ? 'right' : kind === 'text' ? 'left' : 'center';
  return halign;
}

/**
 * Linha de base de UMA linha de texto conforme o alinhamento vertical, com as
 * distâncias medidas no Excel (xlAscent do topo; centro entre as duas). Na
 * base, a linha de base é COMPARTILHADA: sobe o maior descent da linha
 * (`rowDesc`: fonte Normal das células vazias e demais células) — Arial 10 em
 * linha com a Normal Calibri 11 senta a 4 px da base, não a 3 (lab e10/e12).
 */
export function baselineFor(f: CellFont, valign: string | undefined, top: number, h: number, rowDesc = 0): number {
  if (valign === 'top') return top + f.xlAscent;
  if (valign === 'center' || valign === 'justify' || valign === 'distributed') return top + Math.floor((h - (f.xlAscent + f.xlDescent)) / 2) + f.xlAscent;
  return top + h - Math.max(f.xlDescent, rowDesc);
}

/** Quebra como o Excel: nos espaços (e depois de "-"); palavra maior que a linha quebra por caractere; "\n" força. */
export function wrapLines(f: CellFont, text: string, maxW: number, maxLines = Infinity): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    if (out.length >= maxLines) break;
    if (para === '') { out.push(''); continue; }
    // pedaços: palavra + espaços seguintes (o espaço final não conta na largura)
    const tokens = para.match(/[^\s-]*-+|[^\s-]+|\s+/g) ?? [para];
    let line = '';
    let lineW = 0;
    for (const tok of tokens) {
      const tw = f.width(tok);
      if (/^\s+$/.test(tok)) { line += tok; lineW += tw; continue; }
      if (line !== '' && lineW + tw > maxW) {
        out.push(line.replace(/\s+$/, ''));
        if (out.length >= maxLines) return out;
        line = ''; lineW = 0;
      }
      if (tw > maxW) {
        // palavra sozinha maior que a linha: quebra por caractere
        for (const ch of tok) {
          const cw = f.adv(ch);
          if (line !== '' && lineW + cw > maxW) {
            out.push(line);
            if (out.length >= maxLines) return out;
            line = ''; lineW = 0;
          }
          line += ch; lineW += cw;
        }
        continue;
      }
      line += tok; lineW += tw;
    }
    out.push(line.replace(/\s+$/, ''));
  }
  return out.length ? out : [''];
}

/** Desenha o conteúdo de uma célula (ver PaintTextArgs). */
export function paintCellText(a: PaintTextArgs): void {
  const { ctx, f, ct } = a;
  if (ct.pieces.length === 0 && ct.text === '') return;
  const margin = (cellMarginPx(f.ppem) - 1) / 2;
  const boxL = a.left + 1 + margin;
  const boxR = a.left + a.w - margin;
  const boxW = Math.max(0, boxR - boxL);
  // aba RTL: a grade inteira é pintada espelhada (renderRegionToCanvas), o que já
  // inverte os alinhamentos como o Excel
  const halign = effectiveHAlign(a.halign, a.kind);
  const indent = a.indent > 0 && (halign === 'left' || halign === 'right' || halign === 'distributed') ? a.indent * a.indentPx : 0;
  ctx.fillStyle = a.color;
  ctx.textBaseline = 'alphabetic';

  const rot = a.rotation;
  if (rot && a.kind === 'text') { paintRotated(a, boxL, boxR, rot); return; }

  const wrapMode = a.kind === 'text' && !ct.hashes && (a.wrap || halign === 'justify' || halign === 'distributed' || a.valign === 'justify' || a.valign === 'distributed');
  if (wrapMode) { paintWrapped(a, boxL, boxW, halign, indent); return; }

  const W = ct.width >= 0 ? ct.width : textWidth(f, ct.text, boxW + 4096);
  // posição horizontal (medida no oráculo 1:1, e4/e10): esquerda e direita na
  // caixa; centro pela célula inteira, 1 + ⌊(w − W)/2⌋; recuo em níveis de 3
  // espaços da fonte Normal
  let x0: number;
  if (ct.filled) x0 = boxL;
  else if (halign === 'fill' && a.kind === 'text' && W > 0) x0 = boxL;
  else if (halign === 'right') x0 = boxR - W - indent;
  else if (halign === 'center' || halign === 'centerContinuous') x0 = centerX(a.left, a.w, W);
  else x0 = boxL + indent;
  // transbordo do texto para as vizinhas vazias
  let clipL = a.left, clipR = a.left + a.w;
  if (ct.overflows && !a.merged && W > boxW - indent && halign !== 'fill') {
    const over = W - (boxW - indent);
    if (halign === 'right') clipL -= a.overflow(-1, over);
    else if (halign === 'center' || halign === 'centerContinuous') { clipL -= a.overflow(-1, over / 2 + 1); clipR += a.overflow(1, over / 2 + 1); }
    else clipR += a.overflow(1, over);
  }
  const y = baselineFor(f, a.valign, a.top, a.h, a.rowDesc) + (a.baselineShift ?? 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(clipL + 1, a.top + 1, Math.max(0, clipR - clipL - 1), Math.max(0, a.h - 1));
  ctx.clip();
  if (halign === 'fill' && a.kind === 'text' && !ct.filled && W > 0) {
    // "preencher": repete o conteúdo enquanto couber inteiro
    const n = Math.max(1, Math.floor(boxW / W));
    for (let i = 0; i < n; i++) for (const p of ct.pieces) drawCellText(ctx, f, p.s, x0 + i * W + p.x, y, clipL, clipR);
  } else {
    for (const p of ct.pieces) drawCellText(ctx, f, p.s, x0 + p.x, y, clipL, clipR);
  }
  if (!ct.hashes) decorate(a, x0, W, y, boxL, boxR);
  ctx.restore();
}

/** Sublinhado/tachado de uma linha de texto desenhada em [x0, x0+W]. */
function decorate(a: PaintTextArgs, x0: number, W: number, y: number, boxL: number, boxR: number): void {
  const { ctx, f } = a;
  if (!a.underline && !a.strike) return;
  const t = Math.max(1, Math.round(f.ppem / 16));
  ctx.fillStyle = a.color;
  const line = (yy: number, xa: number, xb: number): void => { ctx.fillRect(Math.round(xa), Math.round(yy), Math.round(xb - xa), t); };
  if (a.underline) {
    const accounting = a.underline === 'singleAccounting' || a.underline === 'doubleAccounting';
    // contábil: mais baixo e na largura da célula toda (texto também; medido, e4)
    const xa = accounting ? boxL : x0;
    const xb = accounting ? boxR : x0 + W;
    const u1 = y + Math.max(1, Math.round(f.descent * (accounting ? 0.6 : 0.35)));
    line(u1, xa, xb);
    if (a.underline === 'double' || a.underline === 'doubleAccounting') line(u1 + t + 1, xa, xb);
  }
  if (a.strike) line(y - Math.round(f.ascent * 0.33), x0, x0 + W);
}

function paintWrapped(a: PaintTextArgs, boxL: number, boxW: number, halign: string, indent: number): void {
  const { ctx, f, ct } = a;
  const maxLines = Math.max(1, Math.ceil(a.h / Math.max(1, a.lineH)) + 1);
  const lines = wrapLines(f, ct.text, Math.max(1, boxW - indent), maxLines + 64);
  const lineH = a.lineH;
  // bloco de n linhas: 1ª linha de base a xlAscent do topo do bloco, as demais a
  // cada lineH; a última a xlDescent da base do bloco (na base: a compartilhada)
  const blockH = (lines.length - 1) * lineH + f.xlAscent + f.xlDescent;
  let y0: number;
  const va = a.valign ?? 'bottom';
  if (va === 'top' || va === 'justify' || va === 'distributed') y0 = a.top;
  else if (va === 'center') y0 = a.top + Math.floor((a.h - blockH) / 2);
  else y0 = a.top + a.h - blockH - Math.max(0, (a.rowDesc ?? 0) - f.xlDescent);
  const inLine = (i: number): number => y0 + f.xlAscent + i * lineH;
  ctx.save();
  ctx.beginPath();
  ctx.rect(a.left + 1, a.top + 1, Math.max(0, a.w - 1), Math.max(0, a.h - 1));
  ctx.clip();
  lines.forEach((line, i) => {
    const y = inLine(i);
    if (y - f.ascent > a.top + a.h || y + f.descent < a.top) return;
    const W = f.width(line);
    const last = i === lines.length - 1;
    let x: number;
    if ((halign === 'justify' && !last) || halign === 'distributed') {
      // justificado: distribui a folga entre as palavras
      const words = line.split(/ +/);
      if (words.length > 1) {
        const ww = words.reduce((s, w) => s + f.width(w), 0);
        const gap = (boxW - indent - ww) / (words.length - 1);
        let cx = boxL + indent;
        for (const w of words) { drawCellText(ctx, f, w, Math.round(cx), y); cx += f.width(w) + gap; }
        return;
      }
      x = halign === 'distributed' ? boxL + Math.floor((boxW - W) / 2) : boxL + indent;
    } else if (halign === 'right') x = boxL + boxW - W - indent;
    else if (halign === 'center' || halign === 'centerContinuous' || halign === 'distributed') x = boxL + Math.floor((boxW - W) / 2);
    else x = boxL + indent;
    drawCellText(ctx, f, line, x, y);
    decorate(a, x, W, y, boxL, boxL + boxW);
  });
  ctx.restore();
}

/** Fonte e estilo de um run de texto rico. */
export interface RichRunStyle {
  f: CellFont;
  color: string;
  underline?: UnderlineStyle;
  strike: boolean;
  /** Deslocamento da linha de base (sobrescrito/subscrito do run). */
  shift: number;
  /** Altura de linha do Excel para a fonte do run (entrelinha da quebra). */
  lineH: number;
}

export interface PaintRichArgs {
  ctx: CanvasRenderingContext2D;
  texts: string[];
  styles: RichRunStyle[];
  left: number; top: number; w: number; h: number;
  halign?: string; valign?: string; wrap: boolean;
  indent: number; indentPx: number;
  merged: boolean;
  overflow(dir: 1 | -1, need: number): number;
  /** Maior descent da linha (base compartilhada no alinhamento à base). */
  rowDesc?: number;
}

/**
 * Texto RICO: cada run com a sua fonte (larguras do Excel, glifo a glifo), cor,
 * sublinhado/tachado e sobrescrito/subscrito; mesmas caixa, alinhamento,
 * transbordo e quebra do texto simples; a linha de base da linha usa a maior
 * subida/descida entre os runs.
 */
export function paintRichText(a: PaintRichArgs, layoutLines: (texts: readonly string[], maxW: number, measure: (t: string, run: number) => number) => { text: string; run: number }[][]): void {
  const { ctx } = a;
  const st = a.styles;
  if (!st.length) return;
  const f0 = st[0]!.f;
  const margin = (cellMarginPx(f0.ppem) - 1) / 2;
  const boxL = a.left + 1 + margin;
  const boxR = a.left + a.w - margin;
  const boxW = Math.max(0, boxR - boxL);
  const halign = effectiveHAlign(a.halign, 'text');
  const indent = a.indent > 0 && (halign === 'left' || halign === 'right') ? a.indent * a.indentPx : 0;
  const measure = (t: string, run: number): number => st[run]!.f.width(t);
  ctx.textBaseline = 'alphabetic';
  const lineMetrics = (segs: { text: string; run: number }[]): { asc: number; desc: number; lh: number } => {
    let asc = 0, desc = 0, lh = 0;
    for (const s of segs) { const r = st[s.run]!; asc = Math.max(asc, r.f.xlAscent - Math.min(0, r.shift)); desc = Math.max(desc, r.f.xlDescent + Math.max(0, r.shift)); lh = Math.max(lh, r.lineH); }
    if (!segs.length) { asc = f0.xlAscent; desc = f0.xlDescent; lh = st[0]!.lineH; }
    return { asc, desc, lh };
  };
  const drawLine = (segs: { text: string; run: number }[], baseline: number, xStart: number): void => {
    let x = xStart;
    for (const s of segs) {
      const r = st[s.run]!;
      const sw = r.f.width(s.text);
      ctx.fillStyle = r.color;
      drawCellText(ctx, r.f, s.text, x, baseline + r.shift);
      if (r.underline || r.strike) {
        const t = Math.max(1, Math.round(r.f.ppem / 16));
        if (r.underline) {
          const u1 = baseline + r.shift + Math.max(1, Math.round(r.f.descent * 0.35));
          ctx.fillRect(Math.round(x), Math.round(u1), Math.round(sw), t);
          if (r.underline === 'double' || r.underline === 'doubleAccounting') ctx.fillRect(Math.round(x), Math.round(u1) + t + 1, Math.round(sw), t);
        }
        if (r.strike) ctx.fillRect(Math.round(x), Math.round(baseline + r.shift - r.f.ascent * 0.33), Math.round(sw), t);
      }
      x += sw;
    }
  };
  const xFor = (W: number): number => (halign === 'right' ? boxR - W - indent
    : halign === 'center' || halign === 'centerContinuous' ? centerX(a.left, a.w, W) : boxL + indent);

  if (a.wrap) {
    const lines = layoutLines(a.texts, Math.max(1, boxW - indent), measure);
    const ms = lines.map(lineMetrics);
    const total = ms.reduce((s, m, i) => s + (i < ms.length - 1 ? m.lh : m.asc + m.desc), 0);
    const va = a.valign ?? 'bottom';
    let y = va === 'top' ? a.top : va === 'center' ? a.top + Math.floor((a.h - total) / 2)
      : a.top + a.h - total - Math.max(0, (a.rowDesc ?? 0) - (ms[ms.length - 1]?.desc ?? 0));
    ctx.save();
    ctx.beginPath(); ctx.rect(a.left + 1, a.top + 1, Math.max(0, a.w - 1), Math.max(0, a.h - 1)); ctx.clip();
    lines.forEach((segs, i) => {
      const m = ms[i]!;
      const W = segs.reduce((s, g) => s + measure(g.text, g.run), 0);
      drawLine(segs, y + m.asc, xFor(W));
      y += m.lh;
    });
    ctx.restore();
    return;
  }
  const segs = a.texts.map((text, run) => ({ text, run })).filter((s) => s.text !== '');
  if (!segs.length) return;
  const W = segs.reduce((s, g) => s + measure(g.text, g.run), 0);
  const m = lineMetrics(segs);
  const va = a.valign ?? 'bottom';
  const baseline = va === 'top' ? a.top + m.asc : va === 'center' || va === 'justify' || va === 'distributed'
    ? a.top + Math.floor((a.h - (m.asc + m.desc)) / 2) + m.asc : a.top + a.h - Math.max(m.desc, a.rowDesc ?? 0);
  let clipL = a.left, clipR = a.left + a.w;
  if (!a.merged && W > boxW - indent) {
    const over = W - (boxW - indent);
    if (halign === 'right') clipL -= a.overflow(-1, over);
    else if (halign === 'center' || halign === 'centerContinuous') { clipL -= a.overflow(-1, over / 2 + 1); clipR += a.overflow(1, over / 2 + 1); }
    else clipR += a.overflow(1, over);
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(clipL + 1, a.top + 1, Math.max(0, clipR - clipL - 1), Math.max(0, a.h - 1)); ctx.clip();
  drawLine(segs, baseline, xFor(W));
  ctx.restore();
}

function paintRotated(a: PaintTextArgs, boxL: number, boxR: number, rot: number): void {
  const { ctx, f, ct } = a;
  ctx.save();
  ctx.beginPath();
  ctx.rect(a.left + 1, a.top + 1, Math.max(0, a.w - 1), Math.max(0, a.h - 1));
  ctx.clip();
  if (rot === 255) {
    // empilhado: um caractere por linha (entrelinha = altura de linha da fonte no
    // Excel), centralizado na coluna; a última letra na base
    const lineH = a.lineH;
    const chars = [...ct.text];
    const total = (chars.length - 1) * lineH + f.xlAscent + f.xlDescent;
    const va = a.valign ?? 'bottom';
    let y = va === 'top' ? a.top : va === 'center' ? a.top + Math.floor((a.h - total) / 2) : a.top + a.h - total;
    y += f.xlAscent;
    for (const ch of chars) {
      const cw = f.adv(ch);
      drawCellText(ctx, f, ch, a.left + Math.floor((a.w - cw) / 2), y);
      y += lineH;
    }
    ctx.restore();
    return;
  }
  // 1..90 anti-horário; 91..180 = horário (rot − 90)
  const deg = rot <= 90 ? rot : -(rot - 90);
  const rad = (-deg * Math.PI) / 180;
  const W = f.width(ct.text);
  const H = f.ascent + f.descent;
  const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
  const bw = W * cos + H * sin;   // caixa do texto girado
  const bh = W * sin + H * cos;
  // vertical (±90°) em Geral: o Excel encosta o texto à DIREITA da célula (medido, e4)
  const halign = (rot === 90 || rot === 180) && (!a.halign || a.halign === 'general') ? 'right' : effectiveHAlign(a.halign, a.kind);
  const cx = halign === 'right' ? boxR - bw / 2 : halign === 'center' ? (boxL + boxR) / 2 : boxL + bw / 2;
  const va = a.valign ?? 'bottom';
  const cy = va === 'top' ? a.top + 1 + bh / 2 : va === 'center' ? a.top + a.h / 2 : a.top + a.h - 1 - bh / 2;
  ctx.translate(cx, cy);
  ctx.rotate(rad);
  drawCellText(ctx, f, ct.text, -W / 2, H / 2 - f.descent);
  ctx.restore();
}
