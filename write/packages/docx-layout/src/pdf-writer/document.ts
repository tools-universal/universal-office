import { ByteBuilder, utf16beHex } from './bytes.js';
import { EmbeddedFont, type FontProgram } from './font.js';
import { PdfWriter } from './writer.js';

/** Cor RGB em componentes 0..1. */
export type PdfColor = readonly [number, number, number];

/**
 * Área clicável de uma página (anotação /Link), em pt com a origem no TOPO da
 * página. Alvo: `uri` (só http, https e mailto — o resto é descartado) ou um
 * destino interno (`pageIndex`, topo `destTopPt`).
 */
export interface PdfLink {
  xPt: number;
  yTopPt: number;
  wPt: number;
  hPt: number;
  uri?: string;
  pageIndex?: number;
  destTopPt?: number;
}

/** Marcador do painel de navegação (/Outlines): título, nível (1 = raiz), página e topo (pt). */
export interface PdfOutlineItem {
  title: string;
  level: number;
  pageIndex: number;
  topPt: number;
}

/** Endereço aceito no /URI: http(s) e mailto, com espaço/controle/não-ASCII em %XX; null se outro esquema. */
export function safePdfUri(uri: string | undefined): string | null {
  const u = uri?.trim();
  if (!u || !/^(https?:\/\/|mailto:)/i.test(u)) return null;
  let out = '';
  for (const b of new TextEncoder().encode(u)) {
    if (b <= 0x20 || b >= 0x7f || b === 0x22 || b === 0x3c || b === 0x3e) out += `%${b.toString(16).toUpperCase().padStart(2, '0')}`;
    else if (b === 0x28 || b === 0x29 || b === 0x5c) out += `\\${String.fromCharCode(b)}`;
    else out += String.fromCharCode(b);
  }
  return out;
}

export function rgb255(r: number, g: number, b: number): PdfColor {
  return [r / 255, g / 255, b / 255];
}

