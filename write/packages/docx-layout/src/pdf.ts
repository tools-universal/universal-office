import { PdfDocument, hexColor, type EmbeddedFont, type PdfImage, type PdfPage, type PathCmd } from '@universal-office/pdf';
import type { InlineImage } from '@universal-office/docx-core';
import type { LayoutResult, PageItem } from './tree.js';
import type { FontFace } from './fonts.js';
import { decodeRaster, jpegInfo } from './images.js';

/**
 * Pinta a árvore de layout num PDF (o mesmo desenho do canvas): glifos
 * posicionados um a um (fonte embutida em subconjunto), retângulos, linhas,
 * caminhos, imagens (JPEG direto; PNG/GIF/BMP decodificados) e recortes.
 */

export interface PdfRenderOptions {
  /** comprime os content streams (padrão true) */
  compress?: boolean;
  /** decodificador de imagens extra (ex.: canvas no navegador para EMF/SVG/TIFF) */
  decodeImage?: (img: InlineImage) => { rgba: Uint8Array; width: number; height: number } | null;
}

const T = 20; // twips por ponto

export function renderPdf(result: LayoutResult, opts: PdfRenderOptions = {}): Uint8Array {
  const doc = new PdfDocument({ compress: opts.compress ?? true });
  const fonts = new Map<string, EmbeddedFont | null>();
  const images = new WeakMap<InlineImage, PdfImage | null>();

  const fontFor = (face: FontFace): EmbeddedFont | null => {
    let f = fonts.get(face.key);
    if (f === undefined) {
      if (!face.bytes) f = null;
      else {
        const sf = face.font;
        const m = sf.metrics;
        f = doc.embedFont(face.family.replace(/\s+/g, '') + (face.bold ? '-Bold' : '') + (face.italic ? '-Italic' : ''), face.bytes, {
          unitsPerEm: m.unitsPerEm,
          ascender: m.ascender,
          descender: m.descender,
          glyphId: (cp) => {
            const g = sf.glyphId(cp);
            return g === 0 && cp >= 0xf000 && cp <= 0xf0ff ? sf.glyphId(cp - 0xf000) : g;
          },
          advanceWidth: (g) => sf.advanceWidth(g),
        });
      }
      fonts.set(face.key, f);
    }
    return f;
  };

  const imageFor = (img: InlineImage): PdfImage | null => {
    let h = images.get(img);
    if (h !== undefined) return h;
    h = null;
    const data = img.data;
    // decodificador que falha (arquivo corrompido, variante não suportada): a imagem
    // fica de fora e o PDF segue — não aborta a exportação inteira
    try {
      const jp = jpegInfo(data);
      if (jp) h = doc.embedJpeg(data, jp.width, jp.height, jp.components, jp.adobe);
      else {
        const r = decodeRaster(data);
        if (r) h = doc.embedRgba(r.data, r.width, r.height);
        else {
          const ext = opts.decodeImage?.(img);
          if (ext) h = doc.embedRgba(ext.rgba, ext.width, ext.height);
        }
      }
    } catch {
      h = null;
    }
    images.set(img, h);
    return h;
  };

  for (const lp of result.pages) {
    const page = doc.addPage(lp.widthTw / T, lp.heightTw / T);
    for (const it of lp.items) paintItem(page, it, fontFor, imageFor);
  }
  return doc.build();
}

