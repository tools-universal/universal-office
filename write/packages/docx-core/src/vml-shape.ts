/**
 * Caixa de texto só em VML (documento do Word 2007 ou anterior, modo de compatibilidade
 * ≤ 12, ou gravada assim por outro programa): o w:drawing wps EQUIVALENTE — o editor a
 * formata pelo mesmo caminho das caixas wps (Formato da Forma) e a gravação a devolve
 * só em VML (o Word mantém a forma legada em VML; oráculo textbox-lab c12-*).
 * Cobre o que a caixa VML declara: posição/âncora, tamanho, ordem z, quebra, giro e
 * espelho, preenchimento (cor, transparência, degradê de duas cores), contorno (cor,
 * espessura, tracejado), margens, alinhamento vertical, direção, ajuste ao texto, nome,
 * texto alt e oculta.
 */
import type { XmlElement } from './xml.js';
import { childElements, firstChild } from './xml.js';
import { parseVmlStyle, vmlLenTwips, vmlColor } from './drawing.js';
import { newTextboxDrawingXml, patchShape, type ShapeFill } from './shape-xml.js';
import type { DmlColor, PicLine } from './picture-xml.js';

const EMU_PER_TWIP = 635;
const emu = (v: string | undefined): number | undefined => { const t = vmlLenTwips(v); return t === undefined ? undefined : Math.round(t * EMU_PER_TWIP); };
const REL_H: Record<string, string> = { text: 'column', page: 'page', margin: 'margin', char: 'character', 'left-margin-area': 'leftMargin', 'right-margin-area': 'rightMargin', 'inner-margin-area': 'insideMargin', 'outer-margin-area': 'outsideMargin' };
const REL_V: Record<string, string> = { text: 'paragraph', page: 'page', margin: 'margin', line: 'line', 'top-margin-area': 'topMargin', 'bottom-margin-area': 'bottomMargin', 'inner-margin-area': 'insideMargin', 'outer-margin-area': 'outsideMargin' };
const FLOW: Record<string, string> = { 'vertical|bottom-to-top': 'vert270', 'vertical|top-to-bottom': 'mongolianVert', 'vertical|': 'vert', 'vertical-ideographic|': 'eaVert' };

/** Fração VML ("0.75", "49152f") → 0..1. */
const frac = (v: string | undefined): number | undefined => {
  if (!v) return undefined;
  const n = v.endsWith('f') ? parseInt(v, 10) / 65536 : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};
const rgb = (hex: string, alpha?: number): DmlColor => ({ kind: 'srgbClr', val: hex, ...(alpha !== undefined && alpha < 0.999 ? { mods: [['alpha', Math.round(alpha * 100000)] as [string, number]] } : {}) });

/**
 * O w:drawing wps de uma caixa de texto VML ancorada (v:shape/v:rect/v:roundrect/v:oval
 * com v:textbox). `id`: o id de desenho (docPr) — o nome fica o do VML quando ele não é
 * o interno (_x0000_s…). undefined para o que não é caixa flutuante simples.
 */
