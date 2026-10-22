import { BORDER_DASHES } from './tree.js';
import { PdfDocument, hexColor, type EmbeddedFont, type PdfImage, type PdfPage, type PathCmd, type PdfShading } from './pdf-writer/index.js';
import type { InlineImage } from '@universal-office/docx-core';
import type { LayoutResult, LayoutPage, PageItem, PathCmdTw, ImageItem } from './tree.js';
import { gradientTileRgba, pageFillTileTw, patternRgba, type PageFillPaint } from './page-fill.js';
import { paintPicturePdf, type PdfPictureEnv } from './pdf-picture.js';
import { OPEN_PRESETS, custPaths, gradientGeometry, gradientSamples, pathBounds, presetPath, type GradGeom } from './geometry.js';
import { isSymbolFont, type FontFace } from './fonts.js';
import { applyImageEffects, applyPictureAdjust, decodeRaster, effectDecode, jpegInfo } from './images.js';

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

  // pua: cópia da fonte para os códigos da área privada (F0xx) que ela não tem no cmap
  // (w:sym com fonte comum) — o ToUnicode grava o código privado, como o Word, sem colidir
  // com o caractere comum que use o mesmo glifo
  const fontFor = (face: FontFace, pua = false): EmbeddedFont | null => {
    const key = pua ? `${face.key}#pua` : face.key;
    let f = fonts.get(key);
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
            return g === 0 && cp >= 0xf000 && cp <= 0xf0ff && isSymbolFont(sf) ? sf.glyphId(cp - 0xf000) : g;
          },
          advanceWidth: (g) => sf.advanceWidth(g),
        });
      }
      fonts.set(key, f);
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
      const fx = img.effects;
      const jp = jpegInfo(data);
      // JPEG com ajuste de cor: brilho/contraste via /Decode; os demais exigem os pixels
      const dec = jp && fx ? effectDecode(fx, jp.components) : null;
      if (jp && (!fx || dec)) h = doc.embedJpeg(data, jp.width, jp.height, jp.components, jp.adobe, dec ?? undefined);
      else {
        const r = jp ? null : decodeRaster(data);
        if (r) {
          if (fx) applyImageEffects(r.data, fx);
          h = doc.embedRgba(r.data, r.width, r.height);
        } else {
          const ext = opts.decodeImage?.(img);
          if (ext && fx) applyImageEffects(ext.rgba, fx);
          if (ext) h = doc.embedRgba(ext.rgba, ext.width, ext.height);
          else if (jp) h = doc.embedJpeg(data, jp.width, jp.height, jp.components, jp.adobe);
        }
      }
    } catch {
      h = null;
    }
    images.set(img, h);
    return h;
  };

  // Formato da Imagem: os pixels (com os ajustes de cor) quando dá para decodificar
  const rgbaOf = (it: ImageItem): { data: Uint8Array; width: number; height: number } | null => {
    const img = it.image;
    let r: { data: Uint8Array; width: number; height: number } | null = null;
    try {
      const jp = jpegInfo(img.data);
      const d = jp ? null : decodeRaster(img.data);
      if (d) r = { data: new Uint8Array(d.data), width: d.width, height: d.height };
      else {
        const ext = opts.decodeImage?.(img);
        if (ext) r = { data: new Uint8Array(ext.rgba), width: ext.width, height: ext.height };
      }
    } catch { r = null; }
    if (!r) return null;
    if (img.effects) applyImageEffects(r.data, img.effects);
    if (it.pic) applyPictureAdjust(r.data, it.pic);
    return r;
  };
  const adjusted = new Map<string, PdfImage | null>();
  const pictureEnv = (it: ImageItem): PdfPictureEnv => {
    const look = it.pic;
    const needPixels = !!(look && (look.alpha !== undefined || look.duotone || look.clrChange));
    return {
      image: () => {
        if (!needPixels) return imageFor(it.image);
        const key = JSON.stringify([look?.alpha, look?.duotone, look?.clrChange]);
        let byImg = adjustedFor.get(it.image);
        if (!byImg) { byImg = new Map(); adjustedFor.set(it.image, byImg); }
        if (byImg.has(key)) return byImg.get(key) ?? null;
        const r = rgbaOf(it);
        const h = r ? doc.embedRgba(r.data, r.width, r.height) : imageFor(it.image);
        byImg.set(key, h);
        return h;
      },
      rgba: () => rgbaOf(it),
      masked: (alpha, mw, mh) => {
        const jp = jpegInfo(it.image.data);
        if (jp && !needPixels) {
          const fx = it.image.effects;
          const dec = fx ? effectDecode(fx, jp.components) : null;
          if (!fx || dec) return doc.embedJpeg(it.image.data, jp.width, jp.height, jp.components, jp.adobe, dec ?? undefined, { alpha, width: mw, height: mh });
        }
        const r = rgbaOf(it);
        if (!r) return imageFor(it.image);
        // a máscara (na resolução dela) multiplica o alfa da imagem
        for (let y = 0; y < r.height; y++) {
          const my = Math.min(mh - 1, Math.floor(((y + 0.5) / r.height) * mh));
          for (let x = 0; x < r.width; x++) {
            const mx = Math.min(mw - 1, Math.floor(((x + 0.5) / r.width) * mw));
            const k = (y * r.width + x) * 4 + 3;
            r.data[k] = Math.round((r.data[k]! * alpha[my * mw + mx]!) / 255);
          }
        }
        return doc.embedRgba(r.data, r.width, r.height);
      },
      embedRgba: (d, w, h) => doc.embedRgba(d, w, h),
    };
  };
  const adjustedFor = new Map<InlineImage, Map<string, PdfImage | null>>();
  void adjusted;

  // efeito da Cor da Página: o ladrilho (gradiente/padrão) embutido UMA vez por documento
  const bgImages = new Map<string, PdfImage>();
  const bgImage = (key: string, make: () => { rgba: Uint8Array; w: number; h: number }): PdfImage => {
    let h = bgImages.get(key);
    if (!h) { const r = make(); h = doc.embedRgba(r.rgba, r.w, r.h); bgImages.set(key, h); }
    return h;
  };

  for (const lp of result.pages) {
    const page = doc.addPage(lp.widthTw / T, lp.heightTw / T);
    if (lp.background) page.fillRect(0, 0, lp.widthTw / T, lp.heightTw / T, hexColor(lp.background));
    if (lp.backgroundFill) paintFillPdf(page, lp, lp.backgroundFill, bgImage, imageFor);
    for (const it of lp.items) paintItem(page, it, fontFor, imageFor, (g, smp) => doc.addShading(g, smp, page.heightPt), pictureEnv);
  }
  return doc.build();
}

