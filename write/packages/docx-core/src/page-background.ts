/**
 * Cor da Página (w:document/w:background): leitura dos efeitos de preenchimento
 * (v:background/v:fill — gradiente, padrão, imagem, textura) e gravação no
 * MESMO formato que o Word grava (oráculo write/tools/page-lab, page-oracle2):
 *
 *  - cor sólida: `<w:background w:color="FFFF00"/>` (+ themeColor/Tint/Shade);
 *  - efeito: `<w:background w:color=…><v:background id="_x0000_s1025"
 *    o:bwmode="white" fillcolor=… [o:targetscreensize="1024,768"]><v:fill …/>
 *    </v:background></w:background>` — gradiente e imagem levam a tela-alvo;
 *    padrão e textura não; imagem e textura não levam fillcolor e o w:color é
 *    branco;
 *  - "Sem Cor": sem w:background.
 *
 * Mostrar o plano de fundo na tela é a configuração w:displayBackgroundShape
 * (settings-xml.ts); o PDF do Word leva o fundo sempre.
 */
import { firstChild, type XmlElement } from './xml.js';
import { vmlColor } from './drawing.js';
import { partByRelType } from './ooxml/parts.js';
import type { DocxPackage } from './package.js';

/** Efeito de preenchimento (v:fill do v:background). */
export interface PageFill {
  type: 'gradient' | 'gradientRadial' | 'pattern' | 'frame' | 'tile';
  /** cor 1 (fillcolor do v:background), RRGGBB */
  color?: string;
  /** cor 2 crua do VML ("blue", "#0080ff", "fill darken(128)"…) */
  color2?: string;
  /** graus do VML (0 = horizontal; −90 vertical; −135/−45 diagonais) */
  angle?: number;
  /** foco em % (100, 50, 0, −50) */
  focus?: number;
  /** foco do radial: (x, y) em 0..1 */
  focusPosition?: [number, number];
  /** radial "do canto" (o:fill type="gradientCenter") */
  gradientCenter?: boolean;
  /** paradas (gradiente predefinido: colors="0 #000082;19661f #66008f…"), pos 0..1 */
  colors?: { pos: number; color: string }[];
  /** "linear sigma" (1 cor), "none" (predefinido)… */
  method?: string;
  /** o:title (nome do padrão ou do arquivo da imagem) */
  title?: string;
  /** imagem (padrão: GIF 8×8; imagem/textura: o arquivo) */
  image?: { data: Uint8Array; ext: string };
  /** o:targetscreensize="1024,768" presente */
  targetScreen?: boolean;
}

export interface PageBackground {
  color?: string;
  themeColor?: string;
  themeTint?: string;
  themeShade?: string;
  fill?: PageFill;
}

const pct = (v: string | undefined): number | undefined => {
  if (v === undefined || v === '') return undefined;
  const s = v.trim();
  if (s.endsWith('%')) return parseFloat(s);
  if (s.endsWith('f')) return (parseInt(s, 10) / 65536) * 100;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n * 100 : undefined;
};
const frac = (v: string): number => (v.endsWith('f') ? parseInt(v, 10) / 65536 : parseFloat(v));

/** w:background lido (com o efeito VML e a imagem dele resolvida pelo r:id). */
export function readPageBackground(bg: XmlElement, resolveImage: (rid: string) => { data: Uint8Array; ext: string } | undefined): PageBackground | undefined {
  const out: PageBackground = {};
  for (const k of ['color', 'themeColor', 'themeTint', 'themeShade'] as const) {
    const v = bg.attrs[`w:${k}`];
    if (v) out[k] = v;
  }
  const vbg = firstChild(bg, 'v:background');
  const vf = vbg && firstChild(vbg, 'v:fill');
  const type = vf?.attrs['type'];
  if (vbg && vf && (type === 'gradient' || type === 'gradientRadial' || type === 'pattern' || type === 'frame' || type === 'tile')) {
    const f: PageFill = { type };
    const c1 = vmlColor(vbg.attrs['fillcolor']);
    if (c1) f.color = c1;
    if (vf.attrs['color2']) f.color2 = vf.attrs['color2'];
    if (vf.attrs['angle']) f.angle = parseFloat(vf.attrs['angle']);
    const fo = pct(vf.attrs['focus']);
    if (fo !== undefined) f.focus = fo;
    const fp = vf.attrs['focusposition'];
    if (fp !== undefined && fp !== '') {
      const [x = '', y = ''] = fp.split(',');
      f.focusPosition = [x.trim() ? frac(x.trim()) : 0, y.trim() ? frac(y.trim()) : 0];
    }
    if (firstChild(vf, 'o:fill')?.attrs['type'] === 'gradientCenter') f.gradientCenter = true;
    const colors = vf.attrs['colors'];
    if (colors) {
      const stops = colors.split(';').map((s) => s.trim().split(/\s+/)).filter((p) => p.length >= 2)
        .map(([pos, col]) => ({ pos: frac(pos!), color: vmlColor(col) ?? '000000' }));
      if (stops.length) f.colors = stops;
    }
    if (vf.attrs['method']) f.method = vf.attrs['method'];
    if (vf.attrs['o:title'] !== undefined) f.title = vf.attrs['o:title'];
    const rid = vf.attrs['r:id'];
    const img = rid ? resolveImage(rid) : undefined;
    if (img) f.image = img;
    if (vbg.attrs['o:targetscreensize']) f.targetScreen = true;
    out.fill = f;
  }
  return Object.keys(out).length ? out : undefined;
}