function paintItem(
  page: PdfPage, it: PageItem,
  fontFor: (f: FontFace) => EmbeddedFont | null, imageFor: (i: InlineImage) => PdfImage | null,
): void {
  switch (it.t) {
    case 'glyphs': {
      const ef = fontFor(it.face);
      if (!ef) return;
      const placed = it.glyphs.map((g) => {
        const { gid } = ef.encode(g.cp);
        return { gid, codePoint: g.cp, xPt: g.x / T, baselineFromTopPt: it.y / T };
      });
      page.withAlpha(it.alpha, it.alpha, () => page.glyphs(ef, it.sizePt, hexColor(it.color), placed, {
        ...(it.scaleX ? { scaleX: it.scaleX } : {}),
        ...(it.synthBold ? { synthBold: true } : {}),
        ...(it.synthItalic ? { synthItalic: true } : {}),
      }));
      return;
    }
    case 'rect':
      page.withAlpha(it.alpha, undefined, () => page.fillRect(it.x / T, it.y / T, it.w / T, it.h / T, hexColor(it.fill)));
      return;
    case 'line': {
      const dash = it.dash === 'dotted' ? [it.widthPt, it.widthPt * 2] : it.dash === 'dashed' ? [it.widthPt * 4, it.widthPt * 3]
        : it.dash === 'dashDot' ? [it.widthPt * 4, it.widthPt * 2, it.widthPt, it.widthPt * 2] : it.dash === 'dashDotDot' ? [it.widthPt * 4, it.widthPt * 2, it.widthPt, it.widthPt * 2, it.widthPt, it.widthPt * 2] : undefined;
      page.line(it.x1 / T, it.y1 / T, it.x2 / T, it.y2 / T, hexColor(it.color), it.widthPt, dash);
      return;
    }
    case 'image': {
      const h = imageFor(it.image);
      if (!h) return;
      let x = it.x / T, y = it.y / T, w = it.w / T, hh = it.h / T;
      const crop = it.crop;
      if (crop && (crop.l || crop.t || crop.r || crop.b)) {
        page.pushClipRect(x, y, w, hh);
        const fw = w / Math.max(0.01, 1 - crop.l - crop.r);
        const fh = hh / Math.max(0.01, 1 - crop.t - crop.b);
        x -= crop.l * fw; y -= crop.t * fh; w = fw; hh = fh;
        page.drawImageTransformed(h, x, y, w, hh, it.rot ?? 0, !!it.flipH, !!it.flipV);
        page.popClip();
      } else if (it.rot || it.flipH || it.flipV) page.drawImageTransformed(h, x, y, w, hh, it.rot ?? 0, !!it.flipH, !!it.flipV);
      else page.drawImage(h, x, y, w, hh);
      return;
    }
    case 'shape': {
      const fill = it.fill && /^[0-9A-Fa-f]{6}$/.test(it.fill) ? hexColor(it.fill) : undefined;
      const stroke = it.stroke && /^[0-9A-Fa-f]{6}$/.test(it.stroke.color)
        ? { color: hexColor(it.stroke.color), widthPt: Math.max(0.25, it.stroke.widthPt), ...(it.stroke.dash ? { dash: [it.stroke.widthPt * 3, it.stroke.widthPt * 2] } : {}) }
        : undefined;
      if (!fill && !stroke) return;
      const x = it.x / T, y = it.y / T, w = it.w / T, h = it.h / T;
      let cmds = shapePath(it.style.geom, x, y, w, h, it.line, !!it.style.flipH, !!it.style.flipV);
      if (it.style.rot) cmds = rotatePath(cmds, x + w / 2, y + h / 2, it.style.rot);
      // transparência do preenchimento/contorno (a:alpha, v:fill opacity)
      page.withAlpha(it.style.fillAlpha, it.style.line?.alpha, () => page.path(cmds, it.style.geom === 'line' ? undefined : fill, stroke));
      return;
    }
    case 'path': {
      const fill = it.fill && /^[0-9A-Fa-f]{6}$/.test(it.fill) ? hexColor(it.fill) : undefined;
      const stroke = it.stroke ? { color: hexColor(it.stroke.color), widthPt: Math.max(0.25, it.stroke.widthPt), ...(it.stroke.dash ? { dash: [it.stroke.widthPt * 3, it.stroke.widthPt * 2] } : {}) } : undefined;
      const cmds: PathCmd[] = it.cmds.map((c) => c.op === 'Z' ? c : c.op === 'C'
        ? { op: 'C', x1: c.x1 / T, y1: c.y1 / T, x2: c.x2 / T, y2: c.y2 / T, x: c.x / T, y: c.y / T }
        : { op: c.op, x: c.x / T, y: c.y / T });
      page.path(cmds, fill, stroke);
      return;
    }
    case 'xform': {
      if (it.op === 'pop' || !it.m) { page.popClip(); return; }
      // M em twips com origem no topo → matriz cm do PDF (pt, origem embaixo)
      const [a, b, c, d, e, f] = it.m;
      const H = page.heightPt;
      page.pushTransform(a, -b, -c, d, c * H + e / T, H - d * H - f / T);
      return;
    }
    case 'clip':
      if (it.op === 'push') page.pushClipRect((it.x ?? 0) / T, (it.y ?? 0) / T, (it.w ?? 0) / T, (it.h ?? 0) / T);
      else page.popClip();
      return;
  }
}