/** Contorno de um glifo (camada COLR) → comandos do PDF; false sem contorno. */
function outlineInto(cmds: PathCmd[], font: FontFace['font'], gid: number, ox: number, base: number, sx: number, s: number, skew: number): boolean {
  const ol = font.glyphOutline?.(gid);
  if (!ol) return false;
  const X = (x: number, y: number) => ox + x * sx + skew * y * s;
  const Y = (y: number) => base - y * s;
  let px = 0, py = 0;
  for (const c of ol) {
    if (c.op === 'Z') { cmds.push({ op: 'Z' }); continue; }
    if (c.op === 'Q') {
      const c1x = px + (2 / 3) * (c.cx - px), c1y = py + (2 / 3) * (c.cy - py);
      const c2x = c.x + (2 / 3) * (c.cx - c.x), c2y = c.y + (2 / 3) * (c.cy - c.y);
      cmds.push({ op: 'C', x1: X(c1x, c1y), y1: Y(c1y), x2: X(c2x, c2y), y2: Y(c2y), x: X(c.x, c.y), y: Y(c.y) });
    } else cmds.push({ op: c.op, x: X(c.x, c.y), y: Y(c.y) });
    px = c.x; py = c.y;
  }
  return true;
}

/**
 * Texto como CURVAS (WordArt): cada glifo vira o seu contorno TrueType,
 * preenchido. false se a fonte não dá contornos (CFF) — aí vai como texto.
 */
