/**
 * Desenhos da planilha — imagens, formas, caixas de texto, conectores, grupos
 * e SmartArt de `xl/drawings/drawingN.xml`. NÃO é um segundo motor DrawingML:
 * leitura e pintura são as do Slides (`@universal/slides-core`, fidelidade
 * medida no PowerPoint). Aqui fica só a ponte com a grade:
 *   - âncora (twoCell/oneCell/absolute + offsets EMU) → retângulo em px;
 *   - forma lida no espaço do próprio `a:xfrm` → reposicionada na âncora;
 *   - tema do workbook → tema DrawingML (clrMap padrão: tx1=dk1, bg1=lt1…);
 *   - padrões de texto do Excel (sem master/defaultTextStyle);
 *   - cache de imagens decodificadas (PNG/JPEG/GIF/SVG pelo navegador,
 *     EMF/WMF/TIFF/PICT rasterizados pelo slides-core).
 * Gráficos (`c:chart`) seguem no motor de gráficos do sheet (padrões do Excel).
 */
import {
  PptxPackage, readTheme as readDmlTheme, readDrawingElements, applyShapeTextCascade, paintShapesTo,
  rasterizeSpecialImage, specialImageNeedsPrepare, prepareSpecialImage,
  type Shape, type Theme as DmlTheme, type ImageRef, type PaintImage, type TextStyleContext, type TextStyleLevel,
} from '@universal/slides-core';
import {
  firstChild, type XlsxPackage, type DrawingAnchor, type DrawingObject, type Theme as SheetTheme, type XmlElement,
} from '@universal/sheet-core';

/** EMU por px a 96 dpi (zoom 100%). */
export const EMU_PER_PX = 9525;

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * Retângulo da âncora em px (zoom aplicado, sem scroll): `edgeX(i)`/`edgeY(i)`
 * = borda esquerda/superior da coluna/linha 0-based `i`. O offset dentro da
 * célula não passa do tamanho dela (coluna oculta = 0).
 */
export function anchorRect(a: DrawingAnchor, edgeX: (i: number) => number, edgeY: (i: number) => number, zoom: number): Rect {
  const k = zoom / EMU_PER_PX;
  if (a.kind === 'absolute') {
    return { x: (a.pos?.x ?? 0) * k, y: (a.pos?.y ?? 0) * k, w: (a.ext?.cx ?? 0) * k, h: (a.ext?.cy ?? 0) * k };
  }
  const at = (edge: (i: number) => number, i: number, off: number): number => {
    const s = edge(i);
    return s + Math.min(Math.max(0, off) * k, Math.max(0, edge(i + 1) - s));
  };
  const x = at(edgeX, a.from.col, a.from.colOff);
  const y = at(edgeY, a.from.row, a.from.rowOff);
  if (a.kind === 'oneCell') return { x, y, w: (a.ext?.cx ?? 0) * k, h: (a.ext?.cy ?? 0) * k };
  return { x, y, w: at(edgeX, a.to.col, a.to.colOff) - x, h: at(edgeY, a.to.row, a.to.rowOff) - y };
}

/** Onde mora o `a:xfrm` do objeto: [elemento dono, nome do xfrm]. */
function xfrmHolder(el: XmlElement): [XmlElement | undefined, string] {
  if (el.name === 'xdr:grpSp') return [firstChild(el, 'xdr:grpSpPr'), 'a:xfrm'];
  if (el.name === 'xdr:graphicFrame') return [el, 'xdr:xfrm'];
  return [firstChild(el, 'xdr:spPr'), 'a:xfrm'];
}

const intAttr = (e: XmlElement | undefined, k: string): number => { const v = parseInt(e?.attrs[k] ?? '0', 10); return Number.isFinite(v) ? v : 0; };

/** Giro (1/60000°) do `a:xfrm` do próprio objeto. */
function topRot(el: XmlElement): number {
  const [holder, name] = xfrmHolder(el);
  return intAttr(holder ? firstChild(holder, name) : undefined, 'rot');
}

const rectEl = (name: string, a: string, b: string, x: number, y: number): XmlElement => ({ name, attrs: { [a]: String(Math.round(x)), [b]: String(Math.round(y)) }, children: [] });

/**
 * Cópia do objeto com o `a:xfrm` no retângulo `T` (EMU): a ÂNCORA manda na
 * posição/tamanho (o xfrm gravado pode divergir — medido). No grupo, o espaço
 * dos filhos (`chOff/chExt`, ausentes = o off/ext gravado) é levado ao novo
 * retângulo e o giro do grupo vale em volta do NOVO centro, como no Excel.
 */