// ───────────────────────── gravação ─────────────────────────

const NAMED: Record<string, string> = {
  '000000': 'black', 'FFFFFF': 'white', 'FF0000': 'red', '008000': 'green', '0000FF': 'blue', 'FFFF00': 'yellow',
  '808080': 'gray', 'C0C0C0': 'silver', '000080': 'navy', '800000': 'maroon', '008080': 'teal', '808000': 'olive',
  '800080': 'purple', 'FF00FF': 'fuchsia', '00FFFF': 'aqua', '00FF00': 'lime',
};

/** RRGGBB → cor VML como o Word grava: nome das 16 básicas, "#rgb" quando dá, senão "#rrggbb". */
export function vmlColorAttr(hex: string): string {
  const h = hex.replace(/^#/, '').toUpperCase();
  const name = NAMED[h];
  if (name) return name;
  const l = h.toLowerCase();
  return l[0] === l[1] && l[2] === l[3] && l[4] === l[5] ? `#${l[0]}${l[2]}${l[4]}` : `#${l}`;
}

const escAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Número como o VML grava em % (focus="100%", "-50%"). */
const pctAttr = (v: number): string => `${Math.round(v * 100) / 100}%`;
/** Fração do VML (".5", "1", "19661f"…). */
const fracAttr = (v: number): string => (v === 0 ? '0' : v === 1 ? '1' : String(Math.round(v * 1000) / 1000).replace(/^0\./, '.'));

/** XML do w:background (rid = relação da imagem do efeito, quando há). */
export function pageBackgroundXml(bg: PageBackground, rid?: string): string {
  const f = bg.fill;
  const image = f && (f.type === 'frame' || f.type === 'tile');
  const color = image ? 'FFFFFF' : (bg.color ?? f?.color ?? 'FFFFFF');
  const attrs = `w:color="${color.toUpperCase()}"`
    + (bg.themeColor && !f ? ` w:themeColor="${bg.themeColor}"` : '')
    + (bg.themeTint && !f ? ` w:themeTint="${bg.themeTint}"` : '')
    + (bg.themeShade && !f ? ` w:themeShade="${bg.themeShade}"` : '');
  if (!f) return `<w:background ${attrs}/>`;
  const vbg = '<v:background id="_x0000_s1025" o:bwmode="white"'
    + (!image && f.color ? ` fillcolor="${vmlColorAttr(f.color)}"` : '')
    + (f.type === 'gradient' || f.type === 'gradientRadial' || f.type === 'frame' ? ' o:targetscreensize="1024,768"' : '')
    + '>';
  let fill = '<v:fill';
  if (rid) fill += ` r:id="${rid}"`;
  if (f.title !== undefined && (f.type === 'pattern' || image)) fill += ` o:title="${escAttr(f.title)}"`;
  if (f.color2 !== undefined) fill += ` color2="${escAttr(f.color2)}"`;
  if (f.colors?.length) fill += ` colors="${f.colors.map((s) => `${s.pos === 0 ? '0' : s.pos === 1 ? '1' : `${Math.round(s.pos * 65536)}f`} ${vmlColorAttr(s.color)}`).join(';')}"`;
  // ordem do Word: color2, colors, angle, method, focusposition, focussize, focus, type
  if (f.angle) fill += ` angle="${Math.round(f.angle)}"`;
  if (f.method) fill += ` method="${escAttr(f.method)}"`;
  if (f.focusPosition) {
    const [x, y] = f.focusPosition;
    fill += ` focusposition="${x ? fracAttr(x) : ''}${y ? `,${fracAttr(y)}` : ''}" focussize=""`;
  }
  if (f.focus) fill += ` focus="${pctAttr(f.focus)}"`;
  fill += ` type="${f.type}"`;
  fill += f.gradientCenter ? '><o:fill v:ext="view" type="gradientCenter"/></v:fill>' : '/>';
  return `<w:background ${attrs}>${vbg}${fill}</v:background></w:background>`;
}

const NS: [string, string][] = [
  ['v', 'urn:schemas-microsoft-com:vml'],
  ['o', 'urn:schemas-microsoft-com:office:office'],
  ['r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'],
];

const MIME: Record<string, string> = {
  png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp',
  tif: 'image/tiff', tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf',
};

/**
 * Grava (ou tira, com null) o w:background no document.xml já serializado: troca
 * o elemento, põe as declarações de namespace que faltam, grava a imagem do efeito
 * (word/media + relação + tipo de conteúdo) e tira a relação da imagem anterior
 * que ficou sem uso.
 */
export function writePageBackground(pkg: DocxPackage, bg: PageBackground | null): void {
  const path = partByRelType(pkg, 'officeDocument', 'word/document.xml');
  let xml = pkg.getPartText(path);
  if (!xml) return;
  const relsPath = path.replace(/([^/]+)$/, '_rels/$1.rels');
  let rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  // elemento anterior (e a imagem dele)
  const old = /<w:background\b[^>]*?(?:\/>|>[\s\S]*?<\/w:background>)/.exec(xml);
  const oldRid = old ? /\br:id="([^"]+)"/.exec(old[0])?.[1] : undefined;
  if (old) xml = xml.slice(0, old.index) + xml.slice(old.index + old[0].length);
  let rid: string | undefined;
  const img = bg?.fill?.image;
  if (img) {
    const ext = img.ext.toLowerCase() === 'jpg' ? 'jpeg' : img.ext.toLowerCase();
    let n = 1;
    while (pkg.getPart(`word/media/image${n}.${ext}`)) n++;
    const target = `media/image${n}.${ext}`;
    pkg.setPart(`word/${target}`, img.data);
    let k = 1;
    while (new RegExp(`Id="rId${k}"`).test(rels)) k++;
    rid = `rId${k}`;
    rels = rels.replace('</Relationships>', `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/></Relationships>`);
    let ct = pkg.getPartText('[Content_Types].xml') ?? '';
    if (ct && !new RegExp(`<Default Extension="${ext}"`, 'i').test(ct)) {
      ct = ct.replace(/(<Types\b[^>]*>)/, `$1<Default Extension="${ext}" ContentType="${MIME[ext] ?? `image/${ext}`}"/>`);
      pkg.setPartText('[Content_Types].xml', ct);
    }
  }
  if (bg) {
    const el = pageBackgroundXml(bg, rid);
    const m = /<w:document\b[^>]*>/.exec(xml);
    if (m) {
      let tag = m[0];
      if (bg.fill) for (const [p, uri] of NS) if (!new RegExp(`\\sxmlns:${p}=`).test(tag)) tag = tag.replace(/>$/, ` xmlns:${p}="${uri}">`);
      xml = xml.slice(0, m.index) + tag + el + xml.slice(m.index + m[0].length);
    }
  }
  // relação da imagem anterior que ninguém mais usa
  if (oldRid && !new RegExp(`"${oldRid}"`).test(xml)) {
    const rel = new RegExp(`<Relationship\\b[^>]*\\bId="${oldRid}"[^>]*/>`).exec(rels);
    if (rel) rels = rels.slice(0, rel.index) + rels.slice(rel.index + rel[0].length);
  }
  pkg.setPartText(path, xml);
  if (img || oldRid) pkg.setPartText(relsPath, rels);
}

