// Desenho do texto de UMA célula como o Excel: caixa útil (margem medida),
// alinhamento horizontal (geral/esquerda/centro/direita/preencher/justificar/
// distribuído/centralizar na seleção, recuo), vertical (topo/centro/base/
// justificar/distribuído), quebra de linha com as larguras do Excel,
// transbordo para vizinhas vazias, rotação (1..180 e 255 = empilhado),
// sublinhados (simples/duplo/contábil), tachado — glifo a glifo nas posições
// inteiras (drawCellText).
import type { UnderlineStyle } from '@universal/sheet-core';
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
  /** Aba da direita para a esquerda. */
  rtl?: boolean;
}

/** Alinhamento efetivo: geral → número à direita, texto à esquerda, booleano/erro ao centro. */
export function effectiveHAlign(halign: string | undefined, kind: CellKind): string {
  if (!halign || halign === 'general') return kind === 'number' ? 'right' : kind === 'text' ? 'left' : 'center';
  return halign;
}

/** Linha de base de UMA linha de texto conforme o alinhamento vertical. */
export function baselineFor(f: CellFont, valign: string | undefined, top: number, h: number): number {
  const asc = f.ascent, desc = f.descent;
  if (valign === 'top') return top + 1 + asc;
  if (valign === 'center' || valign === 'justify' || valign === 'distributed') return top + Math.floor((h - (asc + desc)) / 2) + asc + 1;
  return top + h - 1 - desc;
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
  let halign = effectiveHAlign(a.halign, a.kind);
  if (a.rtl && (!a.halign || a.halign === 'general')) halign = halign === 'right' ? 'left' : halign === 'left' ? 'right' : halign;
  const indent = a.indent > 0 && (halign === 'left' || halign === 'right' || halign === 'distributed') ? a.indent * a.indentPx : 0;
  ctx.fillStyle = a.color;
  ctx.textBaseline = 'alphabetic';

  const rot = a.rotation;
  if (rot && a.kind === 'text') { paintRotated(a, boxL, boxR, rot); return; }

  const wrapMode = a.kind === 'text' && !ct.hashes && (a.wrap || halign === 'justify' || halign === 'distributed' || a.valign === 'justify' || a.valign === 'distributed');
  if (wrapMode) { paintWrapped(a, boxL, boxW, halign, indent); return; }

  const W = ct.width >= 0 ? ct.width : textWidth(f, ct.text, boxW + 4096);
  // posição horizontal (medida, e4): esquerda na caixa; à direita o TEXTO fica 1 px
  // antes do número; centro pela célula inteira; recuo conta da margem (sem a
  // linha de grade)
  let x0: number;
  if (ct.filled) x0 = boxL;
  else if (halign === 'fill' && a.kind === 'text' && W > 0) x0 = boxL;
  else if (halign === 'right') x0 = boxR - W - indent - (a.kind === 'number' ? 0 : 1);
  else if (halign === 'center' || halign === 'centerContinuous') x0 = a.left + Math.floor((a.w - W - 1) / 2);
  else x0 = indent ? boxL - 1 + indent : boxL;
  // transbordo do texto para as vizinhas vazias
  let clipL = a.left, clipR = a.left + a.w;
  if (ct.overflows && !a.merged && W > boxW - indent && halign !== 'fill') {
    const over = W - (boxW - indent);
    if (halign === 'right') clipL -= a.overflow(-1, over);
    else if (halign === 'center' || halign === 'centerContinuous') { clipL -= a.overflow(-1, over / 2 + 1); clipR += a.overflow(1, over / 2 + 1); }
    else clipR += a.overflow(1, over);
  }
  const y = baselineFor(f, a.valign, a.top, a.h);
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
    // contábil: mais baixo e, em número, a largura da célula toda
    const xa = accounting && a.kind === 'number' ? boxL : x0;
    const xb = accounting && a.kind === 'number' ? boxR : x0 + W;
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
  const total = lines.length * lineH;
  let y0: number;
  const va = a.valign ?? 'bottom';
  if (va === 'top' || va === 'justify' || va === 'distributed') y0 = a.top + 1;
  else if (va === 'center') y0 = a.top + Math.floor((a.h - total) / 2);
  else y0 = a.top + a.h - total;
  // linha de base dentro de cada linha: o texto fica embaixo da linha (descendente na base)
  const inLine = (i: number): number => y0 + (i + 1) * lineH - f.descent - 1;
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

function paintRotated(a: PaintTextArgs, boxL: number, boxR: number, rot: number): void {
  const { ctx, f, ct } = a;
  ctx.save();
  ctx.beginPath();
  ctx.rect(a.left + 1, a.top + 1, Math.max(0, a.w - 1), Math.max(0, a.h - 1));
  ctx.clip();
  if (rot === 255) {
    // empilhado: um caractere por linha, centralizado na coluna
    const lineH = f.ascent + f.descent;
    const chars = [...ct.text];
    const total = chars.length * lineH;
    const va = a.valign ?? 'bottom';
    let y = va === 'top' ? a.top + 1 : va === 'center' ? a.top + Math.floor((a.h - total) / 2) : a.top + a.h - 1 - total;
    for (const ch of chars) {
      const cw = f.adv(ch);
      drawCellText(ctx, f, ch, a.left + Math.floor((a.w - cw) / 2), y + f.ascent);
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
  const halign = effectiveHAlign(a.halign, a.kind);
  const cx = halign === 'right' ? boxR - bw / 2 : halign === 'center' ? (boxL + boxR) / 2 : boxL + bw / 2;
  const va = a.valign ?? 'bottom';
  const cy = va === 'top' ? a.top + 1 + bh / 2 : va === 'center' ? a.top + a.h / 2 : a.top + a.h - 1 - bh / 2;
  ctx.translate(cx, cy);
  ctx.rotate(rad);
  drawCellText(ctx, f, ct.text, -W / 2, H / 2 - f.descent);
  ctx.restore();
}