function glyphsAsPath(page: PdfPage, it: Extract<PageItem, { t: 'glyphs' }>): boolean {
  const font = it.face.font;
  if (!font.glyphOutline) return false;
  const upm = font.metrics.unitsPerEm;
  const s = it.sizePt / upm, sx = s * (it.scaleX ?? 1);
  const skew = it.synthItalic ? 0.2 : 0;
  const base = it.y / T;
  const cmds: PathCmd[] = [];
  for (const g of it.glyphs) {
    const gid = g.gid ?? font.glyphId(g.cp);
    // glifo colorido (COLR): cada camada com a sua cor, na ordem da tabela
    const layers = it.colr ? font.colorLayers?.(gid) : null;
    if (layers) {
      for (const L of layers) {
        const lc: PathCmd[] = [];
        if (!outlineInto(lc, font, L.glyphId, g.x / T, base, sx, s, skew)) continue;
        if (!lc.length) continue;
        const a = L.alpha * (it.alpha ?? 1);
        page.withAlpha(a < 1 ? a : undefined, undefined, () => page.path(lc, hexColor(L.color ?? it.color)));
      }
      continue;
    }
    const ol = font.glyphOutline(gid);
    if (!ol) return false;
    const ox = g.x / T;
    const X = (x: number, y: number) => ox + x * sx + skew * y * s;
    const Y = (y: number) => base - y * s;
    let px = 0, py = 0;
    for (const c of ol) {
      if (c.op === 'Z') { cmds.push({ op: 'Z' }); continue; }
      if (c.op === 'Q') {
        // quadrática → cúbica (pontos de controle a 2/3)
        const c1x = px + (2 / 3) * (c.cx - px), c1y = py + (2 / 3) * (c.cy - py);
        const c2x = c.x + (2 / 3) * (c.cx - c.x), c2y = c.y + (2 / 3) * (c.cy - c.y);
        cmds.push({ op: 'C', x1: X(c1x, c1y), y1: Y(c1y), x2: X(c2x, c2y), y2: Y(c2y), x: X(c.x, c.y), y: Y(c.y) });
      } else cmds.push({ op: c.op, x: X(c.x, c.y), y: Y(c.y) });
      px = c.x; py = c.y;
    }
  }
  if (!cmds.length) return true;
  const color = hexColor(it.color);
  const stroke = it.synthBold ? { color, widthPt: it.sizePt * 0.03 } : undefined;
  page.withAlpha(it.alpha, it.alpha, () => page.path(cmds, color, stroke));
  return true;
}