// ───────────────────────── padrões e cores ─────────────────────────

/**
 * Os 48 padrões do Preenchimento › Padrão, na ordem do Word (Fill.Patterned 1..48),
 * com o preset DrawingML do mesmo bitmap (@universal-office/drawingml) e o o:title
 * que o Word pt-BR grava (com o espaço inicial dele). Oráculo page-oracle8.
 */
export const WORD_PATTERNS: readonly { prst: string; title: { pt: string; en: string } }[] = [
  { prst: 'pct5', title: { pt: ' 5%', en: '5%' } },
  { prst: 'pct10', title: { pt: ' 10%', en: '10%' } },
  { prst: 'pct20', title: { pt: ' 20%', en: '20%' } },
  { prst: 'pct25', title: { pt: ' 25%', en: '25%' } },
  { prst: 'pct30', title: { pt: ' 30%', en: '30%' } },
  { prst: 'pct40', title: { pt: ' 40%', en: '40%' } },
  { prst: 'pct50', title: { pt: ' 50%', en: '50%' } },
  { prst: 'pct60', title: { pt: ' 60%', en: '60%' } },
  { prst: 'pct70', title: { pt: ' 70%', en: '70%' } },
  { prst: 'pct75', title: { pt: ' 75%', en: '75%' } },
  { prst: 'pct80', title: { pt: ' 80%', en: '80%' } },
  { prst: 'pct90', title: { pt: ' 90%', en: '90%' } },
  { prst: 'dkHorz', title: { pt: ' Escuras', en: 'Dark horizontal' } },
  { prst: 'dkVert', title: { pt: ' escura', en: 'Dark vertical' } },
  { prst: 'dkDnDiag', title: { pt: ' Escuras para baixo', en: 'Dark downward diagonal' } },
  { prst: 'dkUpDiag', title: { pt: ' Escuras para cima', en: 'Dark upward diagonal' } },
  { prst: 'smCheck', title: { pt: 'Quadriculado pequeno', en: 'Small checker board' } },
  { prst: 'trellis', title: { pt: 'Treliça', en: 'Trellis' } },
  { prst: 'ltHorz', title: { pt: ' Claras', en: 'Light horizontal' } },
  { prst: 'ltVert', title: { pt: ' clara', en: 'Light vertical' } },
  { prst: 'ltDnDiag', title: { pt: ' Claras para baixo', en: 'Light downward diagonal' } },
  { prst: 'ltUpDiag', title: { pt: ' Claras para cima', en: 'Light upward diagonal' } },
  { prst: 'smGrid', title: { pt: 'Grade fechada', en: 'Small grid' } },
  { prst: 'dotDmnd', title: { pt: 'Losango pontilhado', en: 'Dotted diamond' } },
  { prst: 'wdDnDiag', title: { pt: ' Largas para baixo', en: 'Wide downward diagonal' } },
  { prst: 'wdUpDiag', title: { pt: ' Largas para cima', en: 'Wide upward diagonal' } },
  { prst: 'dashUpDiag', title: { pt: ' Barras', en: 'Dashed upward diagonal' } },
  { prst: 'dashDnDiag', title: { pt: ' Barras invertidas', en: 'Dashed downward diagonal' } },
  { prst: 'narVert', title: { pt: ' estreita', en: 'Narrow vertical' } },
  { prst: 'narHorz', title: { pt: ' Estreitas', en: 'Narrow horizontal' } },
  { prst: 'dashVert', title: { pt: ' alternando linhas verticais', en: 'Dashed vertical' } },
  { prst: 'dashHorz', title: { pt: ' alternando linhas horizontais', en: 'Dashed horizontal' } },
  { prst: 'lgConfetti', title: { pt: 'Confetes grandes', en: 'Large confetti' } },
  { prst: 'lgGrid', title: { pt: 'Grade aberta', en: 'Large grid' } },
  { prst: 'horzBrick', title: { pt: 'Tijolo na horizontal', en: 'Horizontal brick' } },
  { prst: 'lgCheck', title: { pt: 'Quadriculado grande', en: 'Large checker board' } },
  { prst: 'smConfetti', title: { pt: 'Confetes pequenos', en: 'Small confetti' } },
  { prst: 'zigZag', title: { pt: 'Ziguezague', en: 'Zig zag' } },
  { prst: 'solidDmnd', title: { pt: 'Losango sólido', en: 'Solid diamond' } },
  { prst: 'diagBrick', title: { pt: 'Tijolo na diagonal', en: 'Diagonal brick' } },
  { prst: 'openDmnd', title: { pt: 'Contorno de losango', en: 'Outlined diamond' } },
  { prst: 'plaid', title: { pt: 'Xadrez', en: 'Plaid' } },
  { prst: 'sphere', title: { pt: 'Esfera', en: 'Sphere' } },
  { prst: 'weave', title: { pt: 'Trança', en: 'Weave' } },
  { prst: 'dotGrid', title: { pt: 'Grade pontilhada', en: 'Dotted grid' } },
  { prst: 'divot', title: { pt: 'Malha', en: 'Divot' } },
  { prst: 'shingle', title: { pt: 'Telhas', en: 'Shingle' } },
  { prst: 'wave', title: { pt: 'Ondulado', en: 'Wave' } },
];