export function vmlTextboxToDrawing(el: XmlElement, id: number, lang: 'pt' | 'en' | 'es' = 'pt'): string | undefined {
  const a = el.attrs;
  const st = parseVmlStyle(a['style']);
  if (st['position'] !== 'absolute') return undefined;
  const txb = firstChild(el, 'v:textbox');
  if (!txb) return undefined;
  const cx = emu(st['width']) ?? 0, cy = emu(st['height']) ?? 0;
  if (!(cx > 0) || !(cy > 0)) return undefined;
  // posição
  const pos = (axis: 'h' | 'v'): { relativeFrom: string; offset?: number; align?: string } => {
    const rel = st[`mso-position-${axis === 'h' ? 'horizontal' : 'vertical'}-relative`] ?? 'text';
    const relativeFrom = (axis === 'h' ? REL_H : REL_V)[rel] ?? (axis === 'h' ? 'column' : 'paragraph');
    const al = st[`mso-position-${axis === 'h' ? 'horizontal' : 'vertical'}`];
    if (al && al !== 'absolute') return { relativeFrom, align: al };
    const off = (emu(st[axis === 'h' ? 'margin-left' : 'margin-top']) ?? 0) + (emu(st[axis === 'h' ? 'left' : 'top']) ?? 0);
    return { relativeFrom, offset: off };
  };
  const z = parseInt(st['z-index'] ?? '0', 10) || 0;
  const wrapEl = firstChild(el, 'w10:wrap');
  const wt = wrapEl?.attrs['type'];
  const dist = (k: string): number => emu(st[`mso-wrap-distance-${k}`]) ?? (k === 'left' || k === 'right' ? 114300 : 0);
  // preenchimento
  const fillEl = firstChild(el, 'v:fill');
  const filled = a['filled'] ?? fillEl?.attrs['on'];
  let fill: ShapeFill;
  if (filled === 'f' || filled === 'false') fill = { kind: 'none' };
  else {
    const c1 = vmlColor(fillEl?.attrs['color'] ?? a['fillcolor']) ?? 'FFFFFF';
    const op = frac(fillEl?.attrs['opacity']);
    if (fillEl?.attrs['type'] === 'gradient' || fillEl?.attrs['type'] === 'gradientRadial') {
      const c2 = vmlColor(fillEl.attrs['color2']) ?? 'FFFFFF';
      const ang = parseFloat(fillEl.attrs['angle'] ?? '0') || 0;
      fill = { kind: 'gradient', stops: [{ pos: 0, color: rgb(c1, op) }, { pos: 100000, color: rgb(c2, op) }], lin: { ang: Math.round((((90 - ang) % 360 + 360) % 360) * 60000), scaled: true }, rotWithShape: true };
    } else fill = { kind: 'solid', color: rgb(c1, op) };
  }
  // contorno
  const strokeEl = firstChild(el, 'v:stroke');
  const stroked = a['stroked'] ?? strokeEl?.attrs['on'];
  const sw = a['strokeweight'] ?? strokeEl?.attrs['weight'];
  const w = sw ? emu(/[a-z]$/.test(sw) ? sw : `${sw}pt`) ?? 9525 : 9525;
  let line: PicLine | null;
  if (stroked === 'f' || stroked === 'false') line = null;
  else {
    line = { w, fill: rgb(vmlColor(strokeEl?.attrs['color'] ?? a['strokecolor']) ?? '000000') };
    const d = strokeEl?.attrs['dashstyle'];
    if (d && d !== 'solid') line.dash = d;
    const ls = strokeEl?.attrs['linestyle'];
    if (ls && ls !== 'single') line.cmpd = ({ thinThin: 'dbl', thinThick: 'thinThick', thickThin: 'thickThin', thickBetweenThin: 'tri' } as Record<string, PicLine['cmpd']>)[ls];
  }
  // texto
  const ts = parseVmlStyle(txb.attrs['style']);
  const ins = (txb.attrs['inset'] ?? '').split(',');
  const inset = (i: number, d: number): number => { const v = ins[i]?.trim(); return v ? emu(v) ?? d : d; };
  const va = st['v-text-anchor'] ?? '';
  const vert = ts['layout-flow'] ? FLOW[`${ts['layout-flow']}|${ts['mso-layout-flow-alt'] ?? ''}`] ?? FLOW[`${ts['layout-flow']}|`] : undefined;
  const geom = el.name === 'v:roundrect' ? { prst: 'roundRect', adj: { adj: Math.round((frac(a['arcsize']) ?? 0.1667) * 100000) } } : el.name === 'v:oval' ? { prst: 'ellipse' } : { prst: 'rect' };
  const vmlName = a['id'] && !/^_x0000_/.test(a['id']) ? a['id'] : undefined;
  let xml = newTextboxDrawingXml({
    id, name: vmlName ?? `${lang === 'pt' ? 'Caixa de Texto' : lang === 'es' ? 'Cuadro de texto' : 'Text Box'} ${id}`, cx, cy,
    posH: pos('h'), posV: pos('v'),
    relativeHeight: Math.abs(z), behindDoc: z < 0,
    wrap: wt === 'square' ? 'square' : wt === 'topAndBottom' ? 'topAndBottom' : 'none',
    dist: { t: dist('top'), b: dist('bottom'), l: dist('left'), r: dist('right') },
    fill, line, geom,
    body: {
      lIns: inset(0, 91440), tIns: inset(1, 45720), rIns: inset(2, 91440), bIns: inset(3, 45720),
      anchor: va.startsWith('middle') ? 'ctr' : va.startsWith('bottom') ? 'b' : 't',
      ...(vert ? { vert } : {}),
      ...(st['mso-wrap-style'] === 'none' ? { wrap: 'none' as const } : {}),
      ...(ts['mso-fit-shape-to-text'] === 't' ? { autofit: 'shape' as const } : {}),
    },
    content: '<w:p/>',
  });
  // o que o modelo da caixa nova não leva: Justo/Através, giro/espelho, texto alt, oculta
  const rot = parseFloat(st['rotation'] ?? '0') || 0;
  const flip = st['flip'] ?? '';
  const alt = a['alt'];
  xml = patchShape(xml, {
    ...(wt === 'tight' || wt === 'through' ? { wrap: wt } : {}),
    ...(rot ? { rot: Math.round((((rot % 360) + 360) % 360) * 60000) } : {}),
    ...(flip.includes('x') ? { flipH: true } : {}), ...(flip.includes('y') ? { flipV: true } : {}),
    ...(alt ? { descr: alt } : {}),
    ...(a['o:title'] ? { title: a['o:title'] } : {}),
    ...(st['visibility'] === 'hidden' ? { hidden: true } : {}),
  });
  return xml;
}

/** O elemento de forma (o 1º filho de desenho) de um w:pict que tem UMA caixa de texto. */
export function vmlSingleTextbox(pict: XmlElement): XmlElement | undefined {
  const shapes = childElements(pict).filter((k) => k.name !== 'v:shapetype' && k.name.startsWith('v:'));
  return shapes.length === 1 && firstChild(shapes[0]!, 'v:textbox') ? shapes[0] : undefined;
}