const K = 0.5523;

/** Gira o caminho (graus, horário na tela) em torno de (cx, cy). */
function rotatePath(cmds: PathCmd[], cx: number, cy: number, deg: number): PathCmd[] {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const tr = (x: number, y: number): [number, number] => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  return cmds.map((m) => {
    if (m.op === 'M' || m.op === 'L') { const [x, y] = tr(m.x, m.y); return { op: m.op, x, y }; }
    if (m.op === 'C') {
      const [x1, y1] = tr(m.x1, m.y1); const [x2, y2] = tr(m.x2, m.y2); const [x, y] = tr(m.x, m.y);
      return { op: 'C', x1, y1, x2, y2, x, y };
    }
    return m;
  });
}

function shapePath(geom: string, x: number, y: number, w: number, h: number, line?: { x1: number; y1: number; x2: number; y2: number }, flipH = false, flipV = false): PathCmd[] {
  if (geom === 'line' || geom.startsWith('straightConnector')) {
    if (line) return [{ op: 'M', x: x + line.x1 / T, y: y + line.y1 / T }, { op: 'L', x: x + line.x2 / T, y: y + line.y2 / T }];
    const [x1, x2] = flipH ? [x + w, x] : [x, x + w];
    const [y1, y2] = flipV ? [y + h, y] : [y, y + h];
    return [{ op: 'M', x: x1, y: y1 }, { op: 'L', x: x2, y: y2 }];
  }
  if (geom === 'ellipse') {
    const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
    return [
      { op: 'M', x: cx + rx, y: cy },
      { op: 'C', x1: cx + rx, y1: cy + ry * K, x2: cx + rx * K, y2: cy + ry, x: cx, y: cy + ry },
      { op: 'C', x1: cx - rx * K, y1: cy + ry, x2: cx - rx, y2: cy + ry * K, x: cx - rx, y: cy },
      { op: 'C', x1: cx - rx, y1: cy - ry * K, x2: cx - rx * K, y2: cy - ry, x: cx, y: cy - ry },
      { op: 'C', x1: cx + rx * K, y1: cy - ry, x2: cx + rx, y2: cy - ry * K, x: cx + rx, y: cy },
      { op: 'Z' },
    ];
  }
  if (geom === 'roundRect') {
    const r = Math.min(w, h) * 0.1667;
    return [
      { op: 'M', x: x + r, y }, { op: 'L', x: x + w - r, y },
      { op: 'C', x1: x + w - r + r * K, y1: y, x2: x + w, y2: y + r - r * K, x: x + w, y: y + r },
      { op: 'L', x: x + w, y: y + h - r },
      { op: 'C', x1: x + w, y1: y + h - r + r * K, x2: x + w - r + r * K, y2: y + h, x: x + w - r, y: y + h },
      { op: 'L', x: x + r, y: y + h },
      { op: 'C', x1: x + r - r * K, y1: y + h, x2: x, y2: y + h - r + r * K, x, y: y + h - r },
      { op: 'L', x, y: y + r },
      { op: 'C', x1: x, y1: y + r - r * K, x2: x + r - r * K, y2: y, x: x + r, y },
      { op: 'Z' },
    ];
  }
  return [{ op: 'M', x, y }, { op: 'L', x: x + w, y }, { op: 'L', x: x + w, y: y + h }, { op: 'L', x, y: y + h }, { op: 'Z' }];
}