/** Aceita "RRGGBB" (com ou sem #). */
export function hexColor(hex: string): PdfColor {
  const h = hex.replace('#', '');
  return rgb255(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}

/** Um glifo já posicionado: gid (=CID), code point (p/ ToUnicode) e coords em pt. */
export interface PlacedGlyph {
  gid: number;
  codePoint: number;
  /** x absoluto na página, em pontos (origem no canto superior esquerdo). */
  xPt: number;
  /** y da baseline medido a partir do TOPO da página, em pontos. */
  baselineFromTopPt: number;
}

/** Comando de caminho (coordenadas em pt, y a partir do TOPO). */
export type PathCmd =
  | { op: 'M'; x: number; y: number }
  | { op: 'L'; x: number; y: number }
  | { op: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { op: 'Z' };

/** Imagem embutida (XObject) pronta para desenhar. */
export interface PdfImage {
  readonly resourceName: string;
  readonly objNum: number;
}

/** Degradê embutido (recurso /Shading) pronto para pintar dentro de um recorte. */
export interface PdfShading {
  readonly resourceName: string;
  readonly objNum: number;
}

/** Maior módulo escrito num número do PDF (evita a notação exponencial de String()). */
const MAX_REAL = 1e9;

export const fmt = (n: number): string => {
  // até 3 casas, sem zeros/“.0” supérfluos; nunca NaN/Infinity/expoente (inválidos no
  // PDF): NaN vira 0 e o módulo é limitado (±Infinity → ±MAX_REAL)
  if (Number.isNaN(n)) return '0';
  const r = Math.round(Math.max(-MAX_REAL, Math.min(MAX_REAL, n)) * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

/**
 * Página PDF. As coordenadas de entrada usam origem no canto SUPERIOR esquerdo
 * (y cresce para baixo, como no canvas/app de referência); a conversão para o sistema do PDF
 * (origem inferior esquerda) é feita aqui.
 */
export class PdfPage {
  /** @internal */ readonly content = new ByteBuilder();
  /** @internal áreas clicáveis (anotações /Link) */
  readonly links: PdfLink[] = [];

  /** Área clicável (link externo ou destino em outra página). Esquema fora de http/https/mailto é ignorado. */
  addLink(link: PdfLink): void {
    if (link.uri !== undefined ? safePdfUri(link.uri) === null : link.pageIndex === undefined) return;
    this.links.push(link);
  }

  constructor(
    readonly widthPt: number,
    readonly heightPt: number,
    /** @internal nome do ExtGState com a opacidade (preenchimento, traço) */
    private readonly gsFor?: (fillAlpha: number, strokeAlpha: number) => string,
  ) {}

  /**
   * Desenha com opacidade (0..1) de preenchimento/traço: envolve o desenho em
   * q /GSn gs … Q. Página avulsa (sem documento) ou opaco: desenha direto.
   */
  withAlpha(fillAlpha: number | undefined, strokeAlpha: number | undefined, draw: () => void): void {
    const fa = fillAlpha ?? 1, sa = strokeAlpha ?? 1;
    if (!this.gsFor || (fa >= 1 && sa >= 1)) { draw(); return; }
    this.content.str(`q\n/${this.gsFor(Math.max(0, fa), Math.max(0, sa))} gs\n`);
    draw();
    this.content.str('Q\n');
  }

  private fromTop(yTop: number): number {
    return this.heightPt - yTop;
  }

  /** Retângulo preenchido (sombreado, realce). yTopPt = topo do retângulo. */
  fillRect(xPt: number, yTopPt: number, wPt: number, hPt: number, color: PdfColor): void {
    const y = this.fromTop(yTopPt + hPt); // canto inferior em coords PDF
    this.content.str(
      `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg\n` +
        `${fmt(xPt)} ${fmt(y)} ${fmt(wPt)} ${fmt(hPt)} re f\n`,
    );
  }

  /** Segmento de reta (bordas, sublinhado, divisores). Coords y a partir do topo. */
  line(
    x0: number, y0Top: number, x1: number, y1Top: number,
    color: PdfColor, widthPt: number, dash?: readonly number[],
  ): void {
    const d = dash && dash.length ? `[${dash.map(fmt).join(' ')}] 0 d\n` : '[] 0 d\n';
    this.content.str(
      `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} RG\n` +
        `${fmt(widthPt)} w\n${d}` +
        `${fmt(x0)} ${fmt(this.fromTop(y0Top))} m ${fmt(x1)} ${fmt(this.fromTop(y1Top))} l S\n`,
    );
  }

  /**
   * Desenha glifos já posicionados, todos na mesma fonte/tamanho/cor. Cada glifo
   * recebe sua própria matriz de texto (posição absoluta), reproduzindo
   * exatamente as posições calculadas pelo layout (inclusive o snap de 1/600").
   */
  glyphs(
    font: EmbeddedFont, sizePt: number, color: PdfColor, glyphs: PlacedGlyph[],
    opts: { scaleX?: number; synthBold?: boolean; synthItalic?: boolean; runs?: boolean } = {},
  ): void {
    if (!glyphs.length) return;
    const c = this.content;
    const col = `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])}`;
    c.str(`BT\n/${font.resourceName} ${fmt(sizePt)} Tf\n${col} rg\n`);
    // negrito sintético: preenche + contorna (modo 2) com traço proporcional ao corpo
    if (opts.synthBold) c.str(`${col} RG ${fmt(sizePt / 35)} w 2 Tr\n`);
    const a = fmt(opts.scaleX ?? 1);
    const skew = opts.synthItalic ? '0.21' : '0';
    if (opts.runs) {
      // corridas como no PDF do Word: UMA matriz (Tm) no 1º glifo de cada trecho de mesma
      // baseline e x crescente, e um TJ com ajustes INTEIROS (milésimos do corpo) que levam
      // cada glifo à posição do layout. Cada ajuste parte da posição real da caneta
      // (larguras do /W + ajustes já gravados): o arredondamento não se acumula
      const sx = opts.scaleX ?? 1;
      let i = 0;
      while (i < glyphs.length) {
        const g0 = glyphs[i]!;
        let j = i + 1;
        while (j < glyphs.length && glyphs[j]!.baselineFromTopPt === g0.baselineFromTopPt && glyphs[j]!.xPt >= glyphs[j - 1]!.xPt) j++;
        let s = `${a} 0 ${skew} 1 ${fmt(g0.xPt)} ${fmt(this.fromTop(g0.baselineFromTopPt))} Tm [`;
        /** caneta: deslocamento (pt, espaço de texto) desde o 1º glifo da corrida */
        let pen = 0;
        for (let k = i; k < j; k++) {
          const g = glyphs[k]!;
          if (k > i) {
            const n = Math.round(((pen - (g.xPt - g0.xPt) / sx) * 1000) / sizePt);
            if (n !== 0) { s += `${n}`; pen -= (n * sizePt) / 1000; }
          }
          s += `<${g.gid.toString(16).padStart(4, '0')}>`;
          pen += (font.widthThousandths(g.gid) * sizePt) / 1000;
        }
        c.str(`${s}] TJ\n`);
        i = j;
      }
    } else for (const g of glyphs) {
      const y = this.fromTop(g.baselineFromTopPt);
      c.str(`${a} 0 ${skew} 1 ${fmt(g.xPt)} ${fmt(y)} Tm <${g.gid.toString(16).padStart(4, '0')}> Tj\n`);
    }
    if (opts.synthBold) c.str('0 Tr\n');
    c.str('ET\n');
  }

  /** Caminho preenchido e/ou contornado. */
  path(
    cmds: readonly PathCmd[], fill?: PdfColor,
    stroke?: { color: PdfColor; widthPt: number; dash?: readonly number[] },
    /** preenchimento par-ímpar (furos de a:custGeom) */
    evenOdd = false,
  ): void {
    if (!cmds.length || (!fill && !stroke)) return;
    let s = '';
    if (fill) s += `${fmt(fill[0])} ${fmt(fill[1])} ${fmt(fill[2])} rg\n`;
    if (stroke) {
      s += `${fmt(stroke.color[0])} ${fmt(stroke.color[1])} ${fmt(stroke.color[2])} RG ${fmt(stroke.widthPt)} w `;
      s += stroke.dash && stroke.dash.length ? `[${stroke.dash.map(fmt).join(' ')}] 0 d\n` : '[] 0 d\n';
    }
    for (const cmd of cmds) {
      if (cmd.op === 'M') s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} m\n`;
      else if (cmd.op === 'L') s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} l\n`;
      else if (cmd.op === 'C') {
        s += `${fmt(cmd.x1)} ${fmt(this.fromTop(cmd.y1))} ${fmt(cmd.x2)} ${fmt(this.fromTop(cmd.y2))} ${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} c\n`;
      } else s += 'h\n';
    }
    s += fill && stroke ? (evenOdd ? 'B*\n' : 'B\n') : fill ? (evenOdd ? 'f*\n' : 'f\n') : 'S\n';
    this.content.str(s);
  }

  /** Preenche o caminho com um degradê (recorta pelo caminho e pinta com `sh`). */
  fillShaded(cmds: readonly PathCmd[], sh: PdfShading, evenOdd = false): void {
    if (!cmds.length) return;
    let s = 'q\n';
    for (const cmd of cmds) {
      if (cmd.op === 'M') s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} m\n`;
      else if (cmd.op === 'L') s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} l\n`;
      else if (cmd.op === 'C') s += `${fmt(cmd.x1)} ${fmt(this.fromTop(cmd.y1))} ${fmt(cmd.x2)} ${fmt(this.fromTop(cmd.y2))} ${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} c\n`;
      else s += 'h\n';
    }
    s += `${evenOdd ? 'W*' : 'W'} n\n/${sh.resourceName} sh\nQ\n`;
    this.content.str(s);
  }

  /** Empilha um recorte retangular (até popClip). */
  pushClipRect(xPt: number, yTopPt: number, wPt: number, hPt: number): void {
    this.content.str(`q\n${fmt(xPt)} ${fmt(this.fromTop(yTopPt + hPt))} ${fmt(wPt)} ${fmt(hPt)} re W n\n`);
  }

  popClip(): void {
    this.content.str('Q\n');
  }

  /** Empilha um recorte por caminho (até popClip); `evenOdd` = regra par-ímpar. */
  pushClipPath(cmds: readonly PathCmd[], evenOdd = false): void {
    let s = 'q\n';
    for (const cmd of cmds) {
      if (cmd.op === 'M') s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} m\n`;
      else if (cmd.op === 'L') s += `${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} l\n`;
      else if (cmd.op === 'C') s += `${fmt(cmd.x1)} ${fmt(this.fromTop(cmd.y1))} ${fmt(cmd.x2)} ${fmt(this.fromTop(cmd.y2))} ${fmt(cmd.x)} ${fmt(this.fromTop(cmd.y))} c\n`;
      else s += 'h\n';
    }
    this.content.str(`${s}${evenOdd ? 'W*' : 'W'} n\n`);
  }

  /** Imagem pela matriz (a b c d e f) que leva o quadrado unitário à página (y a
   *  partir do TOPO; (0,0) = canto de cima à esquerda da imagem). */
  drawImageMatrix(img: PdfImage, a: number, b: number, c: number, d: number, e: number, f: number): void {
    const H = this.heightPt;
    this.content.str(`q\n${fmt(a)} ${fmt(-b)} ${fmt(-c)} ${fmt(d)} ${fmt(c + e)} ${fmt(H - d - f)} cm\n/${img.resourceName} Do\nQ\n`);
  }

  /** Empilha uma transformação afim (matriz cm, em pt) até popClip(). */
  pushTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.content.str(`q\n${fmt(a)} ${fmt(b)} ${fmt(c)} ${fmt(d)} ${fmt(e)} ${fmt(f)} cm\n`);
  }

  /** Imagem com rotação (graus, horário, em torno do centro) e espelhamento. */
  drawImageTransformed(
    img: PdfImage, xPt: number, yTopPt: number, wPt: number, hPt: number,
    rotDeg = 0, flipH = false, flipV = false,
  ): void {
    const cx = xPt + wPt / 2;
    const cy = this.fromTop(yTopPt + hPt / 2);
    const r = (-rotDeg * Math.PI) / 180;
    const cos = Math.cos(r), sin = Math.sin(r);
    const sx = flipH ? -wPt : wPt, sy = flipV ? -hPt : hPt;
    // M = T(centro) · R · S · T(-½,-½)
    const a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy;
    const e = cx - (a + c) / 2, f = cy - (b + d) / 2;
    this.content.str(`q\n${fmt(a)} ${fmt(b)} ${fmt(c)} ${fmt(d)} ${fmt(e)} ${fmt(f)} cm\n/${img.resourceName} Do\nQ\n`);
  }

  /** Desenha uma imagem já embutida. (x,y) = canto superior esquerdo. */
  drawImage(img: PdfImage, xPt: number, yTopPt: number, wPt: number, hPt: number): void {
    const y = this.fromTop(yTopPt + hPt);
    this.content.str(
      `q\n${fmt(wPt)} 0 0 ${fmt(hPt)} ${fmt(xPt)} ${fmt(y)} cm\n/${img.resourceName} Do\nQ\n`,
    );
  }
}

/** Documento PDF: fontes/imagens compartilhadas + páginas, montado em build(). */
export class PdfDocument {
  private writer: PdfWriter;
  private fonts: EmbeddedFont[] = [];
  private images: { handle: PdfImage; objNum: number }[] = [];
  private pages: PdfPage[] = [];
  private shadings: PdfShading[] = [];
  /** ExtGState de opacidade: chave "ca|CA" → nome do recurso */
  private alphaStates = new Map<string, string>();
  private outline: PdfOutlineItem[] = [];

  /** Marcador do painel de navegação, na ordem do documento (níveis 1, 2…). */
  addOutline(item: PdfOutlineItem): void {
    if (!item.title.trim()) return;
    this.outline.push({ ...item, level: Math.max(1, item.level) });
  }

  constructor(opts: { compress?: boolean } = {}) {
    this.writer = new PdfWriter({ compress: opts.compress });
  }

  /** Embute uma fonte TrueType (bytes crus + consultas de métrica). */
  embedFont(name: string, bytes: Uint8Array, program: FontProgram): EmbeddedFont {
    const f = new EmbeddedFont(this.fonts.length, name, bytes, program);
    this.fonts.push(f);
    return f;
  }

  /** Embute um JPEG (baseline) diretamente via DCTDecode. */
  embedJpeg(bytes: Uint8Array, widthPx: number, heightPx: number, components = 3, adobeInverted = false, decodeArr?: readonly number[],
    /** máscara suave (alfa de 8 bits, em qualquer resolução: cobre a imagem inteira) */
    smask?: { alpha: Uint8Array; width: number; height: number }): PdfImage {
    const cs = components === 1 ? '/DeviceGray' : components === 4 ? '/DeviceCMYK' : '/DeviceRGB';
    // decodeArr: reta por componente (brilho/contraste sem decodificar o JPEG)
    const decode = components === 4 && adobeInverted ? ' /Decode [1 0 1 0 1 0 1 0]'
      : decodeArr?.length ? ` /Decode [${decodeArr.map(fmt).join(' ')}]` : '';
    const sm = smask
      ? ` /SMask ${this.writer.addStream(`/Type /XObject /Subtype /Image /Width ${smask.width} /Height ${smask.height} /ColorSpace /DeviceGray /BitsPerComponent 8`, smask.alpha)} 0 R`
      : '';
    const objNum = this.writer.addStream(
      `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} ` +
        `/ColorSpace ${cs} /BitsPerComponent 8 /Filter /DCTDecode${decode}${sm}`,
      bytes,
      { allowCompress: false }, // já comprimido
    );
    const handle: PdfImage = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }

  /**
   * Embute pixels RGBA crus via DeviceRGB + FlateDecode. Quando o alpha não é
   * trivial (algum pixel < 255), o canal vira um /SMask DeviceGray — PNGs com
   * transparência preservam o recorte no PDF.
   */
  embedRgba(rgba: Uint8Array, widthPx: number, heightPx: number): PdfImage {
    const rgb = new Uint8Array(widthPx * heightPx * 3);
    const alpha = new Uint8Array(widthPx * heightPx);
    let hasAlpha = false;
    for (let i = 0, j = 0, k = 0; i < rgba.length; i += 4, j += 3, k++) {
      rgb[j] = rgba[i]!;
      rgb[j + 1] = rgba[i + 1]!;
      rgb[j + 2] = rgba[i + 2]!;
      const a = rgba[i + 3]!;
      alpha[k] = a;
      if (a !== 255) hasAlpha = true;
    }
    let smask = '';
    if (hasAlpha) {
      const smaskNum = this.writer.addStream(
        `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} ` +
          `/ColorSpace /DeviceGray /BitsPerComponent 8`,
        alpha,
      );
      smask = ` /SMask ${smaskNum} 0 R`;
    }
    const objNum = this.writer.addStream(
      `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8${smask}`,
      rgb,
    );
    const handle: PdfImage = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }

  /**
   * Degradê axial (ShadingType 2, do ponto 0 ao 1) ou radial (ShadingType 3,
   * círculos concêntricos de centro (x0,y0), raio 0 → r) com cores amostradas
   * (função tipo 0: n amostras RGB de 8 bits, como o Word grava). Coordenadas em
   * pt com y a partir do TOPO; estende as cores das pontas.
   */
  addShading(
    geom: { kind: 'axial'; x0: number; y0: number; x1: number; y1: number } | { kind: 'radial'; x0: number; y0: number; r: number },
    samples: Uint8Array, pageHeightPt: number,
  ): PdfShading {
    const n = Math.max(2, Math.floor(samples.length / 3));
    const fn = this.writer.addStream(
      `/FunctionType 0 /Domain [0 1] /Range [0 1 0 1 0 1] /Size [${n}] /BitsPerSample 8 /Order 1 /Encode [0 ${n - 1}]`,
      samples.subarray(0, n * 3),
    );
    const H = pageHeightPt;
    const coords = geom.kind === 'axial'
      ? `/ShadingType 2 /Coords [${fmt(geom.x0)} ${fmt(H - geom.y0)} ${fmt(geom.x1)} ${fmt(H - geom.y1)}]`
      : `/ShadingType 3 /Coords [${fmt(geom.x0)} ${fmt(H - geom.y0)} 0 ${fmt(geom.x0)} ${fmt(H - geom.y0)} ${fmt(geom.r)}]`;
    const objNum = this.writer.addDict(`<< /ColorSpace /DeviceRGB ${coords} /Extend [true true] /Function ${fn} 0 R >>`);
    const handle: PdfShading = { resourceName: `Sh${this.shadings.length}`, objNum };
    this.shadings.push(handle);
    return handle;
  }

  addPage(widthPt: number, heightPt: number): PdfPage {
    const p = new PdfPage(widthPt, heightPt, (ca, CA) => {
      const key = `${fmt(ca)}|${fmt(CA)}`;
      let name = this.alphaStates.get(key);
      if (!name) { name = `GS${this.alphaStates.size}`; this.alphaStates.set(key, name); }
      return name;
    });
    this.pages.push(p);
    return p;
  }

  /** Serializa o PDF completo. */
  build(): Uint8Array {
    const w = this.writer;
    // fontes
    const fontRefs = this.fonts.map((f) => ({ name: f.resourceName, ref: f.write(w) }));
    const fontDict = fontRefs.length
      ? `/Font << ${fontRefs.map((f) => `/${f.name} ${f.ref} 0 R`).join(' ')} >>`
      : '';
    const xobjDict = this.images.length
      ? `/XObject << ${this.images.map((i) => `/${i.handle.resourceName} ${i.objNum} 0 R`).join(' ')} >>`
      : '';
    const gsDict = this.alphaStates.size
      ? `/ExtGState << ${[...this.alphaStates].map(([k, n]) => {
        const [ca, CA] = k.split('|');
        return `/${n} << /Type /ExtGState /ca ${ca} /CA ${CA} >>`;
      }).join(' ')} >>`
      : '';
    const shDict = this.shadings.length
      ? `/Shading << ${this.shadings.map((h) => `/${h.resourceName} ${h.objNum} 0 R`).join(' ')} >>`
      : '';
    const resources = gsDict || shDict ? `<< ${fontDict} ${xobjDict} ${gsDict} ${shDict} >>` : `<< ${fontDict} ${xobjDict} >>`;

    const catalog = w.alloc();
    const pagesNode = w.alloc();

    // páginas alocadas antes: links internos e marcadores apontam para qualquer uma
    const pageRefs = this.pages.map(() => w.alloc());
    const dest = (pageIndex: number, topPt: number): string => {
      const pi = Math.min(Math.max(0, pageIndex), pageRefs.length - 1);
      return `[${pageRefs[pi]} 0 R /XYZ 0 ${fmt(this.pages[pi]!.heightPt - topPt)} null]`;
    };
    this.pages.forEach((page, i) => {
      const contentNum = w.addStream('', page.content.toUint8Array());
      const annots = page.links.map((l) => {
        const rect = `[${fmt(l.xPt)} ${fmt(page.heightPt - l.yTopPt - l.hPt)} ${fmt(l.xPt + l.wPt)} ${fmt(page.heightPt - l.yTopPt)}]`;
        const uri = safePdfUri(l.uri);
        const action = uri !== null ? `/A << /S /URI /URI (${uri}) >>` : `/Dest ${dest(l.pageIndex ?? 0, l.destTopPt ?? 0)}`;
        return w.addDict(`<< /Type /Annot /Subtype /Link /Rect ${rect} /Border [0 0 0] ${action} >>`);
      });
      const annotsEntry = annots.length ? ` /Annots [${annots.map((a) => `${a} 0 R`).join(' ')}]` : '';
      w.define(
        pageRefs[i]!,
        `<< /Type /Page /Parent ${pagesNode} 0 R ` +
          `/MediaBox [0 0 ${fmt(page.widthPt)} ${fmt(page.heightPt)}] ` +
          `/Resources ${resources} /Contents ${contentNum} 0 R${annotsEntry} >>`,
      );
    });

    w.define(
      pagesNode,
      `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((r) => `${r} 0 R`).join(' ')}] >>`,
    );
    const outlines = this.outline.length && pageRefs.length ? this.writeOutline(w, dest) : null;
    w.define(catalog, outlines !== null
      ? `<< /Type /Catalog /Pages ${pagesNode} 0 R /Outlines ${outlines} 0 R >>`
      : `<< /Type /Catalog /Pages ${pagesNode} 0 R >>`);
    return w.build(catalog);
  }

  /** Árvore de marcadores a partir da lista plana com níveis (porta de PdfDocument.WriteOutline do .NET). */
  private writeOutline(w: PdfWriter, dest: (pageIndex: number, topPt: number) => string): number {
    const root = w.alloc();
    const items = this.outline;
    const nums = items.map(() => w.alloc());
    const parent: number[] = [];
    const children = new Map<number, number[]>([[-1, []]]);
    const stack: number[] = [];
    items.forEach((it, i) => {
      while (stack.length && items[stack[stack.length - 1]!]!.level >= it.level) stack.pop();
      parent[i] = stack.length ? stack[stack.length - 1]! : -1;
      children.get(parent[i]!)!.push(i);
      children.set(i, []);
      stack.push(i);
    });
    const descendants = (i: number): number => children.get(i)!.reduce((n, c) => n + 1 + descendants(c), 0);
    const ref = (i: number): string => (i < 0 ? `${root} 0 R` : `${nums[i]} 0 R`);
    items.forEach((it, i) => {
      const sib = children.get(parent[i]!)!;
      const k = sib.indexOf(i);
      const kids = children.get(i)!;
      let d = `<< /Title <FEFF${utf16beHex(it.title).toUpperCase()}> /Parent ${ref(parent[i]!)}`;
      if (k > 0) d += ` /Prev ${ref(sib[k - 1]!)}`;
      if (k < sib.length - 1) d += ` /Next ${ref(sib[k + 1]!)}`;
      if (kids.length) d += ` /First ${ref(kids[0]!)} /Last ${ref(kids[kids.length - 1]!)} /Count -${descendants(i)}`;
      w.define(nums[i]!, `${d} /Dest ${dest(it.pageIndex, it.topPt)} >>`);
    });
    const top = children.get(-1)!;
    w.define(root, `<< /Type /Outlines /First ${ref(top[0]!)} /Last ${ref(top[top.length - 1]!)} /Count ${items.length} >>`);
    return root;
  }
}