/**
 * GIF do padrão como o Word grava (GIF87a 8×8, paleta local [branco, preto] e
 * o comentário "Software: Microsoft Office"): pixel BRANCO = cor de frente
 * (fillcolor), preto = fundo (color2) — os bits do preset invertidos.
 * `rows` = as 8 linhas do preset (bit 7 = coluna 0, 1 = frente).
 */
export function patternGif(rows: readonly number[]): Uint8Array {
  const idx: number[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) idx.push(((rows[y] ?? 0) >> (7 - x)) & 1 ? 0 : 1);
  const comment = 'Software: Microsoft Office';
  const head = [
    ...'GIF87a'.split('').map((c) => c.charCodeAt(0)), 8, 0, 8, 0, 0x77, 1, 0,
    0x21, 0xfe, comment.length, ...comment.split('').map((c) => c.charCodeAt(0)), 0,
    0x2c, 0, 0, 0, 0, 8, 0, 8, 0, 0x80, 0xff, 0xff, 0xff, 0, 0, 0,
  ];
  const lzw = lzwEncode(idx, 2);
  const body: number[] = [2];
  for (let i = 0; i < lzw.length; i += 255) { const blk = lzw.slice(i, i + 255); body.push(blk.length, ...blk); }
  body.push(0, 0x3b);
  return Uint8Array.from([...head, ...body]);
}