export function placeElement(el: XmlElement, T: Rect): XmlElement {
  const [holder, name] = xfrmHolder(el);
  if (!holder) return el;
  const xf = firstChild(holder, name);
  const off = xf ? firstChild(xf, 'a:off') : undefined, ext = xf ? firstChild(xf, 'a:ext') : undefined;
  const kids: XmlElement[] = [rectEl('a:off', 'x', 'y', T.x, T.y), rectEl('a:ext', 'cx', 'cy', T.w, T.h)];
  if (el.name === 'xdr:grpSp') {
    kids.push(xf && firstChild(xf, 'a:chOff') || rectEl('a:chOff', 'x', 'y', intAttr(off, 'x'), intAttr(off, 'y')));
    kids.push(xf && firstChild(xf, 'a:chExt') || rectEl('a:chExt', 'cx', 'cy', intAttr(ext, 'cx'), intAttr(ext, 'cy')));
  }
  const newXf: XmlElement = { name, attrs: xf?.attrs ?? {}, children: kids };
  const newHolder: XmlElement = { ...holder, children: xf ? holder.children.map((c) => (c === xf ? newXf : c)) : [newXf, ...holder.children] };
  if (holder === el) return newHolder;
  return { ...el, children: el.children.map((c) => (c === holder ? newHolder : c)) };
}

/**
 * Giro entre 45° e 135° (ou 225°–315°): a âncora guarda a caixa da forma JÁ
 * girada — largura e altura trocadas em volta do mesmo centro (medido no
 * Excel: imagem a 240° com a âncora = caixa girada).
 */
export function swapsBox(rot: number): boolean {
  const deg = (((rot / 60000) % 360) + 360) % 360;
  return (deg >= 45 && deg < 135) || (deg >= 225 && deg < 315);
}

/** Tema do Office (2013–2022) quando o pacote não traz o seu. */
const OFFICE_FONTS = { major: 'Calibri Light', minor: 'Calibri' };

/**
 * Tema DrawingML do workbook: o do slides-core (cores, fontes, estilos de
 * preenchimento/linha/efeito do fmtScheme) com o clrMap padrão — numa
 * planilha não há master; tx1/bg1 são dk1/lt1. Slots ausentes vêm do tema do
 * sheet-core (que já cai na paleta Office).
 */
function drawingTheme(dml: PptxPackage, themePart: string, sheetTheme: SheetTheme | undefined): DmlTheme {
  const t = readDmlTheme(dml, themePart);
  const colors: Record<string, string> = { ...t.colors };
  for (const [k, v] of Object.entries(sheetTheme?.byName ?? {})) if (!colors[k]) colors[k] = v;
  for (const [alias, src] of [['tx1', 'dk1'], ['bg1', 'lt1'], ['tx2', 'dk2'], ['bg2', 'lt2']] as const) {
    if (!colors[alias] && colors[src]) colors[alias] = colors[src]!;
  }
  const scheme = t.scheme && Object.keys(t.scheme).length ? t.scheme : { ...colors };
  return { ...t, colors, scheme, fonts: t.fonts ?? sheetTheme?.fonts ?? OFFICE_FONTS };
}

/** Níveis 1..9 iguais. */
const levels = (lvl: TextStyleLevel): TextStyleLevel[] => Array.from({ length: 9 }, () => ({ ...lvl }));

/**
 * Padrão do texto de forma no Excel (não há `defaultTextStyle`/master): fonte
 * do tema (`+mn-lt`) a 11 pt.
 */
const EXCEL_TEXT: TextStyleContext = {
  defaultStyle: levels({ sz: 11, font: '+mn-lt' }),
  titleStyle: levels({}), bodyStyle: levels({}), otherStyle: levels({}),
  masterPh: new Map(), layoutPh: new Map(),
};

/** Tamanho da imagem inteira na planilha (px a 96 dpi): metarquivos rasterizam nessa escala. */
function picDisplaySize(sh: Shape): { w: number; h: number } | undefined {
  const x = sh.xfrm;
  if (!x || !(x.cx > 0) || !(x.cy > 0)) return undefined;
  const c = sh.srcRect;
  const fw = c ? Math.max(0.05, 1 - c.l - c.r) : 1, fh = c ? Math.max(0.05, 1 - c.t - c.b) : 1;
  return { w: x.cx / EMU_PER_PX / fw, h: x.cy / EMU_PER_PX / fh };
}

/**
 * Desenhos de UMA pasta de trabalho: lê os objetos sob demanda (uma vez),
 * decodifica as imagens e pinta. `onChange` = uma imagem ficou pronta (repintar).
 */
export class SheetDrawings {
  private readonly dml: PptxPackage;
  private readonly theme: DmlTheme;
  private readonly parsed = new WeakMap<DrawingObject, { key: string; shapes: Shape[] }>();
  private readonly images = new Map<string, { img: PaintImage; ready: boolean }>();
  private readonly pending = new Set<Promise<void>>();
  private readonly families = new Set<string>();

  constructor(pkg: XlsxPackage, themePart: string, sheetTheme: SheetTheme | undefined, private readonly onChange: () => void) {
    const parts = new Map<string, Uint8Array>();
    for (const p of pkg.partNames()) { const d = pkg.getPart(p); if (d) parts.set(p, d); }
    this.dml = PptxPackage.fromParts(parts);
    this.theme = drawingTheme(this.dml, themePart, sheetTheme);
  }

  /** Famílias de fonte pedidas pelo texto das formas já lidas. */
  typefaces(): string[] { return [...this.families]; }