function paintItem(
  page: PdfPage, it: PageItem,
  fontFor: (f: FontFace, pua?: boolean) => EmbeddedFont | null, imageFor: (i: InlineImage) => PdfImage | null,
  shade: (g: GradGeom, samples: Uint8Array) => PdfShading,
  pictureEnv?: (it: ImageItem) => PdfPictureEnv,
): void {
  switch (it.t) {
    case 'glyphs': {
      if (it.asPath && glyphsAsPath(page, it)) return;
      const ef = fontFor(it.face);
      if (!ef) return;
      // corpo gravado no PDF como o Word: múltiplo de 1/600" (0,12 pt) — 10 → 9,96, 11 → 11,04
      // (PDFs do oráculo); as posições dos glifos não mudam (cada um tem a sua matriz)
      const pdfSize = Math.round(it.sizePt / 0.12) * 0.12;
      // código da área privada que a fonte não tem no cmap (w:sym com fonte comum, ex.: Arial
      // F0A0 → .notdef da Calibri): vai na cópia "pua" da fonte, com o próprio código no
      // ToUnicode (como o Word)
      const sf = it.face.font;
      const isPua = (cp: number): boolean => cp >= 0xf000 && cp <= 0xf0ff && sf.glyphId(cp) === 0;
      // glifo por índice (EMF) sem contorno disponível: não há caractere para gravar
      const all = it.glyphs.filter((g) => g.gid === undefined);
      for (let i = 0; i < all.length;) {
        const pua = isPua(all[i]!.cp);
        let j = i + 1;
        while (j < all.length && isPua(all[j]!.cp) === pua) j++;
        const f = pua ? fontFor(it.face, true) ?? ef : ef;
        const placed = all.slice(i, j).map((g) => {
          const { gid } = f.encode(g.cp);
          return { gid, codePoint: g.cp, xPt: g.x / T, baselineFromTopPt: it.y / T };
        });
        page.withAlpha(it.alpha, it.alpha, () => page.glyphs(f, pdfSize, hexColor(it.color), placed, {
          ...(it.scaleX ? { scaleX: it.scaleX } : {}),
          ...(it.synthBold ? { synthBold: true } : {}),
          ...(it.synthItalic ? { synthItalic: true } : {}),
          // texto em corridas (Tm + TJ) como no PDF do Word: a extração não embaralha linhas sobrepostas
          runs: true,
        }));
        i = j;
      }
      return;
    }
    case 'rect':
      page.withAlpha(it.alpha, undefined, () => page.fillRect(it.x / T, it.y / T, it.w / T, it.h / T, hexColor(it.fill)));
      return;
    case 'line': {
      const dash = it.dash === 'dotted' ? [it.widthPt, it.widthPt * 2] : it.dash === 'dashed' ? [it.widthPt * 4, it.widthPt * 3]
        : it.dash === 'dashDot' ? [it.widthPt * 4, it.widthPt * 2, it.widthPt, it.widthPt * 2] : it.dash === 'dashDotDot' ? [it.widthPt * 4, it.widthPt * 2, it.widthPt, it.widthPt * 2, it.widthPt, it.widthPt * 2]
        : it.dash ? BORDER_DASHES[it.dash]?.(it.widthPt) : undefined;
      page.line(it.x1 / T, it.y1 / T, it.x2 / T, it.y2 / T, hexColor(it.color), it.widthPt, dash);
      return;
    }
    case 'image': {
      // Formato da Imagem (e recorte girado): a composição no referencial da imagem
      if (pictureEnv && (it.pic || (it.crop && (it.rot || it.flipH || it.flipV)))) { paintPicturePdf(page, it, pictureEnv(it)); return; }
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
      const st = it.style;
      const fill = it.fill && /^[0-9A-Fa-f]{6}$/.test(it.fill) ? hexColor(it.fill) : undefined;
      const stroke = it.stroke && /^[0-9A-Fa-f]{6}$/.test(it.stroke.color)
        ? { color: hexColor(it.stroke.color), widthPt: Math.max(0.25, it.stroke.widthPt), ...(it.stroke.dash ? { dash: [it.stroke.widthPt * 3, it.stroke.widthPt * 2] } : {}) }
        : undefined;
      if (!fill && !stroke && !it.grad) return;
      const x = it.x / T, y = it.y / T, w = it.w / T, h = it.h / T;
      const isLine = st.geom === 'line' || st.geom.startsWith('straightConnector');
      const xf = { flipH: !!st.flipH, flipV: !!st.flipV, rot: st.rot ?? 0 };
      // linha: pontos do VML ou diagonal do quadro; a:custGeom: caminhos do arquivo
      // (cada um preenchido à parte, par-ímpar); demais: geometria predefinida
      // (ajustes, espelho e rotação) — oráculos de formas e cust
      type Part = { cmds: PathCmd[]; fill: boolean; stroke: boolean; evenOdd: boolean };
      let parts: Part[];
      if (isLine) {
        let cmds = linePath(x, y, w, h, it.line, !!st.flipH, !!st.flipV);
        if (st.rot) cmds = rotatePath(cmds, x + w / 2, y + h / 2, st.rot);
        parts = [{ cmds, fill: false, stroke: true, evenOdd: false }];
      } else if (st.geom === 'custom' && st.cust) {
        parts = custPaths(st.cust, x, y, w, h, xf).map((p) => ({ cmds: p.cmds as PathCmd[], fill: p.fill, stroke: p.stroke, evenOdd: true }));
      } else {
        parts = [{ cmds: presetPath(st.geom, x, y, w, h, { ...(st.adj ? { adj: st.adj } : {}), ...xf }) as PathCmd[], fill: !OPEN_PRESETS.has(st.geom), stroke: true, evenOdd: false }];
      }
      // sombra externa: cópia deslocada na cor da sombra (sem desfoque); o contorno
      // também projeta sombra (oráculo shd-tri)
      if (it.shadow) {
        const dx = it.shadow.dx / T, dy = it.shadow.dy / T;
        const col = hexColor(it.shadow.color);
        for (const p of parts) {
          if (!p.fill && !stroke) continue;
          const sc = p.cmds.map((c) => c.op === 'Z' ? c : c.op === 'C'
            ? { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x2: c.x2 + dx, y2: c.y2 + dy, x: c.x + dx, y: c.y + dy }
            : { ...c, x: c.x + dx, y: c.y + dy });
          page.withAlpha(it.shadow.alpha, it.shadow.alpha, () => page.path(sc, p.fill && (fill || it.grad) ? col : undefined, p.stroke && stroke ? { ...stroke, color: col } : undefined, p.evenOdd));
        }
      }
      if (it.grad) {
        const pb = pathBounds(parts.flatMap((p) => p.cmds) as PathCmdTw[]);
        const g = gradientGeometry(it.grad, { x, y, w, h, rot: st.rot ?? 0 }, pb);
        const sh = shade(g, gradientSamples(it.grad.stops, it.grad.path ? 256 : 512));
        for (const p of parts) if (p.fill) page.withAlpha(st.fillAlpha, undefined, () => page.fillShaded(p.cmds, sh, p.evenOdd));
        if (stroke) for (const p of parts) if (p.stroke) page.withAlpha(undefined, st.line?.alpha, () => page.path(p.cmds, undefined, stroke));
        return;
      }
      // transparência do preenchimento/contorno (a:alpha, v:fill opacity)
      for (const p of parts) page.withAlpha(st.fillAlpha, st.line?.alpha, () => page.path(p.cmds, p.fill ? fill : undefined, p.stroke ? stroke : undefined, p.evenOdd));
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

/** Linha (geom line/straightConnector): pontos do VML ou diagonal do quadro com espelho. */
function linePath(x: number, y: number, w: number, h: number, line?: { x1: number; y1: number; x2: number; y2: number }, flipH = false, flipV = false): PathCmd[] {
  if (line) return [{ op: 'M', x: x + line.x1 / T, y: y + line.y1 / T }, { op: 'L', x: x + line.x2 / T, y: y + line.y2 / T }];
  const [x1, x2] = flipH ? [x + w, x] : [x, x + w];
  const [y1, y2] = flipV ? [y + h, y] : [y, y + h];
  return [{ op: 'M', x: x1, y: y1 }, { op: 'L', x: x2, y: y2 }];
}

/**
 * Efeito de preenchimento da página no PDF como o Word grava (page-fill.ts):
 * ladrilhos de "pixel de dispositivo" de 0,12 pt (gradiente, imagem) ou 1 pt
 * (padrão), textura no tamanho natural, ancorados no canto superior esquerdo.
 * Imagem do ladrilho do gradiente a 96 ppp do tamanho no PDF (o Word grava 164×123
 * para 1024×768 px).
 */
function paintFillPdf(
  page: PdfPage, lp: LayoutPage, f: PageFillPaint,
  bgImage: (key: string, make: () => { rgba: Uint8Array; w: number; h: number }) => PdfImage,
  imageFor: (img: InlineImage) => PdfImage | null,
): void {
  const tile = pageFillTileTw(f, 2.4, 20, true);
  if (!tile) return;
  let img: PdfImage | null = null;
  let tw = tile.w / T, th = tile.h / T;
  if (f.type === 'gradient' || f.type === 'gradientRadial') {
    const pw = Math.max(2, Math.round((tw * 96) / 72)), ph = Math.max(2, Math.round((th * 96) / 72));
    img = bgImage(`g|${JSON.stringify([f.type, f.c1, f.c2, f.stops, f.angle, f.focus, f.focusPosition, f.gradientCenter])}|${pw}x${ph}`,
      () => ({ rgba: gradientTileRgba(f, pw, ph, true), w: pw, h: ph }));
  } else if (f.type === 'pattern') {
    // 8 repetições em cada direção por imagem (menos desenhos na página)
    const base = patternRgba(f);
    img = bgImage(`p|${f.c1}|${f.c2}|${f.pattern?.join(',')}`, () => {
      const rgba = new Uint8Array(64 * 64 * 4);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) rgba.set(base.subarray(((y % 8) * 8 + (x % 8)) * 4, ((y % 8) * 8 + (x % 8)) * 4 + 4), (y * 64 + x) * 4);
      return { rgba, w: 64, h: 64 };
    });
    tw *= 8; th *= 8;
  } else if (f.image) img = imageFor(f.image);
  if (!img || tw <= 0 || th <= 0) return;
  const W = lp.widthTw / T, H = lp.heightTw / T;
  page.pushClipRect(0, 0, W, H);
  for (let y = 0; y < H; y += th) for (let x = 0; x < W; x += tw) page.drawImage(img, x, y, tw, th);
  page.popClip();
}