/** LZW do GIF (códigos de largura variável, LSB primeiro). */
function lzwEncode(data: number[], minCode: number): number[] {
  const clear = 1 << minCode, eoi = clear + 1;
  const out: number[] = [];
  let cur = 0, bits = 0;
  let size = minCode + 1;
  const emit = (code: number): void => {
    cur |= code << bits; bits += size;
    while (bits >= 8) { out.push(cur & 0xff); cur >>= 8; bits -= 8; }
  };
  let dict = new Map<string, number>();
  let next = eoi + 1;
  const reset = (): void => { dict = new Map(); next = eoi + 1; size = minCode + 1; };
  emit(clear);
  reset();
  let w = String(data[0]);
  for (let i = 1; i < data.length; i++) {
    const k = String(data[i]);
    const wk = `${w},${k}`;
    if (dict.has(wk)) { w = wk; continue; }
    emit(w.includes(',') ? dict.get(w)! : Number(w));
    dict.set(wk, next++);
    if (next > (1 << size) && size < 12) size++;
    if (next >= 4095) { emit(clear); reset(); }
    w = k;
  }
  emit(w.includes(',') ? dict.get(w)! : Number(w));
  emit(eoi);
  if (bits > 0) out.push(cur & 0xff);
  return out;
}

/**
 * Cor 2 do gradiente de UMA cor (Efeitos de Preenchimento › Uma cor › Escuro/Claro):
 * grau 0..1 → "fill darken(n)" / "fill" / "fill lighten(n)" (oráculo tl-one-*).
 */
export function oneColorGradientColor2(degree: number): string {
  const d = Math.max(0, Math.min(1, degree));
  if (Math.abs(d - 0.5) < 1e-6) return 'fill';
  return d < 0.5 ? `fill darken(${Math.round(510 * d)})` : `fill lighten(${Math.round(510 * (1 - d))})`;
}

/** Cor 2 do VML resolvida contra a cor 1 ("fill darken(n)", "fill lighten(n)", "fill", cor). */
export function resolveColor2(color2: string | undefined, color1: string): string {
  if (!color2) return 'FFFFFF';
  const m = /^\s*fill(?:\s+(darken|lighten)\((\d+)\))?\s*$/i.exec(color2);
  if (!m) return vmlColor(color2) ?? 'FFFFFF';
  if (!m[1]) return color1;
  // truncado como o Word: darken = ⌊c·n/255⌋, lighten = 255 − ⌊(255−c)·n/255⌋ (tl-one-*)
  const n = Math.max(0, Math.min(255, parseInt(m[2]!, 10)));
  const c = [0, 2, 4].map((i) => parseInt(color1.slice(i, i + 2), 16));
  const r = m[1].toLowerCase() === 'darken' ? c.map((v) => Math.floor((v * n) / 255)) : c.map((v) => 255 - Math.floor(((255 - v) * n) / 255));
  return r.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