  /** Lê os objetos ainda não lidos (no xfrm gravado): imagens começam a decodificar, fontes ficam conhecidas. */
  prepare(objs: readonly DrawingObject[]): void {
    for (const o of objs) if (!this.parsed.has(o)) this.shapesAt(o, undefined);
  }

  /**
   * Formas do objeto posicionadas no retângulo `T` (EMU da planilha a 100%;
   * undefined = no xfrm gravado). Relidas só quando o retângulo muda
   * (larguras de coluna/alturas de linha editadas).
   */
  private shapesAt(obj: DrawingObject, T: Rect | undefined): Shape[] {
    const key = T ? `${Math.round(T.x)},${Math.round(T.y)},${Math.round(T.w)},${Math.round(T.h)}` : '';
    const hit = this.parsed.get(obj);
    if (hit && hit.key === key) return hit.shapes;
    const shapes = readDrawingElements(this.dml, obj.part, [T ? placeElement(obj.el, T) : obj.el], this.theme)[0] ?? [];
    for (const s of shapes) this.finishShape(s);
    this.parsed.set(obj, { key, shapes });
    return shapes;
  }

  /** Padrões de texto do Excel + aquece as imagens de uma forma lida. */
  private finishShape(sh: Shape): void {
    if (sh.txBody) {
      applyShapeTextCascade(sh, EXCEL_TEXT, this.theme, []);
      // nenhuma camada definiu a cor: texto automático = tx1
      const tx1 = this.theme.colors['tx1'] ?? '#000000';
      for (const p of sh.txBody.paragraphs) {
        for (const r of p.runs) {
          if (r.color === undefined) r.color = tx1;
          if (r.font) this.families.add(r.font);
        }
        if (p.bulletImage) this.warm(p.bulletImage);
      }
      for (const p of sh.txBody.paragraphs) for (const r of p.runs) if (r.fillImage) this.warm(r.fillImage);
    }
    if (sh.image) this.warm(sh.image, picDisplaySize(sh));
    if (sh.fillImage) this.warm(sh.fillImage);
    for (const r of Object.values(sh.chartImages ?? {})) this.warm(r);
  }

  /**
   * Decodifica uma imagem (reentrante por parte). WMF/EMF/TIFF/PICT: o
   * navegador não decodifica — rasterizados num canvas pelo slides-core.
   */
  private warm(ref: ImageRef, display?: { w: number; h: number }): void {
    if (this.images.has(ref.part)) return;
    const mk = (w: number, h: number): HTMLCanvasElement => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    if (specialImageNeedsPrepare(ref.bytes)) {
      // EMF+ com PNG/JPEG embutido: decodifica antes (assíncrono) e só então rasteriza
      const entry = { img: mk(1, 1) as PaintImage, ready: false };
      this.images.set(ref.part, entry);
      this.track(prepareSpecialImage(ref.bytes).catch(() => undefined).then(() => {
        const c = rasterizeSpecialImage(ref.bytes, mk, display);
        if (c) entry.img = c;
        entry.ready = true;
      }));
      return;
    }
    const meta = rasterizeSpecialImage(ref.bytes, mk, display);
    if (meta) { this.images.set(ref.part, { img: meta, ready: true }); return; }
    const img = new Image();
    const entry = { img: img as PaintImage, ready: false };
    this.images.set(ref.part, entry);
    const url = URL.createObjectURL(new Blob([new Uint8Array(ref.bytes)], { type: ref.mime }));
    this.track(new Promise<void>((resolve) => {
      img.onload = () => { entry.ready = true; URL.revokeObjectURL(url); resolve(); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      img.src = url;
    }));
  }

  private track(p: Promise<void>): void {
    const t = p.then(() => { this.pending.delete(t); this.onChange(); });
    this.pending.add(t);
  }

  /** Resolve quando todas as imagens pedidas até agora decodificaram (ou falharam). */
  async settled(): Promise<void> {
    while (this.pending.size) await Promise.allSettled([...this.pending]);
  }

  /**
   * Pinta um objeto na âncora `r` (px com o zoom, coordenadas da grade SEM
   * scroll); (sx, sy) = scroll do quadrante. As formas ficam em EMU da
   * planilha a 100% — espessuras e fontes escalam só com o zoom.
   */
  paint(ctx: CanvasRenderingContext2D, obj: DrawingObject, r: Rect, sx: number, sy: number, zoom: number, fontStack: (family: string, bold?: boolean, italic?: boolean) => string): void {
    if (!(r.w >= 0 && r.h >= 0)) return;
    const k = zoom / EMU_PER_PX;
    let T = { x: r.x / k, y: r.y / k, w: r.w / k, h: r.h / k };
    const rot = topRot(obj.el);
    if (rot && swapsBox(rot)) T = { x: T.x + (T.w - T.h) / 2, y: T.y + (T.h - T.w) / 2, w: T.h, h: T.w };
    const shapes = this.shapesAt(obj, T);
    if (!shapes.length) return;
    const images = new Map<string, PaintImage>();
    for (const [part, e] of this.images) if (e.ready) images.set(part, e.img);
    paintShapesTo(ctx, shapes, { slideW: 0, slideH: 0, images }, k, { ox: -sx, oy: -sy, fontStack, clipOverflow: true });
  }
}
